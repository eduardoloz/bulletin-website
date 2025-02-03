import requests
from bs4 import BeautifulSoup
import json
import re

url = "https://www.stonybrook.edu/sb/bulletin/current/courses/browse/byabbreviation/"

response = requests.get(url)

soup = BeautifulSoup(response.content, 'html.parser')
table = soup.find(id="bulletin_course_search_table")

majors = [child.strip().lower() for child in table.stripped_strings][::2]
print(majors)
course_json = json.dumps(majors, indent=4)
with open('majors.json', 'w') as f:
    f.write(course_json)