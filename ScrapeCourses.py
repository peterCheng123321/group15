from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import pickle
import os
import time
import csv

LOGIN_URL = "https://myslice.ps.syr.edu/"  # Replace with login URL
CLASS_SEARCH_URL = "https://myslice.ps.syr.edu/psp/PTL9PROD/EMPLOYEE/SA/c/SA_LEARNER_SERVICES.CLASS_SEARCH.GBL?1=1"  
SUBJECT_CODE = "ECS"  # Replace with subject code
COOKIE_FILE = "cookies.pkl"

def save_cookies(driver):
    # Save cookies after manual login (run this once)
    if not os.path.exists(COOKIE_FILE):
        driver.get(LOGIN_URL)
        input("⚠️ Manually log in and press Enter to save cookies...")
        pickle.dump(driver.get_cookies(), open(COOKIE_FILE, "wb"))
        print("Cookies saved!")

def load_cookies(driver):
    # Load cookies to avoid re-login
    if os.path.exists(COOKIE_FILE):
        driver.get(LOGIN_URL)  # Load domain first
        cookies = pickle.load(open(COOKIE_FILE, "rb"))
        for cookie in cookies:
            driver.add_cookie(cookie)
        print("Cookies loaded!")
    else:
        save_cookies(driver)

def scrape_courses():
    driver = webdriver.Chrome()
    load_cookies(driver)

    # Navigate to Class Search
    driver.get(CLASS_SEARCH_URL)
    time.sleep(2)  # Let the page load

    # Step 2: Switch to the correct iframe if needed
    try:
        iframe = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.TAG_NAME, "iframe"))
        )
        driver.switch_to.frame(iframe)
        print("✅ Switched to iframe successfully.")
    except:
        print("⚠️ No iframe found, proceeding normally.")

    # Step 3: Type subject code and search
    try:
        subject_input = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.ID, "SSR_CLSRCH_WRK_SUBJECT$0"))
        )
        subject_input.click()  # Click before typing if necessary
        subject_input.send_keys(SUBJECT_CODE)
        print(f"✅ Entered subject: {SUBJECT_CODE}")

        search_button = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.ID, "CLASS_SRCH_WRK2_SSR_PB_CLASS_SRCH"))
        )
        search_button.click()
        print("✅ Clicked Search button.")
    except Exception as e:
        print(f"❌ Search failed: {e}")
        driver.quit()
        return

    # Step 4: Handle "50+ results" confirmation
    try:
        ok_button = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.ID, "#ICSave"))
        )
        ok_button.click()
        print("✅ Clicked OK button on 50+ results warning.")
    except:
        pass

    # Scrape all pages
    all_courses = []
    page = 1

    while True:
        print(f"Scraping page {page}...")
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.XPATH, '//tr[contains(@id, "trSSR_CLSRCH_MTG1$")]'))
        )

        rows = driver.find_elements(By.XPATH, '//tr[contains(@id, "trSSR_CLSRCH_MTG1$")]')
        for row in rows:
            try:
                class_nbr = row.find_element(By.XPATH, './/span[starts-with(@id,"MTG_CLASS_NBR$")]').text
                section = row.find_element(By.XPATH, './/a[starts-with(@id,"MTG_CLASSNAME$")]').text
                days_times = row.find_element(By.XPATH, './/span[starts-with(@id,"MTG_DAYTIME$")]').text
                room = row.find_element(By.XPATH, './/span[starts-with(@id,"MTG_ROOM$")]').text
                instructor = row.find_element(By.XPATH, './/span[starts-with(@id,"MTG_INSTR$")]').text
                meeting_dates = row.find_element(By.XPATH, './/span[starts-with(@id,"MTG_TOPIC$")]').text
                try:
                    status = row.find_element(By.XPATH, './/span[starts-with(@id,"MTG_CLASS_STAT$")]').text
                except Exception:
                    status = "N/A"
    
                all_courses.append({
                    "Class": class_nbr,
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
            time.sleep(2)  # Allow next page to load
        except Exception as e:
            print("No more pages or pagination error:", e)
            break

    print(f"✅ Scraped {len(all_courses)} courses.")
    
    # Write output to a CSV file
    csv_filename = "courses.csv"
    fieldnames = ["Class", "Section", "Days & Times", "Room", "Instructor", "Meeting Dates", "Status"]
    try:
        with open(csv_filename, "w", newline="", encoding="utf-8") as csvfile:
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(all_courses)
        print(f"✅ CSV file '{csv_filename}' created successfully.")
    except Exception as e:
        print("❌ Failed to write CSV:", e)

    driver.quit()

if __name__ == "__main__":
    scrape_courses()
