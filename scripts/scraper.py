#!/usr/bin/env python3
"""
scripts/scraper.py — Stony Brook course scraper

What it does:
- Scrapes course preview pages from the SBU catalog
- Writes:
  - <project-root>/src/data/courses/all.json
  - <project-root>/src/data/courses/all.csv
- Adds `deptName` to every course (so dropdown can show "CSE - Computer Science")
- Uses stable IDs: course.id == course.code (so re-scrapes don’t reshuffle IDs)

Run:
  python scripts/scraper.py                 # uses TEST_MODE_DEFAULT
  python scripts/scraper.py --test --limit 15
  python scripts/scraper.py --full
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import time
from pathlib import Path
from typing import Any, Optional
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup
from bs4.element import NavigableString, Tag

BASE = "https://catalog.stonybrook.edu"

# Defaults (used unless overridden by CLI flags)
TEST_MODE_DEFAULT = True
TEST_LIMIT_DEFAULT = 20

PAGE_URL_TEMPLATE = (
    "https://catalog.stonybrook.edu/content.php?"
    "catoid=8&navoid=484&filter%5Bitem_type%5D=3&"
    "filter%5Bonly_active%5D=1&filter%5B3%5D=1&filter%5Bcpage%5D={page}"
)

REQUEST_DELAY_SEC = 0.15
TIMEOUT_SEC = 30

# Matches "ACC - Accounting" (supports -, – , —)
DEPT_TEXT_RE = re.compile(r"^([A-Z]{2,4})\s*[-–—]\s*(.+)$")


# ----------------------------- project paths -----------------------------

def find_project_root(start: Path) -> Path:
    cur = start.resolve()
    for _ in range(12):
        if (cur / "package.json").exists() and (cur / "src").exists():
            return cur
        cur = cur.parent
    return start.resolve().parent


def output_paths(project_root: Path) -> tuple[Path, Path]:
    out_dir = project_root / "src" / "data" / "courses"
    out_dir.mkdir(parents=True, exist_ok=True)
    return (out_dir / "all.json", out_dir / "all.csv")


# ----------------------------- HTTP helpers -----------------------------

SESSION = requests.Session()
SESSION.headers.update(
    {
        "User-Agent": (
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/120.0 Safari/537.36"
        ),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Connection": "keep-alive",
        "Referer": BASE + "/",
    }
)


def fetch(url: str, *, retries: int = 2) -> str:
    last_err: Optional[Exception] = None
    for attempt in range(retries + 1):
        try:
            r = SESSION.get(url, timeout=TIMEOUT_SEC)
            if r.status_code != 200:
                snippet = (r.text or "")[:350].replace("\n", " ")
                raise RuntimeError(f"HTTP {r.status_code} for {url}\nBody starts: {snippet}")
            return r.text
        except Exception as e:
            last_err = e
            if attempt < retries:
                time.sleep(0.6 * (attempt + 1))
            else:
                raise RuntimeError(str(last_err)) from last_err
    raise RuntimeError(str(last_err))


# ----------------------------- parsing helpers -----------------------------

def clean_prerequisites_text(prereq: Optional[str]) -> Optional[str]:
    if prereq is None:
        return None
    prereq = prereq.strip()
    if prereq == "":
        return None
    if prereq.endswith("and"):
        prereq = prereq[:-3].rstrip() + " (incomplete)"
    prereq = re.sub(r"\s+", " ", prereq)
    return prereq


def extract_course_codes(text: str) -> list[str]:
    found = re.findall(r"\b([A-Z]{2,4}\s*\d{2,3})\b", text)
    return [" ".join(c.split()) for c in found]


def text_of(x: Any) -> Optional[str]:
    if x is None:
        return None
    if isinstance(x, NavigableString):
        s = str(x).strip()
        return s or None
    if isinstance(x, Tag):
        s = x.get_text(" ", strip=True)
        return s or None
    s = str(x).strip()
    return s or None


def scrape_dept_name_map() -> dict[str, str]:
    """
    Scrape deptCode -> deptName from the listing page dropdown option TEXT,
    e.g., "CSE - Computer Science".
    """
    html = fetch(PAGE_URL_TEMPLATE.format(page=1))
    soup = BeautifulSoup(html, "html.parser")

    dept_map: dict[str, str] = {}
    for opt in soup.select("option"):
        text = opt.get_text(" ", strip=True)
        m = DEPT_TEXT_RE.match(text)
        if not m:
            continue
        code = m.group(1).strip()
        name = m.group(2).strip()
        dept_map.setdefault(code, name)

    return dept_map


# ----------------------------- STEP 1: links -----------------------------

def get_course_links(*, test_mode: bool, test_limit: int) -> list[str]:
    all_links: list[str] = []
    total_pages = 1 if test_mode else 34

    print(f"[*] Collecting links from {total_pages} page(s)...")
    for page in range(1, total_pages + 1):
        url = PAGE_URL_TEMPLATE.format(page=page)
        print(f"  - Fetching page {page}/{total_pages}")

        html = fetch(url)
        soup = BeautifulSoup(html, "html.parser")

        for a in soup.select('a[href*="preview_course"]'):
            href_val = a.get("href")
            if not href_val:
                continue
            # bs4 typing can treat attributes as list-like; normalize to str
            href = str(href_val[0]) if isinstance(href_val, list) else str(href_val)
            href = href.strip()
            if not href:
                continue
            all_links.append(urljoin(BASE + "/", href))

        time.sleep(REQUEST_DELAY_SEC)

    # Deduplicate preserving order
    seen: set[str] = set()
    deduped: list[str] = []
    for link in all_links:
        if link not in seen:
            seen.add(link)
            deduped.append(link)

    if test_mode:
        print(f"[TEST MODE] Restricting to first {test_limit} links.")
        return deduped[:test_limit]
    return deduped


# ----------------------------- STEP 2: course page -----------------------------

def parse_course_page(url: str, dept_map: dict[str, str]) -> Optional[dict[str, Any]]:
    html = fetch(url)
    soup = BeautifulSoup(html, "html.parser")

    block = soup.find(id="course_preview_title")
    if not block:
        print(f"[WARN] Missing title block: {url}")
        return None

    full_title = block.get_text(" ", strip=True)

    code_match = re.match(r"([A-Z]{2,4}\s*\d{2,3})", full_title)
    if not code_match:
        print(f"[WARN] Could not find course code in: {full_title} ({url})")
        return None

    course_code = " ".join(code_match.group(1).split())

    dept_match = re.match(r"([A-Z]{2,4})\s*(\d{2,3})", course_code)
    if not dept_match:
        print(f"[WARN] Could not split department/number: {course_code} ({url})")
        return None
    dept_code, number = dept_match.group(1), dept_match.group(2)

    # Title without leading dash
    title_only = full_title
    if full_title.startswith(course_code):
        rest = full_title[len(course_code):].replace("\u00A0", " ")
        rest = re.sub(r"^[\-\–\—\s]+", "", rest).strip()
        if rest:
            title_only = rest

    parent_p = block.find_parent("p")
    if not parent_p:
        print(f"[WARN] Missing <p> container: {url}")
        return None

    credits_text: Optional[str] = None
    raw_prereq: Optional[str] = None

    for s in parent_p.find_all("strong"):
        label = s.get_text(" ", strip=True).lower()
        if "credit" in label:
            credits_text = s.get_text(" ", strip=True)
        if "prereq" in label:
            raw_prereq = text_of(s.next_sibling)

    credits_num = 0
    if credits_text:
        m = re.search(r"(\d+)", credits_text)
        if m:
            credits_num = int(m.group(1))

    # Description = text before the first <strong>
    desc_parts: list[str] = []
    for node in parent_p.contents:
        if isinstance(node, Tag) and node.name == "strong":
            break
        if isinstance(node, NavigableString):
            t = str(node).strip()
            if t:
                desc_parts.append(t)
        elif isinstance(node, Tag):
            t = node.get_text(" ", strip=True)
            if t:
                desc_parts.append(t)
    description = " ".join(desc_parts).strip()

    raw_prereq_clean = clean_prerequisites_text(raw_prereq)

    stable_id = course_code  # stable across scrapes

    return {
        "id": stable_id,
        "deptCode": dept_code,
        "deptName": dept_map.get(dept_code),
        "number": number,
        "code": course_code,
        "title": title_only,
        "description": description,
        "credits": credits_num,
        "active": True,
        "rawPrerequisites": raw_prereq_clean,
        "prerequisites": None,
        "corequisites": None,
        "advisorNotes": None,
        "url": url,
    }


# ----------------------------- STEP 3: prereq node -----------------------------

def build_reqnode(course: dict[str, Any], code_to_id: dict[str, str]) -> Optional[dict[str, Any]]:
    text = course.get("rawPrerequisites")
    if not isinstance(text, str) or not text:
        return None

    if "(incomplete)" in text:
        lead = {"kind": "TRUE"}
        return lead

    codes = extract_course_codes(text)
    nodes: list[dict[str, Any]] = []
    for code in codes:
        cid = code_to_id.get(code)
        if cid:
            nodes.append({"kind": "COURSE", "courseId": cid})

    if not nodes:
        return {"kind": "TRUE"}

    lower = text.lower()

    if " or " in lower and " and " not in lower:
        return nodes[0] if len(nodes) == 1 else {"kind": "OR", "nodes": nodes}

    if " and " in lower and " or " not in lower:
        return nodes[0] if len(nodes) == 1 else {"kind": "AND", "nodes": nodes}

    # Mixed: default AND
    return nodes[0] if len(nodes) == 1 else {"kind": "AND", "nodes": nodes}


# ----------------------------- output -----------------------------

def save_json(path: Path, courses: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        json.dump(courses, f, indent=2, ensure_ascii=False)
    print(f"[+] Wrote JSON: {path.resolve()}")


def save_csv(path: Path, courses: list[dict[str, Any]]) -> None:
    keys = [
        "id", "deptCode", "deptName", "number", "code",
        "title", "description", "credits", "active",
        "rawPrerequisites", "url"
    ]
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=keys)
        w.writeheader()
        for c in courses:
            w.writerow({k: c.get(k) for k in keys})
    print(f"[+] Wrote CSV:  {path.resolve()}")


# ----------------------------- main -----------------------------

def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--full", action="store_true", help="Scrape all pages (disables test mode).")
    ap.add_argument("--test", action="store_true", help="Force test mode (even if default is full).")
    ap.add_argument("--limit", type=int, default=TEST_LIMIT_DEFAULT, help="Test mode limit.")
    args = ap.parse_args()

    # Default comes from TEST_MODE_DEFAULT, unless overridden by flags
    if args.full:
        test_mode = False
    elif args.test:
        test_mode = True
    else:
        test_mode = TEST_MODE_DEFAULT

    test_limit = max(1, args.limit)

    script_dir = Path(__file__).resolve().parent
    project_root = find_project_root(script_dir)
    json_out, csv_out = output_paths(project_root)

    print(f"[*] Project root: {project_root}")
    print(f"[*] Output JSON : {json_out}")
    print(f"[*] Output CSV  : {csv_out}")

    dept_map = scrape_dept_name_map()
    print(f"[*] Dept names scraped: {len(dept_map)}")

    links = get_course_links(test_mode=test_mode, test_limit=test_limit)
    print(f"[*] Scraping {len(links)} course preview page(s)...")

    courses: list[dict[str, Any]] = []
    for i, link in enumerate(links, 1):
        print(f"  - ({i}/{len(links)}) {link}")
        c = parse_course_page(link, dept_map)
        if c:
            courses.append(c)
        time.sleep(REQUEST_DELAY_SEC)

    code_to_id = {c["code"]: c["id"] for c in courses}
    for c in courses:
        c["prerequisites"] = build_reqnode(c, code_to_id)

    save_json(json_out, courses)
    save_csv(csv_out, courses)
    print(f"[+] Done! Extracted {len(courses)} courses.")


if __name__ == "__main__":
    main()
