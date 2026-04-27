#!/usr/bin/env python3
"""
scrape_catalog.py
Scrape course data from https://catalog.stonybrook.edu/
"""

from __future__ import annotations
import json, time, re
from datetime import timedelta
from pathlib import Path
from typing import List, Dict, Optional
from uuid import uuid4

import chromedriver_autoinstaller
from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.chrome.options import Options

BASE_URL = "https://catalog.stonybrook.edu"
CATALOG_ID = "26"
OUTPUT_DIR = "catalog_data"
SCROLL_PAUSE = 0.5
PAGE_LOAD_WAIT = 2


def make_driver(headless: bool = True) -> webdriver.Chrome:
    chromedriver_autoinstaller.install()
    opts = Options()
    if headless:
        opts.add_argument("--headless=new")
    opts.add_argument("--disable-gpu")
    opts.add_argument("--disable-extensions")
    opts.add_argument("--window-size=1920,1080")
    opts.add_experimental_option("excludeSwitches", ["enable-logging"])
    return webdriver.Chrome(options=opts)


def safe_get(driver: webdriver.Chrome, url: str, max_retries: int = 3) -> bool:
    for attempt in range(max_retries):
        try:
            driver.get(url)
            time.sleep(PAGE_LOAD_WAIT)
            return True
        except Exception as e:
            print(f"Attempt {attempt+1}/{max_retries} failed: {e}")
            if attempt < max_retries - 1:
                time.sleep(2)
    return False


def find_catalog_id(driver: webdriver.Chrome) -> str:
    if not safe_get(driver, BASE_URL):
        return CATALOG_ID
    soup = BeautifulSoup(driver.page_source, "html.parser")
    for link in soup.find_all("a", href=True):
        match = re.search(r"catoid=(\d+)", link["href"])
        if match:
            return match.group(1)
    return CATALOG_ID


def get_course_links(driver: webdriver.Chrome, catalog_id: str) -> List[str]:
    course_desc_url = f"{BASE_URL}/content.php?catoid={catalog_id}&navoid=225"

    if not safe_get(driver, course_desc_url):
        return []

    last_height = driver.execute_script("return document.body.scrollHeight")
    for _ in range(10):
        driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
        time.sleep(SCROLL_PAUSE)
        new_height = driver.execute_script("return document.body.scrollHeight")
        if new_height == last_height:
            break
        last_height = new_height

    soup = BeautifulSoup(driver.page_source, "html.parser")
    course_links = []

    for link in soup.find_all("a", href=True):
        href = link["href"]
        if "preview_course_nopop.php" in href:
            full_url = href if href.startswith("http") else BASE_URL + "/" + href.lstrip("/")
            course_links.append(full_url)

    return course_links


def parse_requirement_tree(req_text: str, course_code_to_id: Dict[str, str]) -> Optional[Dict]:
    """Parse prerequisite/corequisite text into a tree structure (AND/OR/COURSE nodes)."""
    if not req_text or req_text.lower() in ["none", "permission of instructor"]:
        return {"kind": "TRUE"}

    # Extract course codes from the requirement text
    course_codes = re.findall(r"[A-Z]{2,4}\s*\d{3}[A-Z]?", req_text)

    if not course_codes:
        return {"kind": "TRUE"}

    # Normalize course codes (remove spaces)
    normalized_codes = [c.replace(" ", "") for c in course_codes]

    # Simple heuristic: if "or" appears in text, use OR node; otherwise AND
    # This is a simplified parser - a full implementation would need proper parsing
    if re.search(r"\bor\b", req_text, re.IGNORECASE):
        # OR logic
        nodes = []
        for code in normalized_codes:
            # Generate a placeholder ID if course doesn't exist yet
            course_id = course_code_to_id.get(code, f"uuid-{code.lower()}")
            nodes.append({"kind": "COURSE", "courseId": course_id})

        if len(nodes) == 1:
            return nodes[0]
        return {"kind": "OR", "nodes": nodes}
    else:
        # AND logic (default)
        nodes = []
        for code in normalized_codes:
            course_id = course_code_to_id.get(code, f"uuid-{code.lower()}")
            nodes.append({"kind": "COURSE", "courseId": course_id})

        if len(nodes) == 0:
            return {"kind": "TRUE"}
        elif len(nodes) == 1:
            return nodes[0]
        return {"kind": "AND", "nodes": nodes}


