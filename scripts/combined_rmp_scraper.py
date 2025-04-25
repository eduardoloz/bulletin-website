#!/usr/bin/env python3
"""
batch_rmp_scraper.py
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Scrape ≤ 50 RateMyProfessors reviews for every professor
listed in professors.csv and write one JSON file.

* Re-uses the BeautifulSoup parsing & scrolling logic
  from your working single-professor script.
* Auto-installs the correct ChromeDriver.
* Shows elapsed HH:MM:SS after each professor.
"""

from __future__ import annotations
import csv, json, sys, time, concurrent.futures, re
from datetime import timedelta
from pathlib import Path
from typing import List, Dict

import chromedriver_autoinstaller          # auto-match driver ↔ Chrome
import pandas as pd
from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys

# ───────── Config ─────────
MAX_REVIEWS_EACH = 50
MAX_WORKERS      = 4
SCROLL_PAUSE     = 1.25
CSV_IN           = "professors.csv"
JSON_OUT         = "all_reviews.json"
# ──────────────────────────


# ───────── Selenium helpers (unchanged) ─────────
def make_driver(headless: bool = True) -> webdriver.Chrome:
    chromedriver_autoinstaller.install()

    opts = Options()
    if headless:
        opts.add_argument("--headless=new")
    opts.add_argument("--disable-gpu")
    opts.add_argument("--disable-extensions")
    opts.add_argument("--ignore-certificate-errors")
    opts.add_argument("--window-size=1280,2000")
    opts.add_experimental_option("excludeSwitches", ["enable-logging"])
    return webdriver.Chrome(options=opts)


def fully_expand_reviews(driver: webdriver.Chrome,
                         max_clicks: int = 60,
                         wait: float = SCROLL_PAUSE) -> None:
    btn_xpath = "//button[contains(.,'Load More Ratings')]"
    clicks, last_new = 0, time.perf_counter()

    while clicks < max_clicks:
        try:
            btn = driver.find_element(By.XPATH, btn_xpath)
        except Exception:
            break
        btn.location_once_scrolled_into_view
        btn.click()
        clicks += 1
        time.sleep(wait)
        # stop if the last click didn't add new height for >10 s
        if time.perf_counter() - last_new > 10:
            break
        last_new = time.perf_counter()


# ───────── BeautifulSoup parsing (unchanged) ─────────
COURSE_RE = re.compile(r"\b[A-Z]{2,4}\d{3}\b")

def text_or(tag, default="N/A"):
    return tag.get_text(strip=True) if tag else default

def parse_one_block(block) -> Dict[str, str]:
    course_match = COURSE_RE.search(block.get_text(" ", strip=True))
    course       = course_match.group(0) if course_match else "N/A"

    date     = text_or(block.select_one("div.TimeStamp__StyledTimeStamp-sc-9q2r30-0"))
    nums     = [t.get_text(strip=True) for t in
                block.select("div.CardNumRating__CardNumRatingNumber-sc-17t4b9u-2")]
    quality, difficulty = (nums + ["N/A", "N/A"])[:2]

    meta  = "; ".join(text_or(m) for m in
                      block.select("div.MetaItem__StyledMetaItem-y0ixml-0"))
    comm  = text_or(block.select_one("div.Comments__StyledComments-dzzyvm-0"))
    tags  = ", ".join(t.get_text(strip=True)
                      for t in block.select("span.Tag-bs9vf4-0"))

    return {"Course": course, "Date": date,
            "Quality": quality, "Difficulty": difficulty,
            "Meta": meta, "Comment": comm, "Tags": tags}

def parse_reviews_page(driver) -> List[Dict[str, str]]:
    soup   = BeautifulSoup(driver.page_source, "html.parser")
    blocks = soup.select("div.Rating__RatingBody-sc-1rhvpxz-0")
    return [parse_one_block(b) for b in blocks[:MAX_REVIEWS_EACH]]


# ───────── Core scraping helper ─────────
def scrape_professor(url: str, headless=True) -> List[Dict[str, str]]:
    drv = make_driver(headless)
    try:
        drv.get(url)
        time.sleep(2)
        fully_expand_reviews(drv)
        return parse_reviews_page(drv)
    finally:
        drv.quit()


# ───────── Batch driver ─────────
def scrape_one(row: Dict[str, str]) -> List[Dict[str, str]]:
    reviews = scrape_professor(row["url"])
    for r in reviews:
        r.update({"prof_id": row["id"], "prof_name": row["name"]})
    return reviews


def main(in_csv=CSV_IN, out_json=JSON_OUT):
    with open(in_csv, newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    if not rows:
        sys.exit(f"❌  '{in_csv}' is empty.")

    print(f"📋  {len(rows)} professors – starting")
    t0 = time.perf_counter()

    all_reviews: List[Dict[str, str]] = []
    with concurrent.futures.ProcessPoolExecutor(max_workers=MAX_WORKERS) as pool:
        for i, reviews in enumerate(pool.map(scrape_one, rows), 1):
            all_reviews.extend(reviews)
            elapsed = timedelta(seconds=int(time.perf_counter() - t0))
            print(f"[{elapsed}] ✔ {i:3}/{len(rows)}  {rows[i-1]['name']:<25}"
                  f"({len(reviews):>2} reviews)")

    Path(out_json).write_text(json.dumps(all_reviews,
                                         ensure_ascii=False,
                                         indent=2),
                              encoding="utf-8")
    total = timedelta(seconds=int(time.perf_counter() - t0))
    print(f"\n🏁  Saved {len(all_reviews)} reviews → {out_json} in {total}")


if __name__ == "__main__":
    in_arg  = sys.argv[1] if len(sys.argv) > 1 else CSV_IN
    out_arg = sys.argv[2] if len(sys.argv) > 2 else JSON_OUT
    main(in_arg, out_arg)
