#!/usr/bin/env python3
"""
scripts/specializations_scraper.py — Stony Brook major specializations scraper.

Walks https://catalog.stonybrook.edu/content.php?catoid=7&navoid=224 (Programs A-Z),
visits each preview_program.php page, and extracts "Specialization in X" sections
with their grouped course lists.

Output: <project>/src/data/courses/specializations.json

Usage:
  python scripts/specializations_scraper.py
  python scripts/specializations_scraper.py --test --limit 5
  python scripts/specializations_scraper.py --poid 318          # one major
"""

from __future__ import annotations

import argparse
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
CATOID = 7
NAVOID = 224

PROGRAMS_INDEX_URL = f"{BASE}/content.php?catoid={CATOID}&navoid={NAVOID}"
PROGRAM_URL_TEMPLATE = (
    f"{BASE}/preview_program.php?catoid={CATOID}&poid={{poid}}&returnto={NAVOID}"
)

REQUEST_DELAY_SEC = 0.4
TIMEOUT_SEC = 30

# "Specialization in <name>" — sometimes followed by a colon
SPEC_HEADING_RE = re.compile(r"^\s*Specialization\s+in\s+(.+?)\s*:?\s*$", re.IGNORECASE)
COURSE_CODE_RE = re.compile(r"\b([A-Z]{2,4}\s*\d{3})\b")
HEADING_TAGS = ("h1", "h2", "h3", "h4", "h5", "h6")


# ----------------------------- project paths -----------------------------

def find_project_root(start: Path) -> Optional[Path]:
    cur = start.resolve()
    for _ in range(12):
        if (cur / "package.json").exists() and (cur / "src").exists():
            return cur
        cur = cur.parent
    return None


def output_path(project_root: Optional[Path]) -> Path:
    if project_root:
        out_dir = project_root / "src" / "data" / "courses"
        out_dir.mkdir(parents=True, exist_ok=True)
        return out_dir / "specializations.json"
    return Path.cwd() / "specializations.json"


# ----------------------------- HTTP -----------------------------

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


def fetch(url: str, *, retries: int = 5) -> str:
    last_err: Optional[Exception] = None
    for attempt in range(retries + 1):
        try:
            r = SESSION.get(url, timeout=TIMEOUT_SEC)
            if r.status_code == 202 or "awsWafCookieDomainList" in (r.text or "")[:500]:
                wait = min(30, 3 * (2 ** attempt))
                print(f"  [WAF] HTTP {r.status_code}, sleeping {wait}s "
                      f"(attempt {attempt+1}/{retries+1})")
                time.sleep(wait)
                continue
            if r.status_code != 200:
                snippet = (r.text or "")[:300].replace("\n", " ")
                raise RuntimeError(f"HTTP {r.status_code} for {url}\nBody: {snippet}")
            return r.text
        except RuntimeError:
            raise
        except Exception as e:
            last_err = e
            if attempt < retries:
                time.sleep(0.6 * (attempt + 1))
            else:
                raise RuntimeError(str(last_err)) from last_err
    raise RuntimeError(f"Failed after {retries+1} attempts for {url}")


# ----------------------------- helpers -----------------------------

def clean_spaces(s: str) -> str:
    return re.sub(r"\s+", " ", s.replace(" ", " ")).strip()


def slugify(name: str) -> str:
    s = name.lower()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-")


def heading_level(tag: Tag) -> int:
    return int(tag.name[1])


def text_of_node(node: Any) -> str:
    if isinstance(node, NavigableString):
        return clean_spaces(str(node))
    if isinstance(node, Tag):
        return clean_spaces(node.get_text(" ", strip=True))
    return clean_spaces(str(node))


def parse_spec_block(start_h: Tag, end_h: Optional[Tag]) -> list[dict[str, Any]]:
    """Walk DOM in document order from start_h until end_h, splitting by
    sub-headings (deeper than start_h's level) into sections of course codes.

    Course codes come from <a href*=preview_course> link text. A regex fallback
    on plain text catches codes that aren't linked.
    """
    spec_level = heading_level(start_h)
    sections: list[dict[str, Any]] = []
    current_label: Optional[str] = None
    current_courses: list[str] = []
    seen: set[str] = set()
    # Track text fragments per section for regex fallback
    text_buf: list[str] = []

    def flush() -> None:
        nonlocal current_label, current_courses, seen, text_buf
        # Regex over buffered prose to catch courses whose <a> doesn't point to
        # preview_course (popup-style links inside <li>/<p>). Deduped via `seen`.
        for frag in text_buf:
            for m in COURSE_CODE_RE.finditer(frag):
                code = " ".join(m.group(1).split())
                if code not in seen:
                    seen.add(code)
                    current_courses.append(code)
        # Drop sections that have no courses — usually footnote labels like "Notes:"
        if current_courses:
            sections.append({"label": current_label, "courses": current_courses})
        current_label = None
        current_courses = []
        seen = set()
        text_buf = []

    def add_course(code: str) -> None:
        code = " ".join(code.split())
        if code not in seen:
            seen.add(code)
            current_courses.append(code)

    for elem in start_h.find_all_next():
        if end_h is not None and elem is end_h:
            break
        if not isinstance(elem, Tag):
            continue

        if elem.name in HEADING_TAGS:
            level = heading_level(elem)
            if level <= spec_level:
                # Sibling- or shallower-level heading (not the next-spec sentinel,
                # since we'd have hit `elem is end_h` above). Stop the spec.
                break
            # Deeper heading → starts a new sub-section
            flush()
            current_label = clean_spaces(elem.get_text(" ", strip=True))
            continue

        if elem.name == "a":
            href = elem.get("href") or ""
            href = href[0] if isinstance(href, list) else href
            if "preview_course" in str(href):
                txt = clean_spaces(elem.get_text(" ", strip=True))
                m = COURSE_CODE_RE.search(txt)
                if m:
                    add_course(m.group(1))
            continue

        # Buffer prose text for regex fallback. Restrict to leaf-ish elements
        # so we don't double-count text from container <div>s that already wrap
        # nested headings + anchors (which we visit individually).
        if elem.name in ("p", "li", "td"):
            text_buf.append(elem.get_text(" ", strip=True))

    flush()
    return sections


