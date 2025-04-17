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
import re
from selenium.common.exceptions import TimeoutException, NoSuchFrameException

LOGIN_URL = "https://myslice.ps.syr.edu/"
ACADEMIC_PROGRESS_URL = "https://cs92prod.ps.syr.edu/psc/CS92PROD/EMPLOYEE/SA/c/NUI_FRAMEWORK.PT_AGSTARTPAGE_NUI.GBL?CONTEXTIDPARAMS=TEMPLATE_ID%3aPTPPNAVCOL&scname=SYRNAV_ACADEMICS_001&PanelCollapsible=Y&PortalActualURL=https%3a%2f%2fcs92prod.ps.syr.edu%2fpsc%2fCS92PROD%2fEMPLOYEE%2fSA%2fc%2fNUI_FRAMEWORK.PT_AGSTARTPAGE_NUI.GBL%3f%26scname%3dSYRNAV_ACADEMICS_001%26PanelCollapsible%3dY&PortalRegistryName=EMPLOYEE&PortalServletURI=https%3a%2f%2fmyslice.ps.syr.edu%2fpsp%2fPTL9PROD%2f&PortalURI=https%3a%2f%2fmyslice.ps.syr.edu%2fpsc%2fPTL9PROD%2f&PortalHostNode=EMPL&NoCrumbs=yes"
COOKIE_FILE = "degree_works_cookies.pkl"

def setup_driver(headless=False):
    """Set up and return a configured Chrome WebDriver"""
    chrome_options = Options()
    chrome_options.add_argument("--start-maximized")
    chrome_options.add_argument("--disable-notifications")
    chrome_options.add_argument("--disable-popup-blocking")
    chrome_options.add_argument("--disable-infobars")
    chrome_options.add_argument("--disable-session-crashed-bubble")
    
    if headless:
        chrome_options.add_argument("--headless")
    
    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=chrome_options)
    return driver

def prepare_login(driver):
    """Navigate to login page and guide users through login and 2FA verification"""
    print("🔑 Opening MySlice login page...")
    driver.get(LOGIN_URL)
    
    # Wait for the initial landing page elements or SAML redirect
    try:
        print("⏳ Waiting for initial MySlice page or SAML redirect...")
        WebDriverWait(driver, 20).until(
            lambda d: "saml" in d.current_url.lower() or 
                      d.find_element(By.XPATH, "//button[contains(text(), 'Student - Faculty - Staff')]").is_displayed()
        )
        print("✅ Initial MySlice page loaded or SAML redirect detected.")

        if "saml" in driver.current_url.lower():
            print("🔐 SAML authentication page detected directly.")
            print("   Please complete the login process (NetID, password, 2FA).")
            input("--> Press Enter AFTER you have completed the SAML login and see the MySlice dashboard...")
        else:
            # Found the initial landing page with login buttons
            print("\n===========================================================")
            print("⚠️ MANUAL LOGIN REQUIRED ⚠️")
            print("1. Click the 'Student - Faculty - Staff' button on the page.")
            print("2. Complete the login process (NetID, password, 2FA).")
            print("3. Wait until you are fully logged in and can see the MySlice dashboard.")
            print("===========================================================\n")
            input("--> Press Enter ONLY AFTER you have successfully logged in and see the MySlice dashboard...")

    except Exception as e:
        print(f"⚠️ Error waiting for initial MySlice page elements or SAML redirect: {e}")
        print("   The page structure might have changed, or the page didn't load correctly.")
        driver.save_screenshot("initial_page_error.png")
        return False # Indicate login preparation failed

    # Take a screenshot to verify dashboard state after user confirmation
    print("📸 Taking screenshot of expected dashboard state...")
    driver.save_screenshot("login_completed_dashboard.png")
    
    # Check login status again to confirm we're likely on the dashboard
    print("🕵️ Verifying login status...")
    if not check_login_status(driver):
        print("⚠️ Login status check failed. May not be on the dashboard.")
        print("   Please ensure you pressed Enter only *after* seeing the MySlice dashboard.")
        driver.save_screenshot("login_status_check_failed.png")
        # Consider returning False for stricter error handling
        # return False 
        input("   Press Enter again if you are definitely on the dashboard, otherwise stop the script.")
        # Re-check status after second confirmation if needed
        if not check_login_status(driver):
             print("❌ Login status check failed again. Aborting.")
             return False


    # Save cookies after successful login confirmation
    try:
        pickle.dump(driver.get_cookies(), open(COOKIE_FILE, "wb"))
        print("✅ Login confirmed! Cookies saved for future use.")
        return True
    except Exception as e:
        print(f"⚠️ Error saving cookies: {e}")
        # Decide if failure to save cookies should halt the process
        return False # Example: fail if cookies can't be saved

