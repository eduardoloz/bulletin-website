"""
Scrape all RateMyProfessors reviews for a single professor and
save them to a CSV in one go – fast (uses BeautifulSoup, not
per-element Selenium calls).

Requires:
    pip install selenium==4.* beautifulsoup4 pandas
    -- plus the matching ChromeDriver on your PATH
"""

from __future__ import annotations
import re, time, csv, sys
from pathlib import Path
from typing import List, Dict

import pandas as pd
from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys


##############################################################################
# ── Selenium helpers ────────────────────────────────────────────────────────

def make_driver(headless: bool = True) -> webdriver.Chrome:
    opts            = Options()
    opts.add_argument("--disable-gpu")
    opts.add_argument("--disable-extensions")
    opts.add_argument("--start-maximized")
    opts.add_argument("--ignore-certificate-errors")
    if headless:
        # use plain headless (stable); "--headless=new" can be flaky
        opts.add_argument("--headless")
    return webdriver.Chrome(options=opts)


def fully_expand_reviews(driver: webdriver.Chrome,
                         max_clicks: int = 60,
                         wait: float = 2.0) -> None:
    """
    Click “Load More Ratings” until it's gone or `max_clicks` reached.
    """
    btn_xpath = "//button[contains(.,'Load More Ratings')]"
    clicks    = 0
    t0        = time.perf_counter()

    print("▶️  Expanding reviews …", flush=True)
    while clicks < max_clicks:
        try:
            btn = driver.find_element(By.XPATH, btn_xpath)
        except Exception:
            break  # no more button – we're done

        btn.location_once_scrolled_into_view
        btn.click()
        clicks += 1
        print(f"🔄 Load-More click #{clicks:<2} "
              f"( {int(time.perf_counter()-t0)} s elapsed )", flush=True)
        time.sleep(wait)           # let new reviews render

    print(f"✅ Finished expanding after {clicks} click(s) "
          f"in {int(time.perf_counter()-t0)} s\n", flush=True)


##############################################################################
# ── BeautifulSoup parsing ───────────────────────────────────────────────────

COURSE_RE = re.compile(r"\b[A-Z]{2,4}\d{3}\b")

def text_or(tag, default="N/A"):
    return tag.get_text(strip=True) if tag else default


def parse_one_block(block) -> Dict[str, str]:
    """
    Convert one <div class="Rating__RatingBody-…"> block to dict.
    """
    # Search for course code anywhere in the block text
    course_match = COURSE_RE.search(block.get_text(" ", strip=True))
    course       = course_match.group(0) if course_match else "N/A"

    # date
    date_tag = block.select_one("div.TimeStamp__StyledTimeStamp-sc-9q2r30-0")
    date     = text_or(date_tag)

    # quality & difficulty numbers
    nums = [t.get_text(strip=True)
            for t in block.select("div.CardNumRating__CardNumRatingNumber-sc-17t4b9u-2")]
    quality, difficulty = (nums + ["N/A", "N/A"])[:2]

    # meta items (For Credit, Grade, etc.)
    meta_items = [text_or(m) for m in
                  block.select("div.MetaItem__StyledMetaItem-y0ixml-0")]
    meta = "; ".join(meta_items)

    # comment
    comment = text_or(block.select_one("div.Comments__StyledComments-dzzyvm-0"))

    # tags
    tags = ", ".join(t.get_text(strip=True)
                     for t in block.select("span.Tag-bs9vf4-0"))

    return {
        "Course": course,
        "Date": date,
        "Quality": quality,
        "Difficulty": difficulty,
        "Meta": meta,
        "Comment": comment,
        "Tags": tags,
    }


def parse_reviews_fast(driver: webdriver.Chrome) -> List[Dict[str, str]]:
    """
    Grab driver.page_source once, parse all review blocks with BS4.
    """
    soup = BeautifulSoup(driver.page_source, "html.parser")
    blocks = soup.select("div.Rating__RatingBody-sc-1rhvpxz-0")
    print(f"📝 Parsing {len(blocks)} review block(s)…", flush=True)
    return [parse_one_block(b) for b in blocks]


##############################################################################
# ── main scraper ────────────────────────────────────────────────────────────

def scrape_rmp(prof_url: str,
               output_csv: str | Path = "reviews.csv",
               headless: bool = True) -> pd.DataFrame:

    drv = make_driver(headless)
    try:
        drv.get(prof_url)
        time.sleep(3)                       # initial load

        fully_expand_reviews(drv)           # click “Load More …”
        reviews = parse_reviews_fast(drv)   # BS4 parsing

        df = pd.DataFrame(reviews)
        df.to_csv(output_csv, index=False, quoting=csv.QUOTE_ALL)
        print(f"💾 Saved {len(df):,} review(s) → {output_csv}")
        return df

    finally:
        drv.quit()


##############################################################################
# ── run ─────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    PROF_URL   = "https://www.ratemyprofessors.com/professor/2393927"  # ← change
    OUTPUT_CSV = "rmp_reviews_fodor.csv"

    scrape_rmp(PROF_URL, OUTPUT_CSV, headless=True)
