from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager
import pickle
import os
import time
import json

LOGIN_URL = "https://myslice.ps.syr.edu/"
ACADEMIC_PROGRESS_URL = "https://cs92prod.ps.syr.edu/psc/CS92PROD/EMPLOYEE/SA/c/NUI_FRAMEWORK.PT_AGSTARTPAGE_NUI.GBL?CONTEXTIDPARAMS=TEMPLATE_ID%3aPTPPNAVCOL&scname=SYRNAV_ACADEMICS_001&PanelCollapsible=Y&PortalActualURL=https%3a%2f%2fcs92prod.ps.syr.edu%2fpsc%2fCS92PROD%2fEMPLOYEE%2fSA%2fc%2fNUI_FRAMEWORK.PT_AGSTARTPAGE_NUI.GBL%3f%26scname%3dSYRNAV_ACADEMICS_001%26PanelCollapsible%3dY&PortalRegistryName=EMPLOYEE&PortalServletURI=https%3a%2f%2fmyslice.ps.syr.edu%2fpsp%2fPTL9PROD%2f&PortalURI=https%3a%2f%2fmyslice.ps.syr.edu%2fpsc%2fPTL9PROD%2f&PortalHostNode=EMPL&NoCrumbs=yes"
COOKIE_FILE = "degree_works_cookies.pkl"

def setup_driver(headless=False):
    """Set up and return a configured Chrome WebDriver"""
    chrome_options = Options()
    chrome_options.add_argument("--start-maximized")
    chrome_options.add_argument("--disable-notifications")
    
    if headless:
        chrome_options.add_argument("--headless")
    
    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=chrome_options)
    return driver

def prepare_login(driver):
    """Navigate to login page but let user handle the login"""
    print("🔑 Opening MySlice login page...")
    driver.get(LOGIN_URL)
    
    # Wait for the login form or main page to appear
    try:
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.ID, "userid")) or
            EC.presence_of_element_located((By.ID, "login"))
        )
    except:
        print("⚠️ Login page elements not found. The page might have changed.")
    
    print("\n===========================================================")
    print("⚠️ MANUAL LOGIN REQUIRED ⚠️")
    print("1. Please log in to your MySlice account")
    print("2. Complete any two-factor authentication if required")
    print("3. Make sure you reach the main MySlice dashboard")
    print("===========================================================\n")
    
    input("🔐 Press Enter ONLY AFTER you have successfully logged in...")
    
    # Save cookies after successful login
    pickle.dump(driver.get_cookies(), open(COOKIE_FILE, "wb"))
    print("✅ Login successful! Cookies saved for future use.")
    return True

def login_with_cookies(driver):
    """Try to login using saved cookies"""
    if not os.path.exists(COOKIE_FILE):
        print("⚠️ No saved cookies found. You'll need to log in manually.")
        return False
    
    print("🔄 Attempting to use saved cookies...")
    driver.get(LOGIN_URL)
    
    # Wait for the page to load before adding cookies
    time.sleep(2)
    
    try:
        cookies = pickle.load(open(COOKIE_FILE, "rb"))
        for cookie in cookies:
            try:
                driver.add_cookie(cookie)
            except Exception as e:
                print(f"⚠️ Error adding cookie: {e}")
                pass
        
        # Refresh to apply cookies
        driver.refresh()
        time.sleep(3)
        
        # Check if login was successful
        if check_login_status(driver):
            print("✅ Successfully logged in with saved cookies!")
            return True
        else:
            print("❌ Cookie login failed. You'll need to log in manually.")
            return False
    except Exception as e:
        print(f"❌ Error loading cookies: {e}")
        return False

def check_login_status(driver):
    """Check if user is logged in to MySlice"""
    try:
        # Look for elements that would indicate successful login
        WebDriverWait(driver, 5).until(
            EC.presence_of_element_located((By.ID, "ptifrmtgtframe")) or
            EC.presence_of_element_located((By.ID, "pthdr2container"))
        )
        return True
    except:
        try:
            # Check if login form is still present
            WebDriverWait(driver, 2).until(
                EC.presence_of_element_located((By.ID, "userid")) or
                EC.presence_of_element_located((By.ID, "login"))
            )
            return False
        except:
            # Not sure, take a screenshot and return status based on current URL
            driver.save_screenshot("login_check.png")
            return "myslice.ps.syr.edu" in driver.current_url and "login" not in driver.current_url

