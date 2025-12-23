"""
Web scraper for Stony Brook University course catalog.
Scrapes course information from https://catalog.stonybrook.edu/

This scraper:
1. Fetches the main course listing page
2. Extracts all course detail page links
3. For each course, scrapes: title, description, credits, and all additional fields
4. Saves raw data to JSON (prerequisites will be parsed separately)
"""

import requests
from bs4 import BeautifulSoup
import json
import time
import re
from typing import Dict, List, Optional
from urllib.parse import urljoin

# Configuration
BASE_URL = "https://catalog.stonybrook.edu"
# URL with filter parameters to show all courses (100 per page)
CATALOG_URL = f"{BASE_URL}/content.php?catoid=8&navoid=484&filter[item_type]=3&filter[only_active]=1&filter[3]=1&filter[cpage]=1"
OUTPUT_FILE = "courses_raw_data.json"
DELAY_BETWEEN_REQUESTS = 0.5  # seconds - be respectful to the server


def get_course_links(url: str, max_pages: Optional[int] = None) -> List[str]:
    """
    Extract all course preview links from the catalog listing page(s).

    Args:
        url: The catalog listing URL
        max_pages: Maximum number of pages to scrape (None = all pages)

    Returns:
        List of course detail page URLs
    """
    course_links = set()
    page = 1

    while True:
        if max_pages and page > max_pages:
            break

        # Construct paginated URL - replace the cpage parameter in the URL
        if page == 1:
            page_url = url
        else:
            # Replace filter[cpage]=X with filter[cpage]=page
            page_url = re.sub(r'filter\[cpage\]=\d+', f'filter[cpage]={page}', url)

        print(f"\nFetching page {page}...")
        response = requests.get(page_url)
        response.raise_for_status()

        soup = BeautifulSoup(response.text, 'html.parser')

        # Find all course preview links
        links = soup.find_all('a', href=re.compile(r'preview_course_nopop\.php'))

        if not links:
            print(f"  No more courses found on page {page}")
            break

        # Track before and after to see how many new ones we added
        before_count = len(course_links)

        for link in links:
            href = link.get('href')
            if href:
                full_url = urljoin(BASE_URL, href)
                course_links.add(full_url)

        after_count = len(course_links)
        new_courses = after_count - before_count

        print(f"  Found {len(links)} course links on this page")
        print(f"  Added {new_courses} new courses (running total: {after_count})")

        # Check if there's a next page by looking for page number links
        # The current page is in <strong>X</strong>, and next pages are <a>...</a>
        next_page_link = soup.find('a', attrs={'aria-label': f'Page {page + 1}'})

        if not next_page_link:
            print(f"\n  No page {page + 1} link found - reached last page")
            break

        page += 1
        time.sleep(DELAY_BETWEEN_REQUESTS)

    print(f"\n{'='*80}")
    print(f"Total unique course links found: {len(course_links)}")
    print(f"Scraped {page} page(s)")
    print(f"{'='*80}")
    return list(course_links)


def clean_text(text: str) -> str:
    """Clean and normalize text by removing extra whitespace."""
    if not text:
        return ""
    return re.sub(r'\s+', ' ', text).strip()


