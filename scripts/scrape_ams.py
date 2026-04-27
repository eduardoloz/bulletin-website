#!/usr/bin/env python3
"""
scripts/scrape_ams.py — backfill AMS courses into src/data/courses/all.json.

The main scraper.py paginated listing skipped AMS entirely. This driver hits
the catalog's search endpoint with the keyword "AMS", collects preview_course
links, parses each via scraper.parse_course_page, dedupes against existing
courses (by stable id == course code), and appends the new ones to all.json.

After this runs, do:
  npx tsx src/data/courses/parsePrereqs.ts AMS
to populate src/data/courses/normalized_coursework/ams.json.
"""

from __future__ import annotations

import json
import re
import sys
import time
from pathlib import Path
from urllib.parse import urljoin

# Reuse scraper.py helpers
SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))
import scraper  # type: ignore

from bs4 import BeautifulSoup

SEARCH_URL = (
    "https://catalog.stonybrook.edu/search_advanced.php?"
    "cur_cat_oid=8&search_database=Search&search_db=Search&"
    "cpage={page}&ecpage=1&ppage=1&spage=1&tpage=1&location=33&"
    "filter%5Bkeyword%5D=AMS&filter%5Bexact_match%5D=1"
)
BASE = "https://catalog.stonybrook.edu/"


def collect_ams_links(max_pages: int = 5) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for page in range(1, max_pages + 1):
        url = SEARCH_URL.format(page=page)
        print(f"[*] Fetching AMS search page {page}: {url}")
        html = scraper.fetch(url)
        soup = BeautifulSoup(html, "html.parser")

        page_links: list[str] = []
        for a in soup.select('a[href*="preview_course"]'):
            href_val = a.get("href")
            if not href_val:
                continue
            href = str(href_val[0]) if isinstance(href_val, list) else str(href_val)
            href = href.strip()
            if not href:
                continue
            text = a.get_text(" ", strip=True)
            # only AMS-coded links
            if not re.match(r"^AMS\s*\d{2,3}", text):
                continue
            full = urljoin(BASE, href)
            if full in seen:
                continue
            seen.add(full)
            page_links.append(full)

        print(f"  found {len(page_links)} AMS links on page {page}")
        if not page_links:
            break
        out.extend(page_links)
        time.sleep(scraper.REQUEST_DELAY_SEC)
    return out


def main() -> None:
    project_root = scraper.find_project_root(SCRIPT_DIR)
    if not project_root:
        raise SystemExit("Could not locate project root from " + str(SCRIPT_DIR))
    all_json = project_root / "src" / "data" / "courses" / "all.json"
    if not all_json.exists():
        raise SystemExit(f"Missing {all_json}; run scraper.py --full first.")

    courses: list[dict] = json.loads(all_json.read_text(encoding="utf-8"))
    print(f"[*] Loaded {len(courses)} existing courses from {all_json}")

    existing_ids = {c.get("id") for c in courses}

    print("[*] Building dept name map (from listing page 1)...")
    dept_map = scraper.scrape_dept_name_map()
    if "AMS" not in dept_map:
        dept_map["AMS"] = "Applied Mathematics and Statistics"

    links = collect_ams_links(max_pages=5)
    print(f"[*] Total AMS preview links: {len(links)}")

    added: list[dict] = []
    for i, link in enumerate(links, 1):
        print(f"  - ({i}/{len(links)}) {link}")
        try:
            course = scraper.parse_course_page(link, dept_map)
        except Exception as e:
            print(f"    [!] FAILED: {e}")
            continue
        if not course:
            continue
        if course.get("deptCode") != "AMS":
            print(f"    [skip] not AMS: {course.get('code')}")
            continue
        if course["id"] in existing_ids:
            print(f"    [skip] already in all.json: {course['code']}")
            continue
        added.append(course)
        existing_ids.add(course["id"])
        time.sleep(scraper.REQUEST_DELAY_SEC)

    if not added:
        print("[*] No new AMS courses to add.")
        return

    courses.extend(added)
    # rebuild prereq trees globally so cross-dept references resolve
    code_to_id = {c["code"]: c["id"] for c in courses}
    for c in added:
        c["prerequisites"] = scraper.build_reqnode(c, code_to_id)

    all_json.write_text(
        json.dumps(courses, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    print(f"[+] Appended {len(added)} AMS courses; total now {len(courses)}.")
    print(f"[+] Wrote {all_json}")
    print("[*] Next: npx tsx src/data/courses/parsePrereqs.ts AMS")


if __name__ == "__main__":
    main()