def navigate_to_course_history(driver):
    """Navigate to Course History page via menu clicks with user confirmation"""
    print("\n🔍 Navigating to Course History via menu...")

    try:
        # Ensure we are on the main MySlice page after login
        print("🔍 Assuming we are on the MySlice dashboard...")
        time.sleep(3) # Allow dashboard to fully load

        # 1. Find and click 'Academics' link/menu
        print("🔍 Looking for 'Academics' menu/link...")
        try:
            # Try finding by common link text or IDs - adjust selectors as needed
            academics_link = WebDriverWait(driver, 20).until(
                EC.element_to_be_clickable((By.XPATH, "//a[contains(text(), 'Academics')] | //button[contains(text(), 'Academics')] | //*[@id='SYRNAV_ACADEMICS_001'] | //*[contains(@title,'Academics')]"))
            )
            print("✅ Found 'Academics' link/button, clicking...")
            # Use JavaScript click if regular click fails
            try:
                academics_link.click()
            except Exception as click_err:
                print(f"ℹ️ Regular click failed ({click_err}), trying JavaScript click...")
                driver.execute_script("arguments[0].click();", academics_link)
            time.sleep(5) # Wait for the academics section/sidebar to load
        except Exception as e:
            print(f"❌ Error clicking 'Academics': {e}")
            print("⚠️ Could not find/click 'Academics'. Please navigate manually if needed.")
            driver.save_screenshot("academics_click_error.png")
            # Continue anyway, user might navigate manually

        # Take screenshot after clicking Academics
        driver.save_screenshot("after_academics_click.png")
        print("📸 Saved screenshot after clicking 'Academics'")

        # 2. Find and click 'Course History' in the sidebar/menu
        print("🔍 Looking for 'Course History' link...")
        try:
             # Try switching to the main content iframe first (often needed in PeopleSoft)
            try:
                iframe = WebDriverWait(driver, 10).until(
                    EC.presence_of_element_located((By.ID, "ptifrmtgtframe")) # Common iframe ID
                )
                print("🔍 Switching to main iframe ('ptifrmtgtframe')...")
                driver.switch_to.frame(iframe)
            except:
                 print("ℹ️ Main iframe ('ptifrmtgtframe') not found or already switched. Continuing search in current context...")
                 pass # Continue searching in the current frame/context

            # Now look for Course History link within the current context
            # Adjust selectors as needed based on actual MySlice structure
            course_history_link = WebDriverWait(driver, 20).until(
                 EC.element_to_be_clickable((By.XPATH, "//a[contains(text(), 'Course History')] | //a[contains(@aria-label, 'Course History')] | //span[contains(text(), 'Course History')]/parent::a"))
            )
            print("✅ Found 'Course History' link, clicking...")
            # Use JavaScript click if regular click fails
            try:
                course_history_link.click()
            except Exception as click_err:
                print(f"ℹ️ Regular click failed ({click_err}), trying JavaScript click...")
                driver.execute_script("arguments[0].click();", course_history_link)
            time.sleep(5) # Wait for Course History page to load
        except Exception as e:
            print(f"❌ Error clicking 'Course History': {e}")
            print("⚠️ Could not find/click 'Course History'. Please check the browser and navigate manually if needed.")
            driver.save_screenshot("course_history_click_error.png")
            # Continue anyway, user might navigate manually

        # At this point, we should be on the Course History page

        # Let user confirm we're on the right page
        print("\n===========================================================")
        print("⚠️ VERIFICATION NEEDED ⚠️")
        print("Please confirm that you can see your Course History / Academic Record in the browser.")
        print("If not visible, please navigate to it manually now.")
        print("===========================================================\n")

        input("Press Enter ONLY when your Course History / Academic Record is visible...")

        # Re-check for and switch to iframe if necessary for scraping
        # PeopleSoft often loads content within specific iframes
        try:
            # Switch back to default to search for the correct frame
            driver.switch_to.default_content()
            iframe = WebDriverWait(driver, 10).until(
                 EC.presence_of_element_located((By.ID, "ptifrmtgtframe")) # Re-confirm the main frame
            )
            print("🔍 Switching to content iframe ('ptifrmtgtframe') for scraping...")
            driver.switch_to.frame(iframe)
        except Exception as e:
            print(f"ℹ️ Content iframe ('ptifrmtgtframe') not found or already switched: {e}. Scraping will proceed in the current context.")
            pass

        # Take a final screenshot before scraping starts
        driver.save_screenshot("course_history_ready.png")
        print("📸 Saved screenshot of Course History page, ready to scrape")

        return True
    except Exception as e:
        print(f"❌ Error during navigation: {e}")
        driver.save_screenshot("navigation_error.png")
        return False

