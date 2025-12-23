from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
import time
import json

URL = "https://catalog.stonybrook.edu/content.php?catoid=8&navoid=483"

driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()))
driver.get(URL)
time.sleep(1)

# ===== STEP 1: find all major links on page =====
# Majors appear as links to preview_program.php
major_links = driver.find_elements(By.CSS_SELECTOR, 'a[href*="preview_program.php"]')

print(f"Found {len(major_links)} majors/programs")

# To safely click them, collect the hrefs first
hrefs = [link.get_attribute("href") for link in major_links]

# List to store all majors data
majors_data = []

# ===== STEP 2: visit each major and extract title =====
for i, href in enumerate(hrefs, 1):
    print(f"Visiting ({i}/{len(hrefs)}): {href}")
    driver.get(href)
    time.sleep(0.8)  # give time to load

    try:
        # Extract the page title from the element with id="acalog-page-title"
        title_element = driver.find_element(By.ID, "acalog-page-title")
        title = title_element.text.strip()

        # Store the data
        majors_data.append({
            "title": title,
            "url": href
        })

        print(f"  -> Found: {title}")
    except Exception as e:
        print(f"  -> Error extracting title: {e}")

# ===== STEP 3: save to JSON file =====
output_file = "majors_data.json"
with open(output_file, "w", encoding="utf-8") as f:
    json.dump(majors_data, f, indent=2, ensure_ascii=False)

print(f"\nSaved {len(majors_data)} majors to {output_file}")

# End
driver.quit()
