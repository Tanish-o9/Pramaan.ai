"""
Vector Search Service for Pramaan (pgvector 1:N Fast Vector Search).
Provides high-performance vector matching using PostgreSQL HNSW indexes with
subject enrollment scoping, margin ambiguity checks, and automatic in-memory fallback.
"""

import logging
import numpy as np
from typing import List, Dict, Any, Optional
from src.database.config import supabase
from src.core.config import settings
from src.database.db import get_enrolled

logger = logging.getLogger(__name__)

class VectorSearchService:
    """
    Handles 1:N nearest-neighbor biometric searches via pgvector (HNSW)
    and in-memory numpy fallback with subject scoping and margin ambiguity gating.
    """

    def __init__(self):
        self.enabled = getattr(settings, "ENABLE_PGVECTOR", True)
        self.face_threshold = getattr(settings, "PGVECTOR_FACE_THRESHOLD", 0.60)
        self.voice_threshold = getattr(settings, "PGVECTOR_VOICE_THRESHOLD", 0.30)
        self.min_margin = getattr(settings, "PGVECTOR_MIN_MARGIN", 0.05)

    def save_embedding(
        self,
        student_id: int,
        modality: str,
        embedding: List[float],
        quality: float = 1.0,
        source: str = "web_registration"
    ) -> Dict[str, Any]:
        """
        Stores an embedding into student_embeddings table.
        Modality can be 'face' (128-d) or 'voice' (256-d).
        """
        if modality not in ("face", "voice"):
            raise ValueError(f"Invalid modality: {modality}. Must be 'face' or 'voice'.")

        record = {
            "student_id": student_id,
            "modality": modality,
            "quality": quality,
            "source": source
        }

        if modality == "face":
            if len(embedding) != 128:
                raise ValueError(f"Expected 128-d face embedding, got {len(embedding)}")
            record["embedding"] = embedding
        else:
            if len(embedding) != 256:
                raise ValueError(f"Expected 256-d voice embedding, got {len(embedding)}")
            record["voice_embedding"] = embedding

        try:
            res = supabase.table("student_embeddings").insert(record).execute()
            if res.data:
                return res.data[0]
        except Exception as e:
            logger.warning(f"pgvector student_embeddings insert failed ({e}), falling back to students table.")
            # Fallback to students table legacy columns
            if modality == "face":
                supabase.table("students").update({"face_embedding": embedding}).eq("student_id", student_id).execute()
            else:
                supabase.table("students").update({"voice_embedding": embedding}).eq("student_id", student_id).execute()

        return record

    def search_face(
        self,
        query_embedding: List[float],
        subject_id: Optional[int] = None,
        threshold: Optional[float] = None,
        min_margin: Optional[float] = None,
        top_k: int = 5
    ) -> Optional[Dict[str, Any]]:
        """
        1:N search for a 128-d face vector against enrolled students.
        Evaluates Euclidean distance (L2) and ensures margin check passes.
        """
        t = threshold if threshold is not None else self.face_threshold
        m = min_margin if min_margin is not None else self.min_margin

        # Attempt pgvector SQL RPC if enabled
        if self.enabled:
            try:
                params = {
                    "query_embedding": query_embedding,
                    "match_threshold": float(t),
                    "match_count": int(top_k),
                    "filter_subject_id": subject_id
                }
                res = supabase.rpc("match_face_embeddings", params).execute()
                candidates = res.data or []
                if candidates:
                    return self._evaluate_candidates(candidates, t, m, modality="face")
            except Exception as e:
                logger.debug(f"pgvector match_face_embeddings RPC not available ({e}); using fallback.")

        # Fallback to subject-scoped in-memory Euclidean search
        return self._search_face_fallback(query_embedding, subject_id, t, m)

    def search_voice(
        self,
        query_embedding: List[float],
        subject_id: Optional[int] = None,
        threshold: Optional[float] = None,
        min_margin: Optional[float] = None,
        top_k: int = 5
    ) -> Optional[Dict[str, Any]]:
        """
        1:N search for a 256-d voice vector using Cosine distance.
        """
        t = threshold if threshold is not None else self.voice_threshold
        m = min_margin if min_margin is not None else self.min_margin

        if self.enabled:
            try:
                params = {
                    "query_embedding": query_embedding,
                    "match_threshold": float(t),
                    "match_count": int(top_k),
                    "filter_subject_id": subject_id
                }
                res = supabase.rpc("match_voice_embeddings", params).execute()
                candidates = res.data or []
                if candidates:
                    return self._evaluate_candidates(candidates, t, m, modality="voice")
            except Exception as e:
                logger.debug(f"pgvector match_voice_embeddings RPC not available ({e}); using fallback.")

        return self._search_voice_fallback(query_embedding, subject_id, t, m)

    def _evaluate_candidates(
        self,
        candidates: List[Dict[str, Any]],
        threshold: float,
        min_margin: float,
        modality: str
    ) -> Optional[Dict[str, Any]]:
        """
        Applies top candidate selection, distance threshold cutoff, and margin check.
        Margin check prevents ambiguous false matches when top 2 students are too close in vector space.
        """
        if not candidates:
            return None

        # Sort by distance ascending
        candidates.sort(key=lambda c: c.get("distance", 999.0))
        best = candidates[0]
        best_dist = float(best.get("distance", 999.0))

        if best_dist > threshold:
            return None

        # Margin ambiguity check
        is_ambiguous = False
        margin = 1.0
        if len(candidates) >= 2:
            second_best = candidates[1]
            # Only apply margin check if the second best match is a different student
            if second_best.get("student_id") != best.get("student_id"):
                margin = float(second_best.get("distance", 999.0)) - best_dist
                if margin < min_margin:
                    is_ambiguous = True
                    logger.warning(
                        f"Biometric ambiguity: Student {best['student_id']} (dist: {best_dist:.3f}) and "
                        f"Student {second_best['student_id']} (dist: {second_best['distance']:.3f}) "
                        f"have margin {margin:.3f} < {min_margin:.3f}. Rejecting match."
                    )
                    return {
                        "matched": False,
                        "student_id": best.get("student_id"),
                        "distance": best_dist,
                        "margin": round(margin, 4),
                        "is_ambiguous": True,
                        "reason": f"Ambiguous match with student {second_best.get('student_id')} (margin: {margin:.3f})"
                    }

        conf_span = threshold + 0.20
        confidence = max(0.0, min(100.0, round((1.0 - (best_dist / conf_span)) * 100.0, 1)))

        return {
            "matched": True,
            "student_id": int(best.get("student_id")),
            "distance": round(best_dist, 4),
            "margin": round(margin, 4),
            "confidence": confidence,
            "quality": best.get("quality", 1.0),
            "source": best.get("source", "pgvector"),
            "is_ambiguous": False
        }

    def _search_face_fallback(
        self,
        query_embedding: List[float],
        subject_id: Optional[int],
        threshold: float,
        min_margin: float
    ) -> Optional[Dict[str, Any]]:
        """
        Subject-scoped in-memory Euclidean search over enrolled students.
        """
        candidates = []
        q = np.array(query_embedding, dtype=np.float32)

        # 1. First try student_embeddings table
        try:
            query = supabase.table("student_embeddings").select("*").eq("modality", "face")
            if subject_id:
                enrolled_students = get_enrolled(subject_id)
                enrolled_ids = [s["student_id"] for s in enrolled_students]
                if enrolled_ids:
                    query = query.in_("student_id", enrolled_ids)
                else:
                    return None
            res = query.execute()
            rows = res.data or []
            for r in rows:
                emb = r.get("embedding")
                if emb:
                    dist = float(np.linalg.norm(np.array(emb, dtype=np.float32) - q))
                    candidates.append({
                        "student_id": r["student_id"],
                        "distance": dist,
                        "quality": r.get("quality", 1.0),
                        "source": r.get("source", "in_memory_embeddings_table")
                    })
        except Exception:
            pass

        # 2. Fallback to students table face_embedding column
        if not candidates:
            if subject_id:
                students = get_enrolled(subject_id)
            else:
                s_res = supabase.table("students").select("*").execute()
                students = s_res.data or []

            for s in students:
                emb = s.get("face_embedding")
                if emb:
                    dist = float(np.linalg.norm(np.array(emb, dtype=np.float32) - q))
                    candidates.append({
                        "student_id": s["student_id"],
                        "distance": dist,
                        "quality": 1.0,
                        "source": "in_memory_legacy"
                    })

        return self._evaluate_candidates(candidates, threshold, min_margin, modality="face")

    def _search_voice_fallback(
        self,
        query_embedding: List[float],
        subject_id: Optional[int],
        threshold: float,
        min_margin: float
    ) -> Optional[Dict[str, Any]]:
        """
        Subject-scoped in-memory Cosine distance search over enrolled students.
        Cosine distance = 1 - cosine_similarity.
        """
        candidates = []
        q = np.array(query_embedding, dtype=np.float32)
        norm_q = np.linalg.norm(q)
        if norm_q == 0:
            return None

        if subject_id:
            students = get_enrolled(subject_id)
        else:
            s_res = supabase.table("students").select("*").execute()
            students = s_res.data or []

        for s in students:
            emb = s.get("voice_embedding")
            if emb:
                vec = np.array(emb, dtype=np.float32)
                norm_vec = np.linalg.norm(vec)
                if norm_vec > 0:
                    cos_sim = float(np.dot(q, vec) / (norm_q * norm_vec))
                    cos_dist = max(0.0, 1.0 - cos_sim)
                    candidates.append({
                        "student_id": s["student_id"],
                        "distance": cos_dist,
                        "quality": 1.0,
                        "source": "in_memory_voice"
                    })

        return self._evaluate_candidates(candidates, threshold, min_margin, modality="voice")


# Global singleton
vector_service = VectorSearchService()

