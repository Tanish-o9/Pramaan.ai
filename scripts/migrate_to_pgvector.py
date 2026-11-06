"""
Migration Script: Migrate legacy embeddings from `students` table to `student_embeddings` (pgvector).
Run this once after executing the SQL migration in `src/database/migrations/001_pgvector_setup.sql`.
"""

import sys
import os

# Ensure parent directory is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.database.config import supabase

def migrate_legacy_embeddings():
    print("🚀 Starting migration from students table to student_embeddings (pgvector)...")
    
    try:
        res = supabase.table("students").select("student_id, name, roll_number, face_embedding, voice_embedding").execute()
        students = res.data or []
    except Exception as e:
        print(f"❌ Failed to query students table: {e}")
        return

    print(f"Found {len(students)} student records to evaluate.")

    migrated_faces = 0
    migrated_voices = 0
    skipped_faces = 0
    skipped_voices = 0

    for s in students:
        sid = s["student_id"]
        face_emb = s.get("face_embedding")
        voice_emb = s.get("voice_embedding")

        # 1. Migrate Face Embedding
        if face_emb:
            if len(face_emb) == 128:
                # Check if already migrated
                try:
                    existing = supabase.table("student_embeddings").select("id").eq("student_id", sid).eq("modality", "face").execute()
                    if existing.data:
                        skipped_faces += 1
                    else:
                        supabase.table("student_embeddings").insert({
                            "student_id": sid,
                            "modality": "face",
                            "embedding": face_emb,
                            "quality": 1.0,
                            "source": "legacy_migration"
                        }).execute()
                        migrated_faces += 1
                except Exception as e:
                    print(f"⚠️ Error migrating face for student {sid}: {e}")
            else:
                print(f"⚠️ Student {sid} has invalid face embedding length {len(face_emb)} (expected 128)")

        # 2. Migrate Voice Embedding
        if voice_emb:
            if len(voice_emb) == 256:
                try:
                    existing = supabase.table("student_embeddings").select("id").eq("student_id", sid).eq("modality", "voice").execute()
                    if existing.data:
                        skipped_voices += 1
                    else:
                        supabase.table("student_embeddings").insert({
                            "student_id": sid,
                            "modality": "voice",
                            "voice_embedding": voice_emb,
                            "quality": 1.0,
                            "source": "legacy_migration"
                        }).execute()
                        migrated_voices += 1
                except Exception as e:
                    print(f"⚠️ Error migrating voice for student {sid}: {e}")
            else:
                print(f"⚠️ Student {sid} has invalid voice embedding length {len(voice_emb)} (expected 256)")

    print("\n" + "=" * 50)
    print("✨ MIGRATION SUMMARY:")
    print(f"  • Face Embeddings Migrated:  {migrated_faces} (Skipped: {skipped_faces})")
    print(f"  • Voice Embeddings Migrated: {migrated_voices} (Skipped: {skipped_voices})")
    print("=" * 50)

if __name__ == "__main__":
    migrate_legacy_embeddings()