def scrape_completed_courses(driver):
    """Scrape completed courses from the academic progress page"""
    print("\n📚 Starting to scrape your academic record...")
    completed_courses = []
    
    try:
        # First try to find and click on any "view all" links to see all courses
        try:
            view_all_links = driver.find_elements(By.XPATH, "//a[contains(text(), 'View All') or contains(text(), 'Show All')]")
            if view_all_links:
                print(f"🔍 Found {len(view_all_links)} 'View All' links, clicking them...")
                for link in view_all_links:
                    link.click()
                    time.sleep(1)
        except Exception as e:
            print(f"ℹ️ View All links note: {e}")
        
        # Take screenshot after expanding all sections
        driver.save_screenshot("expanded_academic_record.png")
        
        # Look for course information in various potential formats
        print("🔍 Searching for course records...")
        
        # Format 1: Table format
        course_rows = driver.find_elements(By.XPATH, "//tr[contains(@id, 'trCLASS_INFO') or contains(@class, 'course-row') or contains(@class, 'PSLEVEL1GRID')]")
        
        if course_rows:
            print(f"✅ Found {len(course_rows)} course rows in table format")
            # Process table rows
            for row in course_rows:
                try:
                    cells = row.find_elements(By.TAG_NAME, "td")
                    if len(cells) >= 3:
                        course_info = cells[0].text
                        code_parts = course_info.split(' ', 1)
                        code = code_parts[0] if len(code_parts) > 0 else "Unknown"
                        name = code_parts[1] if len(code_parts) > 1 else "Unknown"
                        
                        grade = cells[1].text if len(cells) > 1 else "Unknown"
                        credits = cells[2].text if len(cells) > 2 else "Unknown"
                        term = cells[3].text if len(cells) > 3 else "Unknown"
                        
                        completed_courses.append({
                            "code": code.strip(),
                            "name": name.strip(),
                            "grade": grade.strip(),
                            "credits": credits.strip(),
                            "term": term.strip()
                        })
                except Exception as e:
                    print(f"⚠️ Error parsing course row: {e}")
                    continue
        else:
            # Format 2: List or div format
            course_elements = driver.find_elements(By.XPATH, "//div[contains(@class, 'course-item') or contains(@class, 'completed-course')]")
            
            if course_elements:
                print(f"✅ Found {len(course_elements)} course elements in div format")
                # Process div elements
                for element in course_elements:
                    try:
                        course_text = element.text
                        parts = course_text.split('\n')
                        
                        code = "Unknown"
                        name = "Unknown"
                        grade = "Unknown"
                        credits = "Unknown"
                        term = "Unknown"
                        
                        if len(parts) >= 1:
                            code_name_parts = parts[0].split(' ', 1)
                            code = code_name_parts[0]
                            name = code_name_parts[1] if len(code_name_parts) > 1 else "Unknown"
                        
                        for part in parts:
                            if "Grade:" in part:
                                grade = part.replace("Grade:", "").strip()
                            if "Credits:" in part:
                                credits = part.replace("Credits:", "").strip()
                            if "Term:" in part:
                                term = part.replace("Term:", "").strip()
                        
                        completed_courses.append({
                            "code": code.strip(),
                            "name": name.strip(),
                            "grade": grade.strip(),
                            "credits": credits.strip(),
                            "term": term.strip()
                        })
                    except Exception as e:
                        print(f"⚠️ Error parsing course element: {e}")
                        continue
            else:
                # Format 3: Generic approach - look for patterns in content
                print("🔍 Using pattern matching to find courses...")
                
                # Save the page source for debugging
                with open("page_source.html", "w", encoding="utf-8") as f:
                    f.write(driver.page_source)
                print("💾 Saved page source to page_source.html for debugging")
                
                # Look for common course code patterns (e.g., CSE 101, MAT 295)
                import re
                page_text = driver.page_source
                course_matches = re.findall(r'([A-Z]{2,4}\s\d{3}[A-Z]?)\s*[-:]?\s*([^<>\n]+)', page_text)
                
                if course_matches:
                    print(f"✅ Found {len(course_matches)} potential course matches using regex")
                    for code, name in course_matches:
                        grade_match = re.search(r'([A-F][+-]?|P|IP|CR)', name)
                        grade = grade_match.group(0) if grade_match else "Unknown"
                        course_name = name.replace(grade, "").strip()
                        
                        completed_courses.append({
                            "code": code.strip(),
                            "name": course_name.strip(),
                            "grade": grade.strip(),
                            "credits": "Unknown",
                            "term": "Unknown"
                        })
                else:
                    print("⚠️ No course patterns found in the page source")
        
        print(f"✅ Found {len(completed_courses)} completed courses.")
        return completed_courses
    
    except Exception as e:
        print(f"❌ Error scraping courses: {e}")
        driver.save_screenshot("scraping_error.png")
        print("📸 Saved error screenshot for debugging")
        return []

