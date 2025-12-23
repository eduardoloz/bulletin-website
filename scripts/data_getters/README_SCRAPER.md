# Stony Brook Course Catalog Scraper

## Overview

This scraper collects course data from the Stony Brook University course catalog at https://catalog.stonybrook.edu/

## Features

- Scrapes all course pages from the catalog listing
- Extracts:
  - Course code (e.g., "CSE 214")
  - Course name
  - Full description
  - Credits
  - All additional fields (prerequisites, corequisites, advisory prerequisites, SBC requirements, grading info, etc.)
- Saves raw data to JSON format
- Respectful rate limiting (0.5s delay between requests)
- Pagination support (handles all pages automatically)

## Installation

```bash
# Activate virtual environment
source venv/bin/activate

# Install dependencies
pip install requests beautifulsoup4
```

## Usage

### Test Run (10 courses from first 2 pages)

```bash
python course_scraper.py
```

This is the default configuration for testing. It limits to 10 courses.

### Full Scrape (All Courses)

Edit `course_scraper.py` and change the main section at the bottom:

```python
if __name__ == "__main__":
    # For full scrape, uncomment this:
    courses = scrape_all_courses()

    # And comment out the test version:
    # courses = scrape_all_courses(max_pages=2, max_courses=10)

    save_to_json(courses, OUTPUT_FILE)
```

Or run with custom limits:

```python
# First 5 pages, all courses
courses = scrape_all_courses(max_pages=5)

# All pages, first 100 courses
courses = scrape_all_courses(max_courses=100)
```

## Output

The scraper creates `courses_raw_data.json` with this structure:

```json
[
  {
    "url": "https://catalog.stonybrook.edu/preview_course_nopop.php?catoid=8&coid=8516",
    "title": "AFS 382 - Race, Ethnicity and the Environment",
    "code": "AFS 382",
    "name": "Race, Ethnicity and the Environment",
    "description": "A historical survey of how African Americans...",
    "credits": "3",
    "raw_fields": {
      "prerequisites": "U3 or U4 standing",
      "advisory_preq": "One D.E.C. course",
      "corequisites": "...",
      "sbc": "GLO, SBS+",
      "dec": "J",
      "offered": "Fall and Spring",
      "grading": "...",
      "repeatable": "..."
    },
    "raw_text": "Full raw text from page..."
  },
  ...
]
```

## Data Fields

### Main Fields
- `url`: Direct link to course detail page
- `title`: Full course title (code + name)
- `code`: Course code (e.g., "CSE 214")
- `name`: Course name only
- `description`: Course description paragraph
- `credits`: Credit hours (e.g., "3" or "0-3")

### Raw Fields (varies by course)
All additional fields found on the page are stored in `raw_fields`:
- `prerequisites`: Prerequisite requirements
- `corequisites`: Corequisite requirements
- `advisory_preq`: Advisory prerequisites
- `sbc`: SBC (Stony Brook Curriculum) requirements
- `dec`: DEC (Diversified Education Curriculum) codes
- `offered`: When/how the course is offered
- `grading`: Grading information
- `repeatable`: Repeatability information
- And any other fields found on the page

### Raw Text
- `raw_text`: Full unstructured text from the page (useful for debugging or further parsing)

## Configuration

You can modify these constants in `course_scraper.py`:

```python
BASE_URL = "https://catalog.stonybrook.edu"
CATALOG_URL = f"{BASE_URL}/content.php?catoid=8&navoid=484"
OUTPUT_FILE = "courses_raw_data.json"
DELAY_BETWEEN_REQUESTS = 0.5  # seconds
```

## Next Steps

The scraped data contains raw prerequisite strings (e.g., "CSE 214 and CSE 215" or "U3 or U4 standing").

As mentioned, you'll create a separate Python script to parse these prerequisite strings into your desired schema format for the course planning application.

## Notes

- The scraper is respectful to the server with 0.5s delays between requests
- Full scrape of all courses may take 10-20 minutes depending on catalog size
- If the scraper fails partway through, you can manually extract the already-scraped courses from memory or implement checkpointing
- The catalog URL uses `catoid=8` which represents Spring 2026 - update if you need a different semester