def login_with_cookies(driver):
    """Try to login using saved cookies, with handling for potential 2FA prompts"""
    if not os.path.exists(COOKIE_FILE):
        print("⚠️ No saved cookies found. You'll need to log in manually.")
        return False
    
    print("🔄 Attempting to use saved cookies...")
    driver.get(LOGIN_URL)
    
    # Clear all existing cookies first to avoid domain conflicts
    driver.delete_all_cookies()
    
    # Wait for the page to load before adding cookies
    time.sleep(2)
    
    try:
        cookies = pickle.load(open(COOKIE_FILE, "rb"))
        for cookie in cookies:
            try:
                # Update cookie domain to match current domain
                cookie['domain'] = '.ps.syr.edu'  # Set to the root domain
                driver.add_cookie(cookie)
            except Exception as e:
                print(f"⚠️ Error adding cookie: {e}")
                # If cookies fail, delete the cookie file and force fresh login
                os.remove(COOKIE_FILE)
                print("⚠️ Invalid cookies detected. Cookie file deleted. Manual login required.")
                return False
        
        # Refresh to apply cookies
        driver.refresh()
        time.sleep(3)
        
        # Check if we're on a SAML page
        if "saml" in driver.current_url.lower():
            print("🔐 SAML authentication required. Please complete the login process...")
            input("Press Enter AFTER you have completed the SAML login and 2FA...")
            return True
        
        # Check if login was successful
        if check_login_status(driver):
            print("✅ Successfully logged in with saved cookies!")
            return True
        else:
            # Check if we're on a 2FA page
            try:
                two_factor_elements = driver.find_elements(By.XPATH, 
                    "//*[contains(text(), 'verification') or contains(text(), 'Duo') or " +
                    "contains(text(), 'two-factor') or contains(text(), 'security code') or " +
                    "contains(text(), 'authentication') or contains(text(), '2FA')]")
                
                if two_factor_elements and len(two_factor_elements) > 0:
                    print("🔐 2FA verification required even with cookies. This is normal for security.")
                    print("Please complete the 2FA verification when prompted.")
                    driver.save_screenshot("cookie_login_2fa.png")
                    
                    # Wait for user to complete 2FA
                    input("🔐 Press Enter ONLY AFTER you have completed 2FA verification...")
                    
                    # Check login status again after 2FA
                    if check_login_status(driver):
                        print("✅ Successfully logged in after completing 2FA!")
                        # Update cookies since they now include post-2FA state
                        pickle.dump(driver.get_cookies(), open(COOKIE_FILE, "wb"))
                        print("✅ Updated cookies saved for future use.")
                        return True
            except Exception as e:
                print(f"ℹ️ 2FA check during cookie login: {e}")
            
            print("❌ Cookie login failed. You'll need to log in manually.")
            return False
    except Exception as e:
        print(f"❌ Error loading cookies: {e}")
        # If there's any error with cookies, delete the file and force fresh login
        try:
            os.remove(COOKIE_FILE)
            print("⚠️ Invalid cookies detected. Cookie file deleted. Manual login required.")
        except:
            pass
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