def scrape_user_courses(interactive=True):
    """Main function to scrape user's completed courses"""
    print("\n=== 📚 Syracuse University Academic Record Scraper ===\n")

    # Create a visible browser for interactive mode, headless for automated mode
    driver = setup_driver(headless=not interactive)

    login_successful = False

    try:
        # Force manual login for this run
        print("ℹ️ Forcing manual login to ensure fresh session...")
        login_successful = prepare_login(driver)

        # # First try using saved cookies
        # if os.path.exists(COOKIE_FILE):
        #     login_successful = login_with_cookies(driver)
        #
        # # If cookies didn't work or don't exist, do manual login
        # if not login_successful:
        #     login_successful = prepare_login(driver)

        if login_successful:
            # Navigate to Course History page using menu clicks
            if navigate_to_course_history(driver):
                print("📚 Ready to scrape your academic record...")
                
                # Scrape completed courses
                completed_courses = scrape_completed_courses(driver)
                
                # Save to JSON file
                output_file = "user_completed_courses.json"
                with open(output_file, "w") as f:
                    json.dump(completed_courses, f, indent=2)
                
                print(f"\n💾 Saved {len(completed_courses)} courses to {output_file}")
                return {
                    "success": True,
                    "message": f"Successfully scraped {len(completed_courses)} courses.",
                    "courses": completed_courses
                }
            else:
                print("❌ Failed to navigate to Course History page.")
                return {
                    "success": False,
                    "message": "Failed to navigate to Course History page."
                }
        else:
            print("❌ Failed to log in to MySlice.")
            return {
                "success": False,
                "message": "Failed to log in to MySlice."
            }
    
    except Exception as e:
        print(f"❌ Error: {e}")
        return {
            "success": False,
            "message": f"An error occurred: {str(e)}"
        }
    finally:
        # Take a final screenshot before closing
        try:
            driver.save_screenshot("myslice_final_state.png")
            print("📸 Saved final screenshot for reference")
        except:
            pass
            
        if interactive:
            input("\nPress Enter to close the browser and exit...")
        driver.quit()
        print("✅ Browser closed. Scraping complete.")

def run_scraper_backend():
    """Function to be called from backend API - non-interactive mode"""
    return scrape_user_courses(interactive=False)

if __name__ == "__main__":
    scrape_user_courses(interactive=True)
