#!/usr/bin/env python3
"""
scripts/scraper.py — Stony Brook course scraper (catalog.stonybrook.edu)

Fixes:
- Prerequisites are no longer truncated (e.g. "C or higher in ...").
  We now collect ALL text after the "Prerequisite:" <strong> until the next <strong>.
- Test mode vs full mode is unambiguous:
    * --test uses a limit
    * --full scrapes all pages
    * if neither flag is given, it uses TEST_MODE_DEFAULT / TEST_LIMIT_DEFAULT
- IDs are stable across runs: id == course code (e.g. "CSE 214")
- Outputs to: <project>/src/data/courses/all.json and all.csv (if project root found)

Usage:
  python scripts/scraper.py
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

# Default behavior if you run without flags:
TEST_MODE_DEFAULT = False
TEST_LIMIT_DEFAULT = 10

# Catalog listing page for courses (catoid/navoid may change over time)
PAGE_URL_TEMPLATE = (
    "https://catalog.stonybrook.edu/content.php?"
    "catoid=8&navoid=484&filter%5Bitem_type%5D=3&"
    "filter%5Bonly_active%5D=1&filter%5B3%5D=1&filter%5Bcpage%5D={page}"
)

# How many listing pages exist (you can bump if the catalog grows)
TOTAL_PAGES_DEFAULT = 34

REQUEST_DELAY_SEC = 0.15
TIMEOUT_SEC = 30

# Matches "ACC - Accounting" / "ACC – Accounting" / "ACC — Accounting"
DEPT_TEXT_RE = re.compile(r"^([A-Z]{2,4})\s*[-–—]\s*(.+)$")


# ----------------------------- project paths -----------------------------

def find_project_root(start: Path) -> Optional[Path]:
    cur = start.resolve()
    for _ in range(12):
        if (cur / "package.json").exists() and (cur / "src").exists():
            return cur
        cur = cur.parent
    return None


def output_paths(project_root: Optional[Path]) -> tuple[Path, Path]:
    if project_root:
        out_dir = project_root / "src" / "data" / "courses"
        out_dir.mkdir(parents=True, exist_ok=True)
        return (out_dir / "all.json", out_dir / "all.csv")

    # fallback: write next to this script
    out_dir = Path.cwd()
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

def clean_spaces(s: str) -> str:
    return re.sub(r"\s+", " ", s.replace("\u00A0", " ")).strip()


def clean_prerequisites_text(prereq: Optional[str]) -> Optional[str]:
    if prereq is None:
        return None
    prereq = clean_spaces(prereq)
    if prereq == "":
        return None
    if prereq.endswith("and"):
        prereq = prereq[:-3].rstrip() + " (incomplete)"
    return prereq


def extract_course_codes(text: str) -> list[str]:
    found = re.findall(r"\b([A-Z]{2,4}\s*\d{2,3})\b", text)
    return [" ".join(c.split()) for c in found]


def text_of(x: Any) -> Optional[str]:
    if x is None:
        return None
    if isinstance(x, NavigableString):
        s = str(x)
        s = clean_spaces(s)
        return s or None
    if isinstance(x, Tag):
        s = x.get_text(" ", strip=True)
        s = clean_spaces(s)
        return s or None
    s = clean_spaces(str(x))
    return s or None


def scrape_dept_name_map() -> dict[str, str]:
    """
    Best-effort deptCode -> deptName.
    Note: The catalog dropdown may NOT contain names for every department.
    """
    html = fetch(PAGE_URL_TEMPLATE.format(page=1))
    soup = BeautifulSoup(html, "html.parser")

    dept_map: dict[str, str] = {}
    for opt in soup.select("option"):
        txt = opt.get_text(" ", strip=True)
        txt = clean_spaces(txt)
        m = DEPT_TEXT_RE.match(txt)
        if not m:
            continue
        code = m.group(1).strip()
        name = m.group(2).strip()
        dept_map.setdefault(code, name)

    return dept_map


# ----------------------------- STEP 1: links -----------------------------

def get_course_links(*, test_mode: bool, test_limit: int, total_pages: int) -> list[str]:
    all_links: list[str] = []
    pages = 1 if test_mode else total_pages

    print(f"[*] Collecting links from {pages} page(s)...")
    for page in range(1, pages + 1):
        url = PAGE_URL_TEMPLATE.format(page=page)
        print(f"  - Fetching page {page}/{pages}")

        html = fetch(url)
        soup = BeautifulSoup(html, "html.parser")

        for a in soup.select('a[href*="preview_course"]'):
            href_val = a.get("href")
            if not href_val:
                continue
            href = str(href_val[0]) if isinstance(href_val, list) else str(href_val)
            href = href.strip()
            if not href:
                continue
            all_links.append(urljoin(BASE + "/", href))

        time.sleep(REQUEST_DELAY_SEC)

    # dedupe
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

    full_title = clean_spaces(block.get_text(" ", strip=True))

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

    # title (strip "CODE - " prefix)
    title_only = full_title
    if full_title.startswith(course_code):
        rest = clean_spaces(full_title[len(course_code):])
        rest = re.sub(r"^[\-\–\—\s]+", "", rest).strip()
        if rest:
            title_only = rest

    parent_p = block.find_parent("p")
    if not parent_p:
        print(f"[WARN] Missing <p> container: {url}")
        return None

    credits_text: Optional[str] = None
    raw_prereq: Optional[str] = None

    # --- Extract credits + prerequisites from <strong> blocks ---
    for s in parent_p.find_all("strong"):
        label = clean_spaces(s.get_text(" ", strip=True)).lower()

        if "credit" in label:
            credits_text = clean_spaces(s.get_text(" ", strip=True))

        if "prereq" in label:
            # FIX: collect all text after this <strong> until next <strong>
            parts: list[str] = []
            for sib in s.next_siblings:
                if isinstance(sib, Tag) and sib.name == "strong":
                    break
                t = text_of(sib)
                if t:
                    parts.append(t)
            raw_prereq = clean_spaces(" ".join(parts)) if parts else None

    # credits number (handle "3" or "3-4" etc -> take first)
    credits_num = 0
    if credits_text:
        m = re.search(r"(\d+)", credits_text)
        if m:
            credits_num = int(m.group(1))

    # description: take text from parent_p BEFORE first <strong>,
    # then remove duplicated "CODE - TITLE" if present.
    desc_parts: list[str] = []
    for node in parent_p.contents:
        if isinstance(node, Tag) and node.name == "strong":
            break
        t = text_of(node)
        if t:
            desc_parts.append(t)
    description = clean_spaces(" ".join(desc_parts))

    # The catalog often repeats the title in that first chunk; strip it if present.
    # Examples:
    #   "CSE 214 - Data Structures An extension of ..."
    if description.startswith(full_title):
        description = clean_spaces(description[len(full_title):])
    elif description.startswith(course_code):
        # remove leading "CODE - TITLE" or "CODE – TITLE"
        description = re.sub(rf"^{re.escape(course_code)}\s*[-–—]\s*{re.escape(title_only)}\s*", "", description)
        description = clean_spaces(description)

    raw_prereq_clean = clean_prerequisites_text(raw_prereq)

    # stable id across scrapes
    stable_id = course_code

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
        return {"kind": "TRUE"}

    codes = extract_course_codes(text)
    nodes: list[dict[str, Any]] = []
    for code in codes:
        cid = code_to_id.get(code)
        if cid:
            nodes.append({"kind": "COURSE", "courseId": cid})

    # If prereq text exists but has no explicit course codes, treat as non-checkable.
    if not nodes:
        return {"kind": "TRUE"}

    lower = text.lower()
    if " or " in lower and " and " not in lower:
        return nodes[0] if len(nodes) == 1 else {"kind": "OR", "nodes": nodes}
    if " and " in lower and " or " not in lower:
        return nodes[0] if len(nodes) == 1 else {"kind": "AND", "nodes": nodes}

    # Mixed "and/or": default to AND (keeps graph conservative)
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
    print(f"[+] Wrote CSV : {path.resolve()}")


# ----------------------------- main -----------------------------

def main() -> None:
    ap = argparse.ArgumentParser()
    mode = ap.add_mutually_exclusive_group()
    mode.add_argument("--test", action="store_true", help="Test mode: scrape 1 listing page and limit courses.")
    mode.add_argument("--full", action="store_true", help="Full mode: scrape all listing pages.")
    ap.add_argument("--limit", type=int, default=TEST_LIMIT_DEFAULT, help="Course limit in test mode.")
    ap.add_argument("--pages", type=int, default=TOTAL_PAGES_DEFAULT, help="How many listing pages exist.")
    args = ap.parse_args()

    # Decide mode: flags override defaults
    if args.test:
        test_mode = True
    elif args.full:
        test_mode = False
    else:
        test_mode = TEST_MODE_DEFAULT

    test_limit = max(1, int(args.limit))
    total_pages = max(1, int(args.pages))

    script_dir = Path(__file__).resolve().parent
    project_root = find_project_root(script_dir)
    json_out, csv_out = output_paths(project_root)

    print(f"[*] Project root: {project_root if project_root else '(not found; writing to cwd)'}")
    print(f"[*] Output JSON : {json_out}")
    print(f"[*] Output CSV  : {csv_out}")
    print(f"[*] Mode       : {'TEST' if test_mode else 'FULL'}")

    dept_map = scrape_dept_name_map()
    print(f"[*] Dept names scraped (best-effort): {len(dept_map)}")

    links = get_course_links(test_mode=test_mode, test_limit=test_limit, total_pages=total_pages)
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