def check_for_peoplesoft_error(driver):
    """Check for common PeopleSoft error messages"""
    error_messages = [
        "An error has occurred that has stopped this transaction from continuing",
        "Your session has timed out",
        "Session expired",
        "Invalid session",
        "Please log in again"
    ]
    
    for error_msg in error_messages:
        try:
            if error_msg in driver.page_source:
                print(f"⚠️ PeopleSoft error detected: {error_msg}")
                driver.save_screenshot(f"peoplesoft_error_{int(time.time())}.png")
                return True
        except:
            pass
    return False

def handle_session_timeout(driver):
    """Handle session timeout by attempting to refresh and re-authenticate"""
    print("🔄 Attempting to handle session timeout...")
    try:
        # Try to refresh the page first
        driver.refresh()
        time.sleep(3)
        
        # Check if we're back to the login page
        if "login" in driver.current_url.lower():
            print("🔐 Session timeout detected. Please log in again...")
            return prepare_login(driver)
        
        # Check if we're on a SAML page
        if "saml" in driver.current_url.lower():
            print("🔐 SAML authentication required. Please complete the login process...")
            input("Press Enter AFTER you have completed the SAML login and 2FA...")
            return True
            
        # If we're still on an error page, try going back to the main page
        if check_for_peoplesoft_error(driver):
            print("🔄 Navigating back to main page...")
            driver.get(LOGIN_URL)
            time.sleep(3)
            return prepare_login(driver)
            
        return True
    except Exception as e:
        print(f"❌ Error handling session timeout: {e}")
        return False

def navigate_to_course_history(driver):
    """Navigate to Course History page via the Academics tile flow"""
    print("\n🔍 Navigating to Course History via the Academics tile...")

    try:
        # Ensure we are on the main MySlice page after login
        print("🔍 Ensuring we are on the MySlice dashboard...")
        time.sleep(5)  # Wait for dashboard to fully load

        # Check for any PeopleSoft errors
        if check_for_peoplesoft_error(driver):
            if not handle_session_timeout(driver):
                return False

        # Take a screenshot of the current state
        driver.save_screenshot("before_navigation.png")
        
        # 1. Find and click 'Academics' tile
        print("🔍 Looking for 'Academics' tile...")
        try:
            # Use the exact ID for Academics tile
            academics_tile = WebDriverWait(driver, 10).until(
                EC.element_to_be_clickable((By.ID, "win0divPTNUI_LAND_REC_GROUPLET$0"))
            )
            print("✅ Found 'Academics' tile, clicking...")
            try:
                driver.execute_script("arguments[0].scrollIntoView(true);", academics_tile)
                time.sleep(1)
                driver.execute_script("arguments[0].click();", academics_tile)
            except Exception as click_err:
                print(f"ℹ️ JavaScript click failed ({click_err}), trying regular click...")
                academics_tile.click()
            time.sleep(8) # Increased wait time after clicking Academics
            
            # Check for errors after clicking
            if check_for_peoplesoft_error(driver):
                if not handle_session_timeout(driver):
                    return False
        except Exception as e:
            print(f"❌ Error clicking 'Academics' tile: {e}")
            driver.save_screenshot("academics_click_error.png")
            return False

        # Take screenshot after clicking Academics
        driver.save_screenshot("after_academics_click.png")
        print("📸 Saved screenshot after clicking 'Academics'")

        # 2. Find and click 'Course History' link (potentially in a sidebar)
        print("🔍 Looking for 'Course History' link (potentially in a sidebar)...")
        try:
            course_history_link_id = "win9divPTGP_STEP_DVW_PTGP_STEP_BTN_GB$1"
            print(f"   Waiting up to 20 seconds for Course History link (ID: {course_history_link_id}) to be PRESENT in the DOM...")
            # First, wait for the element to exist in the DOM, even if not visible/clickable yet
            WebDriverWait(driver, 20).until(
                EC.presence_of_element_located((By.ID, course_history_link_id))
            )
            print("✅ Course History link is present in the DOM.")

            print(f"   Now waiting up to 15 seconds for Course History link (ID: {course_history_link_id}) to be CLICKABLE...")
            # Then, wait for the identified element to become clickable
            course_history_link = WebDriverWait(driver, 15).until(
                EC.element_to_be_clickable((By.ID, course_history_link_id))
            )
            print("✅ Found 'Course History' link and it's clickable, proceeding to click...")
            try:
                # Try scrolling into view first, as it might be off-screen in the sidebar
                driver.execute_script("arguments[0].scrollIntoView(true);", course_history_link)
                time.sleep(1)
                driver.execute_script("arguments[0].click();", course_history_link)
            except Exception as click_err:
                print(f"ℹ️ JavaScript click failed ({click_err}), trying regular click...")
                course_history_link.click()
            time.sleep(5)
            
            # Check for errors after clicking
            if check_for_peoplesoft_error(driver):
                if not handle_session_timeout(driver):
                    return False
        except Exception as e:
            print(f"❌ Error clicking 'Course History' link: {e}")
            driver.save_screenshot("course_history_click_error.png")
            return False

        # Take a final screenshot before scraping starts
        driver.save_screenshot("course_history_ready.png")
        print("📸 Saved screenshot of Course History page, ready to scrape")

        return True
    except Exception as e:
        print(f"❌ Error during navigation: {e}")
        driver.save_screenshot("navigation_error.png")
        return False

