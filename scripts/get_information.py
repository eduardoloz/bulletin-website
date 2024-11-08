import requests
from bs4 import BeautifulSoup
import json
import re

def extract_data(course):
    course_info = {}
    keys = ['corequisite', 'advisory prerequisite', 'prerequisite', 'anti-requisite', 'dec', 'sbc', "partially fulfills"]
    # print(course.find_all(recursive=False)[3].get_text(strip=True))
    block = [child.strip() for child in course.stripped_strings]

    # Extracting course title
    course_title = block[0].replace('\u00a0', ' ')
    course_info['title'] = course_title

    # Extracting course description
    course_description = block[1]
    course_info['description'] = course_description

    # Extracting prerequisites
    # prerequisites = course.find_all('p')[1].get_text(strip=True)
    # course_info['prerequisites'] = prerequisites.replace('Prerequisites:', '').strip()

    # # Extracting credits
    # credits = course.find_all('p')[2].get_text(strip=True)
    # course_info['credits'] = credits

    i = 2
    # print(block)
    while True:
        info = block[i]
        # print(info)
        index = info.find(':')
        if index == -1:#if the info is not in the form of key:value, meaning it's at the end with credits
            break
        lead = info[:index]
        # print("lead", lead + ".")
        # print()
        # if lead == "DEC":
        #     i+=1
        #     course_info[lead] = block[i]
        # elif lead == "SBC":
        #     i+=1
        #     course_info[lead] = block[i]
        # else:
        pattern = r'(' + '|'.join(keys) + r'):\s*([^:]+?)(?=(?:' + '|'.join(keys) + r')|$)'
        matches = re.findall(pattern, block[i], re.IGNORECASE)
        if len(matches):
            result = [(match[0].strip(), match[1].strip()) for match in matches]
            for lead, rest in result:
                for key in keys:
                    if key in lead.lower():
                        course_info[key] = rest
                        break
        else:
            for key in keys:
                if key in lead.lower():
                    if key == "sbc" or key == "partially fulfills":
                        i+=1
                        string = block[i]
                        i+=1
                        while (block[i]) == ",":
                            i+=1
                            string += ", " + block[i]
                            i+=1
                        else:
                            i-=1
                        course_info[key] = string
                        break
                    if block[i].endswith(':'):
                        i+=1
                        course_info[key] = block[i]
                    else:
                        rest = info[index + 1:]
                        course_info[key] = rest
                    break
        i+=1
    credits = block[i]
    course_info['credits'] = credits
    
    # Append the course data to the list
    course_data.append(course_info)
    # print(course_info)

if __name__ == "__main__":
    majors = []
    with open('majors.json', 'r') as f:
        majors = json.load(f)
    print(majors)
    for major in majors:
        url = f"https://www.stonybrook.edu/sb/bulletin/current/courses/{major}/"
        response = requests.get(url)

        soup = BeautifulSoup(response.content, 'html.parser')
        courses = soup.find_all(class_="course")
        # print(courses)
        course_data = []

        # Loop through each course element
        for course in courses:
            # Extract the text or other relevant data from the course element
            # course_title = course.find('h3').get_text(strip=True).replace('\u00a0', ' ')
            # if "316" in course_title:
            extract_data(course)
            # pass
        course_json = json.dumps(course_data, indent=4)
        with open(f'{major}.json', 'w') as f:
            f.write(course_json)