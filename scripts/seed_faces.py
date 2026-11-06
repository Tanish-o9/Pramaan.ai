import os
import sys
import glob
from pathlib import Path
from PIL import Image
import numpy as np

# Ensure root dir is in sys.path
ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

from src.database.config import supabase
from src.database.db import get_all_student, create_student, update_student_biometrics
from src.pipeline.face_pipeline import get_face_embeddings

def seed_faces(seed_dir=None):
    if seed_dir is None:
        seed_dir = ROOT_DIR / "seed_faces"
    else:
        seed_dir = Path(seed_dir)

    if not seed_dir.exists():
        seed_dir.mkdir(parents=True, exist_ok=True)
        print(f"Created seed directory at: {seed_dir}")
        print("Please place <roll_number>.jpg images inside and re-run.")
        return

    patterns = ["*.jpg", "*.jpeg", "*.png", "*.webp"]
    image_files = []
    for pat in patterns:
        image_files.extend(seed_dir.glob(pat))

    if not image_files:
        print(f"No image files found in {seed_dir}.")
        print("Expected naming format: <roll_number>.jpg (e.g. 22CS042.jpg)")
        return

    print(f"Found {len(image_files)} image(s) to process in {seed_dir}...\n")
    success_count = 0

    for img_path in sorted(image_files):
        roll_no = img_path.stem.strip().upper()
        print(f"Processing Roll No: {roll_no} ({img_path.name})...")

        try:
            with Image.open(img_path) as img:
                rgb_img = np.array(img.convert("RGB"))

            embs = get_face_embeddings(rgb_img)
            if not embs:
                print(f"  ❌ No face detected in {img_path.name}. Skipping.")
                continue

            emb_list = embs[0].tolist() if hasattr(embs[0], "tolist") else embs[0]

            # Check if student already exists in Supabase
            res = supabase.table("students").select("*").eq("roll_number", roll_no).execute()
            if res.data:
                student = res.data[0]
                update_student_biometrics(student["student_id"], face_embedding=emb_list)
                print(f"  ✅ Updated existing student: {student.get('name')} (ID: {student['student_id']})")
            else:
                default_name = f"Student {roll_no}"
                new_s = create_student(default_name, roll_no, face_embedding=emb_list, pin="1234")
                print(f"  ✅ Created new student record: {default_name}")

            success_count += 1
        except Exception as e:
            print(f"  ❌ Error processing {img_path.name}: {e}")

    print(f"\nSeeding complete! Successfully seeded {success_count}/{len(image_files)} student face profile(s).")

if __name__ == "__main__":
    custom_dir = sys.argv[1] if len(sys.argv) > 1 else None
    seed_faces(custom_dir)