# ----------------------------- step 1: list majors -----------------------------

def list_majors() -> list[dict[str, Any]]:
    """Returns [{name, poid, url}, ...]."""
    print(f"[*] Fetching programs A-Z: {PROGRAMS_INDEX_URL}")
    html = fetch(PROGRAMS_INDEX_URL)
    soup = BeautifulSoup(html, "html.parser")

    majors: list[dict[str, Any]] = []
    seen_poids: set[str] = set()

    for a in soup.select('a[href*="preview_program.php"]'):
        href = a.get("href") or ""
        href = str(href[0]) if isinstance(href, list) else str(href)
        m = re.search(r"poid=(\d+)", href)
        if not m:
            continue
        poid = m.group(1)
        if poid in seen_poids:
            continue
        seen_poids.add(poid)

        name = clean_spaces(a.get_text(" ", strip=True))
        if not name:
            continue

        majors.append({
            "name": name,
            "poid": int(poid),
            "url": urljoin(BASE + "/", href),
        })

    print(f"[*] Found {len(majors)} majors.")
    return majors


# ----------------------------- step 2: parse one major -----------------------------

def parse_major_page(major: dict[str, Any]) -> dict[str, Any]:
    """Returns the major dict augmented with a 'specializations' list."""
    url = PROGRAM_URL_TEMPLATE.format(poid=major["poid"])
    html = fetch(url)
    soup = BeautifulSoup(html, "html.parser")

    # Find every "Specialization in X" heading in document order
    spec_headings: list[tuple[str, Tag]] = []
    for h in soup.find_all(HEADING_TAGS):
        text = clean_spaces(h.get_text(" ", strip=True))
        m = SPEC_HEADING_RE.match(text)
        if m:
            spec_headings.append((m.group(1).strip(), h))

    specializations: list[dict[str, Any]] = []
    for i, (spec_name, h) in enumerate(spec_headings):
        end_h = spec_headings[i + 1][1] if i + 1 < len(spec_headings) else None
        sections = parse_spec_block(h, end_h)

        # Flat deduped course list across sections for convenience
        all_courses: list[str] = []
        seen: set[str] = set()
        for sec in sections:
            for c in sec["courses"]:
                if c not in seen:
                    seen.add(c)
                    all_courses.append(c)

        specializations.append({
            "name": spec_name,
            "slug": slugify(spec_name),
            "sections": sections,
            "courses": all_courses,
        })

    return {
        "majorId": slugify(major["name"]),
        "majorName": major["name"],
        "poid": major["poid"],
        "url": url,
        "specializations": specializations,
    }


# ----------------------------- main -----------------------------

def main() -> None:
    ap = argparse.ArgumentParser()
    mode = ap.add_mutually_exclusive_group()
    mode.add_argument("--test", action="store_true", help="Limit to first N majors.")
    mode.add_argument("--full", action="store_true", help="Scrape all majors.")
    ap.add_argument("--limit", type=int, default=10, help="N for --test mode.")
    ap.add_argument("--poid", type=int, help="Scrape just one major by poid.")
    args = ap.parse_args()

    project_root = find_project_root(Path(__file__).resolve().parent)
    out_path = output_path(project_root)
    print(f"[*] Output: {out_path}")

    if args.poid:
        majors = [{"name": f"poid-{args.poid}", "poid": args.poid, "url": ""}]
    else:
        majors = list_majors()
        if args.test:
            majors = majors[: max(1, args.limit)]

    results: list[dict[str, Any]] = []
    failed: list[tuple[int, str]] = []

    for i, major in enumerate(majors, 1):
        print(f"  ({i}/{len(majors)}) [{major['poid']}] {major['name']}")
        try:
            entry = parse_major_page(major)
            n_specs = len(entry["specializations"])
            n_courses = sum(len(s["courses"]) for s in entry["specializations"])
            print(f"      -> {n_specs} specs, {n_courses} courses (deduped per-spec)")
            results.append(entry)
        except Exception as e:
            print(f"      [!] FAILED: {e}")
            failed.append((major["poid"], str(e)))
        time.sleep(REQUEST_DELAY_SEC)

        # Checkpoint every 25 majors
        if i % 25 == 0:
            with out_path.open("w", encoding="utf-8") as f:
                json.dump(results, f, indent=2, ensure_ascii=False)
            print(f"  [*] Checkpoint: wrote {len(results)} so far")

    out_path.parent.mkdir(parents=True, exist_ok=True)
    with out_path.open("w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)

    total_specs = sum(len(r["specializations"]) for r in results)
    print(f"[+] Done. {len(results)} majors, {total_specs} specializations -> {out_path}")
    if failed:
        print(f"[!] Failed: {len(failed)}")
        for poid, err in failed[:10]:
            print(f"    poid={poid}: {err}")


if __name__ == "__main__":
    main()
