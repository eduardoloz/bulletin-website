import requests
from bs4 import BeautifulSoup

url = "https://www.stonybrook.edu/sb/bulletin/current/academicprograms/cse/courses.php"

response = requests.get(url)

soup = BeautifulSoup(response.content, 'html.parser')

print(soup.prettify())
