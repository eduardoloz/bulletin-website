import requests
from bs4 import BeautifulSoup
from course import Course

url = "https://www.stonybrook.edu/sb/bulletin/current/academicprograms/cse/courses.php"

response = requests.get(url)

soup = BeautifulSoup(response.content, 'html.parser')

#print(soup.prettify())

courses = []

course_entries = soup.find_all("div", class_="course")
for entry in course_entries:
    course_id = entry.get("id", "N/A")
    name = entry.find("h3").get_text(strip=True)
    description = entry.find("p").get_text(strip=True)
    prereqs_tag = entry.find("i")
    prereqs = prereqs_tag.next_sibling.strip() if prereqs_tag and prereqs_tag.next_sibling else "None"
    course = Course(course_id, name, description, prereqs)
    courses.append(course)

for course in courses:
    print(course)

