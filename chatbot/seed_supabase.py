"""
One-time script: reads your existing JSON files and uploads them to Supabase.
Run ONCE from the chatbot/ directory:

    python seed_supabase.py

It is safe to re-run — it uses upsert so duplicates won't error.
"""

import json
import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

client = create_client(
    os.environ["SUPABASE_URL"],
    os.environ["SUPABASE_SERVICE_KEY"],
)

# Paths relative to this script's location
BASE = os.path.dirname(__file__)
COMMENTS_PATH = os.path.join(BASE, "..", "rmp", "all_prof_comments.json")
REVIEWS_PATH  = os.path.join(BASE, "..", "rmp", "all_reviews.json")

# ── 1. Seed professors ────────────────────────────────────────────────────────
print("Loading professors...")
with open(COMMENTS_PATH) as f:
    prof_comments = json.load(f)

professors = [
    {"id": int(p["prof_id"]), "name": p["prof_name"]}
    for p in prof_comments
]

print(f"Upserting {len(professors)} professors...")
client.table("professors").upsert(professors, on_conflict="id").execute()
print("  Done.")

# ── 2. Seed reviews ───────────────────────────────────────────────────────────
print("Loading reviews...")
with open(REVIEWS_PATH) as f:
    all_reviews = json.load(f)

reviews = []
for r in all_reviews:
    reviews.append({
        "prof_id":    int(r["prof_id"]),
        "prof_name":  r["prof_name"],
        "course":     r.get("Course", ""),
        "quality":    float(r.get("Quality", 0)),
        "difficulty": float(r.get("Difficulty", 0)),
        "comment":    r.get("Comment", ""),
        "tags":       r.get("Tags", ""),
        "date":       r.get("Date", ""),
        "meta":       r.get("Meta", ""),
    })

# Supabase has a row limit per request — batch in chunks of 500
BATCH = 500
print(f"Upserting {len(reviews)} reviews in batches of {BATCH}...")
for i in range(0, len(reviews), BATCH):
    chunk = reviews[i : i + BATCH]
    client.table("reviews").insert(chunk).execute()
    print(f"  Inserted rows {i} – {i + len(chunk)}")

print("Seeding complete!")
