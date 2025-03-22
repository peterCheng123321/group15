from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import pickle
import os
import time
import csv
import json

LOGIN_URL = "https://myslice.ps.syr.edu/"
CLASS_SEARCH_URL = "https://myslice.ps.syr.edu/psp/PTL9PROD/EMPLOYEE/SA/c/SA_LEARNER_SERVICES.CLASS_SEARCH.GBL?1=1"  
COOKIE_FILE = "cookies.pkl"
REQUIREMENTS_FILE = "engineering_majors_requirements.json"

def save_cookies(driver):
    if not os.path.exists(COOKIE_FILE):
        driver.get(LOGIN_URL)
        input("⚠️ Manually log in and press Enter to save cookies...")
        pickle.dump(driver.get_cookies(), open(COOKIE_FILE, "wb"))
        print("Cookies saved!")

def load_cookies(driver):
    if os.path.exists(COOKIE_FILE):
        driver.get(LOGIN_URL)
        cookies = pickle.load(open(COOKIE_FILE, "rb"))
        for cookie in cookies:
            driver.add_cookie(cookie)
        print("Cookies loaded!")
    else:
        save_cookies(driver)

def load_subject_codes():
    with open(REQUIREMENTS_FILE, 'r') as f:
        data = json.load(f)
    subjects = set()
    for major in data['Unknown'].values():
        for courses in major.values():
            for course in courses:
                subjects.add(course.split()[0])
    return list(subjects)

def scrape_courses():
    driver = webdriver.Chrome()
    load_cookies(driver)

    subjects = load_subject_codes()
    all_courses = []

    for subject in subjects:
        driver.get(CLASS_SEARCH_URL)
        time.sleep(2)

        try:
            iframe = WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.TAG_NAME, "iframe"))
            )
            driver.switch_to.frame(iframe)
        except:
            pass

        subject_input = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.ID, "SSR_CLSRCH_WRK_SUBJECT$0"))
        )
        subject_input.clear()
        subject_input.send_keys(subject)

        search_button = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.ID, "CLASS_SRCH_WRK2_SSR_PB_CLASS_SRCH"))
        )
        search_button.click()

        try:
            ok_button = WebDriverWait(driver, 5).until(
                EC.element_to_be_clickable((By.ID, "#ICSave"))
            )
            ok_button.click()
        except:
            pass

        page = 1
        current_class = ""
        while True:
            try:
                WebDriverWait(driver, 5).until(
                    EC.presence_of_element_located((By.XPATH, '//tr[contains(@id, "trSSR_CLSRCH_MTG1$") or .//td[@class="PAGROUPBOXLABELLEVEL1"]]'))
                )
            except:
                print(f"⚠️ No courses offered for {subject}, skipping to next.")
                break

            rows = driver.find_elements(By.XPATH, '//tr[contains(@id, "trSSR_CLSRCH_MTG1$") or .//td[@class="PAGROUPBOXLABELLEVEL1"]]')
            for row in rows:
                try:
                    header_cells = row.find_elements(By.XPATH, './/td[@class="PAGROUPBOXLABELLEVEL1"]')
                    if header_cells:
                        current_class = header_cells[0].text.split(' - ')[0].strip()
                        continue

                    section_element = row.find_element(By.XPATH, './/a[starts-with(@id,"MTG_CLASSNAME$")]')
                    section = section_element.text
                    days_times = row.find_element(By.XPATH, './/span[starts-with(@id,"MTG_DAYTIME$")]').text
                    room = row.find_element(By.XPATH, './/span[starts-with(@id,"MTG_ROOM$")]').text
                    instructor = row.find_element(By.XPATH, './/span[starts-with(@id,"MTG_INSTR$")]').text
                    meeting_dates = row.find_element(By.XPATH, './/span[starts-with(@id,"MTG_TOPIC$")]').text
                    status_elements = row.find_elements(By.XPATH, './/span[starts-with(@id,"MTG_CLASS_STAT$")]')
                    status = status_elements[0].text if status_elements else "N/A"

                    all_courses.append({
                        "Class": current_class,
                        "Section": section,
                        "Days & Times": days_times,
                        "Room": room,
                        "Instructor": instructor,
                        "Meeting Dates": meeting_dates,
                        "Status": status
                    })
                except Exception as e:
                    print("Row parsing error:", e)
                    continue

            try:
                next_button = driver.find_element(By.XPATH, '//a[contains(@title, "Next Page")]')
                next_button.click()
                page += 1
                time.sleep(2)
            except:
                break

    csv_filename = "courses.csv"
    with open(csv_filename, "w", newline="", encoding="utf-8") as csvfile:
        fieldnames = ["Class", "Section", "Days & Times", "Room", "Instructor", "Meeting Dates", "Status"]
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(all_courses)

    print(f"✅ Scraped {len(all_courses)} courses from all subjects.")
    driver.quit()

if __name__ == "__main__":
    scrape_courses()
