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


def scrape_course_page(driver: webdriver.Chrome, url: str) -> Optional[Dict]:
    try:
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

        course_code = f"{dept_code}{number}"

        # Extract credits
        credits = None
        credits_match = re.search(r"(\d+(?:\.\d+)?)\s*credits?", text, re.IGNORECASE)
        if credits_match:
            try:
                credits = float(credits_match.group(1))
            except ValueError:
                pass

        # Extract description - between title and credits info
        # Pattern: "Title Description...0 credit,SBC:..."
        desc_match = re.search(r"[−–\-—]\s*[^\n]+?\s+([A-Z][^.]+.*?)\s*\d+\s*credits?", text, re.DOTALL)
        if desc_match:
            description = desc_match.group(1).strip()
        else:
            description = ""

        description = re.sub(r"\s+", " ", description).strip()

        # Extract prerequisite text from the FULL page text (not just description)
        # Prerequisites come after credits: "3 credits Prerequisite(s): BUS major or..."
        prereq_text = ""
        match = re.search(r"Prerequisite\(s\):\s*(.+)", text, re.IGNORECASE)
        if match:
            prereq_text = match.group(1)
            # Clean up: remove everything after "Print"
            prereq_text = re.split(r'\s+Print\s+', prereq_text)[0].strip()

        # Extract corequisite text
        coreq_text = ""
        for pattern in [r"Corequisite(?:s)?\s*:\s*([^\n]+)(?=\s+Print|\s+Help|$)",
                       r"Co-?req(?:uisite)?(?:s)?\s*:\s*([^\n]+)(?=\s+Print|\s+Help|$)"]:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                coreq_text = match.group(1).strip()
                break

        # Also extract course codes from prerequisites for the requirements table
        prereq_courses = []
        coreq_courses = []
        if prereq_text:
            prereq_courses = re.findall(r"[A-Z]{2,4}\s*\d{3}[A-Z]?", prereq_text)
        if coreq_text:
            coreq_courses = re.findall(r"[A-Z]{2,4}\s*\d{3}[A-Z]?", coreq_text)

        return {
            "id": str(uuid4()),
            "dept_code": dept_code,
            "number": number,
            "code": course_code,
            "title": title,
            "description": description,
            "credits": credits,
            "active": True,
            "prerequisite_text": prereq_text,
            "corequisite_text": coreq_text,
            "prerequisites": [c.replace(" ", "") for c in prereq_courses],
            "corequisites": [c.replace(" ", "") for c in coreq_courses],
        }
    except Exception as e:
        return None




def build_requirements(courses: List[Dict]) -> List[Dict]:
    requirements = []
    course_code_to_id = {c["code"]: c["id"] for c in courses}

    for course in courses:
        group_no = 0
        for prereq_code in course.get("prerequisites", []):
            requirements.append({
                "id": len(requirements) + 1,
                "course_id": course["id"],
                "group_no": group_no,
                "kind": "prerequisite",
                "required_code": prereq_code,
                "required_id": course_code_to_id.get(prereq_code)
            })
            group_no += 1

        for coreq_code in course.get("corequisites", []):
            requirements.append({
                "id": len(requirements) + 1,
                "course_id": course["id"],
                "group_no": group_no,
                "kind": "corequisite",
                "required_code": coreq_code,
                "required_id": course_code_to_id.get(coreq_code)
            })
            group_no += 1
    return requirements


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

        print("Scraping courses...")
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

        print("Processing requirements and aliases...")
        requirements = build_requirements(all_courses)
        aliases = find_course_aliases(all_courses)
        print(f"{len(requirements)} requirements, {len(aliases)} aliases\n")

        for course in all_courses:
            course.pop("prerequisites", None)
            course.pop("corequisites", None)
            # Keep prerequisite_text and corequisite_text in the final output

        print("Extracting departments...")
        dept_codes = sorted(set(c["dept_code"] for c in all_courses))
        dept_data = [{"code": code, "name": code} for code in dept_codes]
        print(f"Found {len(dept_data)} departments\n")

        print("Saving data...")

        (output_path / "departments.json").write_text(
            json.dumps(dept_data, indent=2, ensure_ascii=False), encoding="utf-8")
        print(f"departments.json ({len(dept_data)})")

        (output_path / "courses.json").write_text(
            json.dumps(all_courses, indent=2, ensure_ascii=False), encoding="utf-8")
        print(f"courses.json ({len(all_courses)})")

        (output_path / "course_requirements.json").write_text(
            json.dumps(requirements, indent=2, ensure_ascii=False), encoding="utf-8")
        print(f"course_requirements.json ({len(requirements)})")

        (output_path / "course_aliases.json").write_text(
            json.dumps(aliases, indent=2, ensure_ascii=False), encoding="utf-8")
        print(f"course_aliases.json ({len(aliases)})")

        combined = {
            "departments": dept_data,
            "courses": all_courses,
            "course_requirements": requirements,
            "course_aliases": aliases,
            "metadata": {
                "scraped_at": time.strftime("%Y-%m-%d %H:%M:%S"),
                "catalog_id": catalog_id,
                "total_departments": len(dept_data),
                "total_courses": len(all_courses),
            }
        }
        (output_path / "catalog_complete.json").write_text(
            json.dumps(combined, indent=2, ensure_ascii=False), encoding="utf-8")
        print(f"catalog_complete.json")

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
