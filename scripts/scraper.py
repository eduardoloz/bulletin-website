import requests
from bs4 import BeautifulSoup
import json
import csv
import re
from urllib.parse import urljoin
import uuid
from typing import Any

BASE = "https://catalog.stonybrook.edu"

# Test mode: scrape only 1 page and first N courses
TEST_MODE = True
TEST_LIMIT = 8

PAGE_URL_TEMPLATE = (
    "https://catalog.stonybrook.edu/content.php?"
    "catoid=8&catoid=8&navoid=484&filter%5Bitem_type%5D=3&"
    "filter%5Bonly_active%5D=1&filter%5B3%5D=1&filter%5Bcpage%5D={page}"
)


###############################################################################
# PREREQUISITE HELPERS
###############################################################################

def clean_prerequisites_text(prereq: str | None) -> str | None:
    """Normalize and mark incomplete chains."""
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
    """Extract course codes like 'ACC 210'."""
    found = re.findall(r"\b([A-Z]{2,4}\s*\d{2,3})\b", text)
    return [" ".join(c.split()) for c in found]


###############################################################################
# STEP 1 — Collect preview links
###############################################################################

def get_course_links() -> list[str]:
    all_links: list[str] = []
    total_pages = 1 if TEST_MODE else 34

    print(f"[*] Collecting links from {total_pages} page(s)...")

    for page in range(1, total_pages + 1):
        url = PAGE_URL_TEMPLATE.format(page=page)
        print(f"  - Fetching page {page}/{total_pages}")

        html = requests.get(url).text
        soup = BeautifulSoup(html, "html.parser")

        links = soup.select('a[href*="preview_course"]')
        for a in links:
            href = a.get("href")
            if href:
                full = urljoin(BASE + "/", href)
                all_links.append(full)

    # Deduplicate
    deduped = []
    seen = set()
    for link in all_links:
        if link not in seen:
            seen.add(link)
            deduped.append(link)

    if TEST_MODE:
        print(f"[TEST MODE] Restricting to first {TEST_LIMIT} links.")
        return deduped[:TEST_LIMIT]

    return deduped


###############################################################################
# STEP 2 — Parse a course page (base fields)
###############################################################################

def parse_course_page(url: str) -> dict[str, Any] | None:
    html = requests.get(url).text
    soup = BeautifulSoup(html, "html.parser")

    block = soup.find(id="course_preview_title")
    if not block:
        print(f"[WARN] Missing title block: {url}")
        return None

    full_title = block.get_text(" ", strip=True)

    # Extract "ACC 210"
    code_match = re.match(r"([A-Z]{2,4}\s*\d{2,3})", full_title)
    if not code_match:
        print(f"[WARN] Could not find course code in {full_title}")
        return None

    course_code = " ".join(code_match.group(1).split())

    # Extract dept + number
    dept_match = re.match(r"([A-Z]{2,4})\s*(\d{2,3})", course_code)
    if not dept_match:
        print(f"[WARN] Could not split department/number: {course_code}")
        return None

    dept_code = dept_match.group(1)
    number = dept_match.group(2)

    # CLEAN TITLE — remove the leading hyphen
    title_only = full_title
    if full_title.startswith(course_code):
        rest = full_title[len(course_code):]

        # Replace non-breaking space, trim
        rest = rest.replace("\u00A0", " ")

        # Remove any leading hyphens or spaces (– — -)
        rest = re.sub(r"^[\-\–\—\s]+", "", rest).strip()

        if rest:
            title_only = rest

    parent_p = block.find_parent("p")
    if not parent_p:
        print(f"[WARN] Missing <p> container for {url}")
        return None

    strongs = parent_p.find_all("strong")

    credits_text = None
    raw_prereq = None

    for s in strongs:
        label = s.get_text(" ", strip=True)

        if "credit" in label.lower():
            credits_text = label

        if "prereq" in label.lower() and s.next_sibling:
            raw_prereq = s.next_sibling.strip()

    # Parse numeric credits
    credits_num = 0
    if credits_text:
        m = re.search(r"(\d+)", credits_text)
        if m:
            credits_num = int(m.group(1))

    # Extract description before <strong> blocks
    desc_parts = []
    for node in parent_p.contents:
        if hasattr(node, "name") and node.name == "strong":
            break
        if isinstance(node, str):
            t = node.strip()
            if t:
                desc_parts.append(t)
    description = " ".join(desc_parts)

    raw_prereq_clean = clean_prerequisites_text(raw_prereq)

    return {
        "id": str(uuid.uuid4()),
        "deptCode": dept_code,
        "number": number,
        "code": course_code,
        "title": title_only,
        "description": description,
        "credits": credits_num,
        "active": True,
        "rawPrerequisites": raw_prereq_clean,
        "prerequisites": None,  # Set in second pass
        "corequisites": None,
        "advisorNotes": None,
        "url": url,
    }


###############################################################################
# STEP 3 — Build actual ReqNode trees
###############################################################################

def build_reqnode(course: dict[str, Any], code_to_id: dict[str, str]) -> dict[str, Any] | None:
    text = course["rawPrerequisites"]
    if text is None:
        return None

    # Incomplete prereqs → disable checking
    if "(incomplete)" in text:
        return {"kind": "TRUE"}

    # Collect course codes
    codes = extract_course_codes(text)
    nodes = []

    for code in codes:
        cid = code_to_id.get(code)
        if cid:
            nodes.append({"kind": "COURSE", "courseId": cid})

    if not nodes:
        return {"kind": "TRUE"}

    lower = text.lower()

    # Pure OR
    if " or " in lower and " and " not in lower:
        if len(nodes) == 1:
            return nodes[0]
        return {"kind": "OR", "nodes": nodes}

    # Pure AND
    if " and " in lower and " or " not in lower:
        if len(nodes) == 1:
            return nodes[0]
        return {"kind": "AND", "nodes": nodes}

    # Mixed → default AND
    if len(nodes) == 1:
        return nodes[0]

    return {"kind": "AND", "nodes": nodes}


###############################################################################
# STEP 4 — Save outputs
###############################################################################

def save_json(courses: list[dict[str, Any]]):
    with open("courses.json", "w") as f:
        json.dump(courses, f, indent=4)
    print("[+] Saved courses.json")


def save_csv(courses: list[dict[str, Any]]):
    keys = [
        "id", "deptCode", "number", "code",
        "title", "description", "credits", "active",
        "rawPrerequisites", "url"
    ]

    with open("courses.csv", "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=keys)
        writer.writeheader()
        for c in courses:
            writer.writerow({k: c.get(k) for k in keys})

    print("[+] Saved courses.csv")


###############################################################################
# MAIN
###############################################################################

def main():
    links = get_course_links()
    print(f"[*] Scraping {len(links)} courses...")

    # First pass — basic fields
    courses: list[dict[str, Any]] = []
    for idx, link in enumerate(links, 1):
        print(f"  - ({idx}/{len(links)}) {link}")
        c = parse_course_page(link)
        if c:
            courses.append(c)

    # Build code→UUID map
    code_to_id = {c["code"]: c["id"] for c in courses}

    # Second pass — build prerequisites
    for c in courses:
        c["prerequisites"] = build_reqnode(c, code_to_id)

    save_json(courses)
    save_csv(courses)

    print(f"[+] Done! Extracted {len(courses)} courses.")


if __name__ == "__main__":
    main()
