#!/usr/bin/env python3
"""
build_comments_json.py
────────────────────────────────────────────────────────
Read all_reviews.json (output of the batch scraper) and
produce one consolidated JSON where every professor has
only their list of comment strings.

Result structure
----------------
[
  {
    "prof_id":   "1043",
    "prof_name": "Christopher Kane",
    "comments": [
        "I took his class during COVID. …",
        "Records all lectures; gives many examples …",
        …
    ]
  },
  {
    "prof_id":   "1044",
    "prof_name": "Jalaa Hoblos",
    "comments": [ … ]
  },
  …
]
"""

import json, collections, pathlib, sys

SRC  = pathlib.Path("all_reviews.json")       # master reviews file
DEST = pathlib.Path("all_prof_comments.json") # output file

if not SRC.exists():
    sys.exit("❌  all_reviews.json not found – run from the same folder.")

reviews = json.loads(SRC.read_text(encoding="utf-8"))

# bucket comments by (prof_id, prof_name)
buckets = collections.defaultdict(list)
for r in reviews:
    buckets[(r["prof_id"], r["prof_name"])].append(r.get("Comment", "").strip())

# build the final list
out = []
for (pid, pname), comments in buckets.items():
    # drop any empty comments that might slip in
    comments = [c for c in comments if c]
    out.append({
        "prof_id":   pid,
        "prof_name": pname,
        "comments":  comments
    })

# sort by prof_id to keep things stable
out.sort(key=lambda x: int(x["prof_id"]))

DEST.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"✅  Wrote {len(out):,} professors → {DEST}")