def scrape_completed_courses(driver):
    """Scrape completed courses from within the main content iframe."""
    courses = []
    seen_courses = set()  # To avoid duplicates
    iframe_id = "ptifrmtgtframe" # Common ID for PeopleSoft content iframe

    try:
        # 1. Switch to the iframe
        print(f"\n🔍 Switching to iframe: {iframe_id}")
        WebDriverWait(driver, 15).until(
            EC.frame_to_be_available_and_switch_to_it((By.ID, iframe_id))
        )
        print(f"✅ Switched to iframe: {iframe_id}")
        time.sleep(2) # Allow content within iframe to load
        driver.save_screenshot("iframe_content.png")

        # 2. Wait for course elements within the iframe
        course_name_selector = 'span[id^="CRSE_NAME$"]'
        print(f"⏳ Waiting for course name elements ({course_name_selector}) within iframe...")
        WebDriverWait(driver, 20).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, course_name_selector))
        )
        print("✅ Found course name elements within iframe.")
        
        # 3. Get all course name elements
        course_name_elements = driver.find_elements(By.CSS_SELECTOR, course_name_selector)
        print(f"ℹ️ Found {len(course_name_elements)} potential course name elements.")
        
        # 4. Iterate through elements and extract data
        for i, course_name_element in enumerate(course_name_elements):
            course_info = {}
            try:
                # Extract course name and ID suffix
                course_name_id = course_name_element.get_attribute('id')
                suffix = course_name_id.split('$')[-1] # Get the numerical index like '0', '1', etc.
                course_info['course_code_name'] = course_name_element.text.strip()

                # Construct potential IDs for related fields using the suffix
                # --- These selectors are common patterns, adjust if needed --- 
                grade_selectors = [
                    f'span[id^="GRADE_TBL_GRADE_INPUT${suffix}"]',
                    f'span[id^="CRSE_GRADE_OFF${suffix}"]'
                ]
                credits_selectors = [
                    f'span[id^="STDNT_ENRL_UNITS_TAKEN${suffix}"]',
                    f'span[id^="UNITS_TAKEN${suffix}"]'
                ]
                term_selectors = [
                    f'span[id^="TERM_TBL_DESCR${suffix}"]'
                ]
                # --- End of selector patterns --- 

                # Helper function to find element text using a list of selectors
                def find_element_text(selectors):
                    for selector in selectors:
                        try:
                            element = driver.find_element(By.CSS_SELECTOR, selector)
                            return element.text.strip()
                        except:
                            continue # Try next selector
                    return 'Unknown' # Not found with any selector

                # Extract Grade, Credits, Term
                course_info['grade'] = find_element_text(grade_selectors)
                course_info['credits'] = find_element_text(credits_selectors)
                course_info['term'] = find_element_text(term_selectors)
                
                # Basic parsing of course code (assuming format like 'SUBJ 123')
                match = re.match(r"([A-Za-z]+)\s*(\d+)", course_info['course_code_name'])
                if match:
                    course_info['course_code'] = f"{match.group(1)} {match.group(2)}"
                    course_info['course_name'] = course_info['course_code_name'] # Keep full name for now
                else:
                    course_info['course_code'] = course_info['course_code_name'] # Fallback
                    course_info['course_name'] = course_info['course_code_name']

                # Only add if we have a course code and haven't seen it before
                course_identifier = course_info['course_code'] + '_' + course_info['term'] # Use code+term as unique ID
                if course_info['course_code'] and course_identifier not in seen_courses:
                    print(f"  -> Scraping: {course_info}")
                    courses.append(course_info)
                    seen_courses.add(course_identifier)
                    
                # Screenshot for debugging every 10 courses
                if (i + 1) % 10 == 0:
                    driver.save_screenshot(f"scraping_course_{i+1}_in_iframe.png")
                    
            except Exception as e:
                print(f"⚠️ Error processing potential course element {i} (ID: {course_name_id}): {e}")
                driver.save_screenshot(f"scraping_error_element_{i}.png")
                continue # Skip to next course name element
                
    except TimeoutException:
        print(f"❌ Timeout waiting for iframe '{iframe_id}' or course elements within it.")
        driver.save_screenshot("iframe_timeout_error.png")
    except NoSuchFrameException:
        print(f"❌ Iframe with ID '{iframe_id}' not found.")
        driver.save_screenshot("iframe_not_found_error.png")
    except Exception as e:
        print(f"❌ An unexpected error occurred during scraping: {e}")
        driver.save_screenshot("scraping_unexpected_error.png")
    finally:
        # 5. Switch back to the default content IMPORTANT!
        try:
            driver.switch_to.default_content()
            print("✅ Switched back to default content.")
        except Exception as e:
            print(f"⚠️ Error switching back to default content: {e}")
            
    # Save results (even if partial)
    print(f"\n✅ Scraping finished. Found {len(courses)} unique courses.")
    with open("scraped_courses_output.json", "w") as f:
        json.dump(courses, f, indent=2)
        print("💾 Scraped data saved to scraped_courses_output.json")
        
    return courses