def scrape_course_details(url: str) -> Dict:
    """
    Scrape detailed information from a single course page.

    Args:
        url: The course detail page URL

    Returns:
        Dictionary containing all course information
    """
    response = requests.get(url)
    response.raise_for_status()

    soup = BeautifulSoup(response.text, 'html.parser')

    course_data = {
        'url': url,
        'title': None,
        'code': None,
        'name': None,
        'description': None,
        'credits': None,
        'raw_fields': {}  # Store all additional fields found
    }

    # Find the main content block
    content_block = soup.find('td', class_='block_content')
    if not content_block:
        # Try alternative structure
        content_block = soup.find('div', class_='courseblock')

    if content_block:
        # Extract course title from h1 tag with id='course_preview_title'
        title_elem = content_block.find('h1', id='course_preview_title')
        if title_elem:
            full_title = clean_text(title_elem.get_text())
            course_data['title'] = full_title

            # Split into code and name (format: "CSE 214 - Data Structures")
            if ' - ' in full_title:
                parts = full_title.split(' - ', 1)
                course_data['code'] = parts[0].strip()
                course_data['name'] = parts[1].strip()

        # Extract description from the paragraph after the hr
        # The structure is: <h1>Title</h1><hr>Description text<br><br><strong>credits</strong>...
        hr_elem = content_block.find('hr')
        if hr_elem and hr_elem.next_sibling:
            # Get text after hr but before the first <br><br><strong>
            desc_text = []
            for sibling in hr_elem.next_siblings:
                if isinstance(sibling, str):
                    text = sibling.strip()
                    if text:
                        desc_text.append(text)
                elif sibling.name == 'br':
                    # Stop at first <br><br> sequence (before credits)
                    if desc_text and desc_text[-1] == '':
                        break
                elif sibling.name == 'strong':
                    # Stop at first <strong> tag (credits, prerequisites, etc.)
                    break
                else:
                    text = clean_text(sibling.get_text())
                    if text and not text.startswith(('Prerequisite', 'Corequisite', 'Advisory', 'SBC', 'DEC', 'Offered')):
                        desc_text.append(text)
                    else:
                        break

            if desc_text:
                course_data['description'] = ' '.join(desc_text).strip()

        # Get all text content for field extraction
        text_content = content_block.get_text()

        # Extract structured fields from <strong> tags
        # The format is: <strong>Field Name:</strong> Field Value<br>

        # Credits
        credit_match = re.search(r'(\d+(?:\.\d+)?(?:-\d+)?)\s*credits?', text_content, re.IGNORECASE)
        if credit_match:
            course_data['credits'] = credit_match.group(1)

        # Find all <strong> tags which contain field labels
        strong_tags = content_block.find_all('strong')
        for strong in strong_tags:
            label = clean_text(strong.get_text())

            # Skip credits field (already extracted)
            if 'credit' in label.lower():
                continue

            # Get the value - it's the text after the <strong> tag until the next <br>
            value_parts = []
            for sibling in strong.next_siblings:
                if sibling.name == 'br':
                    # Stop at <br> unless the next sibling is also content (for multi-line values)
                    if sibling.next_sibling and sibling.next_sibling.name == 'br':
                        break
                    continue
                elif sibling.name == 'strong':
                    # Stop at next <strong> tag (next field)
                    break
                elif isinstance(sibling, str):
                    text = sibling.strip()
                    if text:
                        value_parts.append(text)
                elif sibling.name == 'a':
                    # Include link text
                    value_parts.append(clean_text(sibling.get_text()))

            if value_parts:
                value = ' '.join(value_parts).strip()
                # Normalize field name for storage
                field_key = label.lower().replace(':', '').replace(' ', '_').replace('(s)', 's')
                course_data['raw_fields'][field_key] = value

        # Store the full raw text for debugging/manual parsing if needed
        course_data['raw_text'] = clean_text(text_content)

    return course_data


def scrape_all_courses(max_pages: Optional[int] = None, max_courses: Optional[int] = None) -> List[Dict]:
    """
    Main scraping function - gets all course links and scrapes each one.

    Args:
        max_pages: Maximum number of listing pages to scrape (None = all)
        max_courses: Maximum number of courses to scrape (None = all)

    Returns:
        List of course data dictionaries
    """
    print("=" * 80)
    print("Stony Brook Course Catalog Scraper")
    print("=" * 80)

    # Step 1: Get all course links
    print("\nStep 1: Fetching course links from catalog...")
    course_links = get_course_links(CATALOG_URL, max_pages=max_pages)

    if max_courses:
        course_links = course_links[:max_courses]
        print(f"Limiting to first {max_courses} courses")

    # Step 2: Scrape each course
    print(f"\nStep 2: Scraping {len(course_links)} course detail pages...")
    courses = []

    for i, link in enumerate(course_links, 1):
        try:
            print(f"[{i}/{len(course_links)}] Scraping {link}")
            course_data = scrape_course_details(link)
            courses.append(course_data)

            # Progress indicator
            if course_data['code']:
                print(f"  ✓ {course_data['code']}: {course_data['name']}")

            time.sleep(DELAY_BETWEEN_REQUESTS)

        except Exception as e:
            print(f"  ✗ Error scraping {link}: {e}")
            continue

    print(f"\nSuccessfully scraped {len(courses)} courses")
    return courses


def save_to_json(courses: List[Dict], filename: str):
    """Save course data to JSON file."""
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(courses, f, indent=2, ensure_ascii=False)
    print(f"\nData saved to {filename}")


if __name__ == "__main__":
    # Full scrape - all pages, all courses
    print("Starting FULL scrape of all courses from all pages...")
    print("This may take 10-20 minutes depending on the catalog size.\n")

    courses = scrape_all_courses()

    save_to_json(courses, OUTPUT_FILE)

    # Print summary
    print("\n" + "=" * 80)
    print("SUMMARY")
    print("=" * 80)
    print(f"Total courses scraped: {len(courses)}")
    print(f"Sample course:")
    if courses:
        sample = courses[0]
        print(f"  Code: {sample['code']}")
        print(f"  Name: {sample['name']}")
        print(f"  Credits: {sample['credits']}")
        print(f"  Fields found: {list(sample['raw_fields'].keys())}")