def extract_sbc_fulfillments(text: str) -> List[Dict]:
    """Extract SBC categories from course text."""
    fulfills = []

    # Common SBC patterns in Stony Brook catalog
    sbc_pattern = r"SBC:\s*([A-Z+\s,]+)"
    match = re.search(sbc_pattern, text, re.IGNORECASE)

    if match:
        sbc_text = match.group(1)
        # Parse individual SBC codes (e.g., "TECH", "STEM+", "EXP+")
        for sbc in re.findall(r"[A-Z]+", sbc_text):
            sbc_clean = sbc.replace("+", "")
            # Map to known SBC categories
            if sbc_clean in ["EXP", "HUM", "ART", "SBS", "STEM", "DIV", "USA", "LANG", "WRT"]:
                fulfills.append({"category": sbc_clean})

    return fulfills


def scrape_course_page(driver: webdriver.Chrome, url: str, course_code_to_id: Dict[str, str] = None) -> Optional[Dict]:
    try:
        if course_code_to_id is None:
            course_code_to_id = {}

        if not safe_get(driver, url):
            return None

        soup = BeautifulSoup(driver.page_source, "html.parser")
        course_block = soup.find("td", class_="block_content")
        if not course_block:
            return None

        text = course_block.get_text(" ", strip=True)
        text = re.sub(r"^.*?Fall \d+ Undergraduate Catalog\s+", "", text)

        match = re.match(r"([A-Z]{2,4})\s*(\d{3}[A-Z]?)\s*[−–\-—]\s*(.+)", text)
        if not match:
            return None

        dept_code = match.group(1).strip()
        number = match.group(2).strip()
        rest = match.group(3).strip()

        # Extract title - everything before common description starters or credits
        title_end = re.search(r"\s+(?:An?\s+|The\s+|This\s+|Study\s+|Introduction\s+|Provides?\s+|Explores?\s+|Examines?\s+)\w+|\s+\d+\s*credits?", rest)
        if title_end:
            title = rest[:title_end.start()].strip()
        else:
            title = rest.split('.')[0].strip()  # Fallback: use first sentence

        # Generate course code with space (e.g., "CSE 101")
        course_code_with_space = f"{dept_code} {number}"
        course_code_no_space = f"{dept_code}{number}"

        # Generate ID in the format uuid-cse101
        course_id = f"uuid-{course_code_no_space.lower()}"

        # Full title format like "CSE 101: Computer Science Principles"
        full_title = f"{course_code_with_space}: {title}"

        # Extract credits
        credits = None
        credits_match = re.search(r"(\d+(?:\.\d+)?)\s*credits?", text, re.IGNORECASE)
        if credits_match:
            try:
                credits = int(float(credits_match.group(1)))
            except ValueError:
                pass

        # Extract description - between title and credits info
        desc_match = re.search(r"[−–\-—]\s*[^\n]+?\s+([A-Z][^.]+.*?)\s*\d+\s*credits?", text, re.DOTALL)
        if desc_match:
            description = desc_match.group(1).strip()
        else:
            description = ""

        description = re.sub(r"\s+", " ", description).strip()

        # Extract prerequisite text
        prereq_text = ""
        match = re.search(r"Prerequisite\(s\):\s*(.+)", text, re.IGNORECASE)
        if match:
            prereq_text = match.group(1)
            prereq_text = re.split(r'\s+Print\s+', prereq_text)[0].strip()

        # Extract corequisite text
        coreq_text = ""
        for pattern in [r"Corequisite(?:s)?\s*:\s*([^\n]+)(?=\s+Print|\s+Help|$)",
                       r"Co-?req(?:uisite)?(?:s)?\s*:\s*([^\n]+)(?=\s+Print|\s+Help|$)"]:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                coreq_text = match.group(1).strip()
                break

        # Parse requirements into tree structures
        prereq_tree = parse_requirement_tree(prereq_text, course_code_to_id) if prereq_text else {"kind": "TRUE"}
        coreq_tree = parse_requirement_tree(coreq_text, course_code_to_id) if coreq_text else None

        # Extract SBC fulfillments
        fulfills = extract_sbc_fulfillments(text)

        return {
            "id": course_id,
            "deptCode": dept_code,
            "number": number,
            "code": course_code_with_space,
            "title": full_title,
            "description": description,
            "credits": credits,
            "active": True,
            "prerequisites": prereq_tree,
            "corequisites": coreq_tree,
            "advisorNotes": None,
            "fulfills": fulfills,
            "_raw_prereq_text": prereq_text,  # Keep for debugging
            "_raw_coreq_text": coreq_text,    # Keep for debugging
        }
    except Exception as e:
        return None