def scrape_user_courses(interactive=True):
    """Main function to scrape user's completed courses with improved 2FA handling"""
    print("\n=== 📚 Syracuse University Academic Record Scraper ===\n")

    # Create a visible browser for interactive mode, headless for automated mode
    driver = setup_driver(headless=not interactive)

    login_successful = False

    try:
        # First try using saved cookies
        if os.path.exists(COOKIE_FILE):
            print("🔍 Found saved cookies. Attempting to use them for login...")
            login_successful = login_with_cookies(driver)
            
            if login_successful:
                print("✅ Cookie login successful! This speeds up the process.")
            else:
                print("⚠️ Cookie login failed. Falling back to manual login.")
        else:
            print("ℹ️ No saved cookies found. Manual login will be required.")

        # If cookies didn't work or don't exist, do manual login
        if not login_successful:
            print("🔐 Beginning manual login process...")
            login_successful = prepare_login(driver)

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
                driver.save_screenshot("navigation_failure.png")
                return {
                    "success": False,
                    "message": "Failed to navigate to Course History page. Please check screenshots for issues."
                }
        else:
            print("❌ Failed to log in to MySlice.")
            driver.save_screenshot("login_failure.png")
            return {
                "success": False,
                "message": "Failed to log in to MySlice. This may be due to 2FA issues or site changes."
            }
    
    except Exception as e:
        print(f"❌ Error: {e}")
        try:
            driver.save_screenshot("error_state.png")
        except:
            pass
            
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
