from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time
import json
import re

SCHOOL_URL = "http://coursecatalog.syr.edu/content.php?catoid=38&navoid=4781"

def setup_driver():
    options = webdriver.ChromeOptions()
    # options.add_argument("--headless")  # Uncomment for headless mode
    return webdriver.Chrome(options=options)

def get_majors(driver):
    driver.get(SCHOOL_URL)
    WebDriverWait(driver, 15).until(
        EC.presence_of_element_located((By.XPATH, "//ul[@class='program-list']"))
    )
    program_elems = driver.find_elements(By.XPATH, "//ul[@class='program-list']//a[contains(@href, 'preview_program.php')]")
    majors = {}
    major_names = [
        "Aerospace Engineering, BS",
        "Biomedical Engineering, BS",
        "Chemical Engineering, BS",
        "Civil Engineering, BS",
        "Computer Engineering, BS",
        "Computer Science, BS",
        "Electrical Engineering, BS",
        "Environmental Engineering, BS",
        "Mechanical Engineering, BS"
    ]
    for elem in program_elems:
        full_name = elem.text.strip()
        url = elem.get_attribute("href")
        if full_name in major_names:
            degree_match = re.search(r'(B\.[A-Za-z]+\.?/?[A-Za-z]*\.?)', full_name)
            degree = degree_match.group(1) if degree_match else "Unknown"
            majors[full_name] = {"url": url, "degree": degree}
    print(f"Found {len(majors)} majors: {list(majors.keys())}")
    return majors

def scrape_requirements(driver, req_url, major_name, degree):
    print(f"Scraping {degree} {major_name} at {req_url}")
    driver.get(req_url)
    time.sleep(2)

    if "404" in driver.title or "not found" in driver.page_source.lower():
        print(f"Invalid page for {major_name}")
        return {"Freshman": [], "Sophomore": [], "Junior": [], "Senior": []}

    courses = []
    try:
        course_sections = driver.find_elements(
            By.XPATH,
            '//div[contains(@class, "acalog-core")]//ul[preceding-sibling::h2 or preceding-sibling::h3]'
        )
        for section in course_sections:
            items = section.find_elements(By.TAG_NAME, "li")
            for item in items:
                txt = item.text.strip()
                matches = re.findall(r'[A-Z]{3}\s?\d{3}', txt)
                for m in matches:
                    if m not in courses:
                        courses.append(m)

        if not courses:
            print(f"No structured lists found for {major_name}, trying broader search")
            core_divs = driver.find_elements(By.XPATH, '//div[contains(@class, "acalog-core")]')
            for div in core_divs:
                txt = div.text.strip()
                matches = re.findall(r'[A-Z]{3}\s?\d{3}', txt)
                for m in matches:
                    if m not in courses:
                        courses.append(m)

        req = {"Freshman": [], "Sophomore": [], "Junior": [], "Senior": []}
        for course in courses:
            try:
                num = int(course[-3:])
                if num < 200:
                    req["Freshman"].append(course)
                elif num < 300:
                    req["Sophomore"].append(course)
                elif num < 400:
                    req["Junior"].append(course)
                else:
                    req["Senior"].append(course)
            except ValueError:
                req["Senior"].append(course)

        print(f"Scraped {len(courses)} courses for {major_name}")
        return req

    except Exception as ex:
        print(f"Error scraping requirements for {major_name}: {ex}")
        return {"Freshman": [], "Sophomore": [], "Junior": [], "Senior": []}

def save_requirements_to_json(data):
    with open("engineering_majors_requirements.json", "w") as f:
        json.dump(data, f, indent=4)
    print("Saved to engineering_majors_requirements.json")

def main():
    driver = setup_driver()
    
    print("Starting at College of Engineering and Computer Science catalog...")
    majors = get_majors(driver)
    
    if not majors:
        print("No majors found, exiting.")
        driver.quit()
        return
    
    all_reqs = {}
    for major_name, info in majors.items():
        degree = info["degree"]
        req_url = info["url"]
        req = scrape_requirements(driver, req_url, major_name, degree)
        if degree not in all_reqs:
            all_reqs[degree] = {}
        all_reqs[degree][major_name] = req
    
    driver.quit()
    save_requirements_to_json(all_reqs)

if __name__ == "__main__":
    main()