def build_course_code_to_id_map(courses: List[Dict]) -> Dict[str, str]:
    """Build a mapping from course codes (both with and without spaces) to course IDs."""
    mapping = {}
    for course in courses:
        code_with_space = course["code"]  # e.g., "CSE 101"
        code_no_space = code_with_space.replace(" ", "")  # e.g., "CSE101"
        course_id = course["id"]

        mapping[code_with_space] = course_id
        mapping[code_no_space] = course_id

    return mapping


def find_course_aliases(courses: List[Dict]) -> List[Dict]:
    aliases = []
    for course in courses:
        desc = course.get("description", "")
        for pattern in [
            r"Also offered as\s+([A-Z]{2,4}\s*\d{3}[A-Z]?)",
            r"Same as\s+([A-Z]{2,4}\s*\d{3}[A-Z]?)",
            r"Cross-listed as\s+([A-Z]{2,4}\s*\d{3}[A-Z]?)",
        ]:
            for match in re.findall(pattern, desc, re.IGNORECASE):
                aliases.append({"course_id": course["id"], "alias_code": match.replace(" ", "")})
    return aliases


def main(output_dir: str = OUTPUT_DIR, headless: bool = True):
    output_path = Path(output_dir)
    output_path.mkdir(exist_ok=True)

    print(f"Starting Stony Brook Catalog Scraper")
    print(f"Output: {output_path.absolute()}\n")

    t0 = time.perf_counter()
    driver = make_driver(headless=headless)

    try:
        print("Discovering catalog...")
        catalog_id = find_catalog_id(driver)
        print(f"Catalog ID: {catalog_id}")

        print("Finding course links...")
        course_links = get_course_links(driver, catalog_id)
        if not course_links:
            print("No courses found")
            return
        print(f"Found {len(course_links)} courses\n")

        print("Scraping courses (pass 1 - basic info)...")
        all_courses = []
        for i, url in enumerate(course_links, 1):
            if i % 5 == 0:
                elapsed = timedelta(seconds=int(time.perf_counter() - t0))
                print(f"[{elapsed}] {i}/{len(course_links)} courses scraped")

            course = scrape_course_page(driver, url)
            if course:
                all_courses.append(course)
            time.sleep(0.3)

        print(f"\nScraped {len(all_courses)} total courses\n")

        # Build course code to ID mapping
        print("Building course code mappings...")
        course_code_to_id = build_course_code_to_id_map(all_courses)

        # Second pass: update prerequisite/corequisite trees with actual course IDs
        print("Updating prerequisite/corequisite references...")
        for course in all_courses:
            # Re-parse prerequisites with complete course mapping
            if course.get("_raw_prereq_text"):
                course["prerequisites"] = parse_requirement_tree(
                    course["_raw_prereq_text"], course_code_to_id
                )

            # Re-parse corequisites with complete course mapping
            if course.get("_raw_coreq_text"):
                course["corequisites"] = parse_requirement_tree(
                    course["_raw_coreq_text"], course_code_to_id
                )

            # Clean up raw text fields (optional - remove if you want to keep them)
            course.pop("_raw_prereq_text", None)
            course.pop("_raw_coreq_text", None)

        print("Extracting departments...")
        dept_codes = sorted(set(c["deptCode"] for c in all_courses))
        dept_data = [{"code": code, "name": code} for code in dept_codes]
        print(f"Found {len(dept_data)} departments\n")

        print("Saving data...")

        # Save main courses file in the schema format
        (output_path / "courses.json").write_text(
            json.dumps(all_courses, indent=2, ensure_ascii=False), encoding="utf-8")
        print(f"courses.json ({len(all_courses)})")

        # Also save departments for reference
        (output_path / "departments.json").write_text(
            json.dumps(dept_data, indent=2, ensure_ascii=False), encoding="utf-8")
        print(f"departments.json ({len(dept_data)})")

    finally:
        driver.quit()

    total_time = timedelta(seconds=int(time.perf_counter() - t0))
    print(f"\nComplete! Time: {total_time}")
    print(f"Files: {output_path.absolute()}")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Scrape Stony Brook course catalog")
    parser.add_argument("output_dir", nargs="?", default=OUTPUT_DIR,
                       help="Output directory for JSON files")
    parser.add_argument("--debug", action="store_true",
                       help="Run with visible browser for debugging")

    args = parser.parse_args()
    main(args.output_dir, headless=not args.debug)
