// script.js
// Final version incorporating modal, loading indicator, dynamic display, etc.

console.log("Script loaded. Initializing...");

// --- Global Variables ---
let courses = [];
let requirements = {};
let selectedCourses = [];
let currentSearchResults = [];
let selectedMajor = ''; // Store selected values globally
let selectedYear = '';  // Store selected values globally

// --- DOM Elements ---
// Main Controls / Display
const selectionDisplay = document.getElementById('selection-display');
const loadingIndicator = document.getElementById('loading-indicator');
const suggestedBtn = document.querySelector('button[onclick="generateBestSchedule()"]');
const searchBtn = document.querySelector('button[onclick="togglePopup()"]');
const resetBtn = document.querySelector('button[onclick="resetSchedule()"]');
// Modal Elements
const modalOverlay = document.getElementById('modal-overlay');
const modalElement = document.getElementById('initial-selection-modal');
const modalConfirmButton = document.getElementById('modal-confirm-button');
const modalStatusDisplay = document.getElementById('modal-status');
const majorSelect = document.getElementById('major-select'); // Dropdown inside modal
const yearSelect = document.getElementById('year-select');   // Dropdown inside modal
// Search Popup Elements
const popup = document.getElementById('search-popup');
const popupSearchInput = document.getElementById('popup-search');
const popupResultsContainer = document.getElementById('popup-results');
// Other UI
const notificationArea = document.getElementById('notification-area');

// --- Constants ---
const requirementsFile = 'engineering_majors_requirements.json';
const coursesFile = 'courses.csv';

// --- Utility Functions ---

/**
 * Parses HH:MM AM/PM time string into minutes past midnight.
 */
function parseTimeToMinutes(timeString) {
    if (!timeString || typeof timeString !== 'string') return NaN;
    const timeRegex = /(\d{1,2}):(\d{2})\s*([AP]M)\s*-/i;
    const match = timeString.match(timeRegex);
    if (!match) return NaN;
    let hour = parseInt(match[1], 10); const minute = parseInt(match[2], 10); const ampm = match[3];
    if (typeof ampm !== 'string' || isNaN(hour) || isNaN(minute) || hour < 1 || hour > 12 || minute < 0 || minute > 59) return NaN;
    const isPM = ampm.toUpperCase() === 'PM';
    if (isPM && hour !== 12) hour += 12; else if (!isPM && hour === 12) hour = 0;
    return hour * 60 + minute;
}

/**
 * Disables or enables main action buttons.
 */
function disableButtons(disabled) {
    if (suggestedBtn) suggestedBtn.disabled = disabled;
    if (searchBtn) searchBtn.disabled = disabled;
    // if (resetBtn) resetBtn.disabled = disabled; // Decide if reset should be disabled too
}

/**
 * Updates the main display area with the selected major and year.
 */
function updateSelectionDisplay() {
    if (selectionDisplay) {
        if (selectedMajor && selectedYear) {
            selectionDisplay.textContent = `${selectedMajor} - ${selectedYear}`;
            selectionDisplay.classList.remove('initial-message'); // Remove italic if needed
        } else {
            selectionDisplay.innerHTML = `<i>Please make selection in popup.</i>`;
            selectionDisplay.classList.add('initial-message'); // Add class for italic styling
        }
    }
}

/**
 * Updates status messages INSIDE the modal.
 */
function updateModalStatus(message, isError = false) {
    if (modalStatusDisplay) {
        modalStatusDisplay.textContent = message;
        modalStatusDisplay.classList.toggle('error', isError);
    }
    if(isError) console.error(`Modal Status (Error): ${message}`);
    else console.log(`Modal Status: ${message}`);
}

// --- Data Fetching and Parsing Functions ---

/**
 * Fetches and parses the major requirements JSON file.
 */
function fetchRequirements() {
    console.log(`Workspaceing ${requirementsFile}...`);
    return fetch(requirementsFile)
        .then(res => {
            if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${requirementsFile}`);
            return res.json().catch(e => { throw new Error(`Invalid JSON in ${requirementsFile}: ${e.message}`); });
        })
        .then(data => {
            if (data?.Unknown && typeof data.Unknown === 'object') {
                requirements = data.Unknown; // Assign global
                console.log("Requirements data assigned.");
                if (Object.keys(requirements).length === 0) console.warn("'Unknown' object is empty.");
                return requirements; // Resolve with data
            } else { throw new Error(`Invalid structure in ${requirementsFile}.`); }
        });
}

/**
 * Fetches the courses CSV file and uses PapaParse for parsing.
 */
function fetchCourses() {
    console.log(`Workspaceing ${coursesFile}...`);
    return fetch(coursesFile)
        .then(res => {
            if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${coursesFile}`);
            return res.text().catch(e => { throw new Error(`Could not read text from ${coursesFile}: ${e.message}`); });
        })
        .then(csvData => {
            console.log(`Workspaceed ${coursesFile}. Size: ${csvData.length} bytes.`);
            if (!csvData || csvData.trim().length === 0) {
                console.warn(`${coursesFile} is empty.`); courses = [];
            } else {
                console.log("Parsing CSV using PapaParse...");
                // Use PapaParse - assuming first row is NOT a header for index access
                const results = Papa.parse(csvData, { skipEmptyLines: true });
                console.log(`PapaParse completed. Rows: ${results.data.length}. Errors: ${results.errors.length}`);
                if (results.errors.length > 0) console.error("PapaParse Errors:", results.errors);
                // Process the array of arrays from PapaParse
                parseCourseData(results.data);
            }
            console.log(`[fetchCourses] Global 'courses' length: ${courses.length}`);
            return courses; // Resolve with processed courses
        });
}

/**
 * Processes the array of rows parsed by PapaParse into the global 'courses' array.
 * Expects 'parsedRows' to be an array of arrays (columns).
 */
function parseCourseData(parsedRows) {
    console.log("--- Starting parseCourseData ---");
    // Check if there's at least a header and one data row
    if (!parsedRows || parsedRows.length < 2) {
        console.warn("[parseCourseData] Not enough rows received from PapaParse (requires header + data).");
        courses = []; return;
    }
    const headerRow = parsedRows[0];
    const dataRows = parsedRows.slice(1); // Skip header row
    console.log(`[parseCourseData] Header: ${JSON.stringify(headerRow)}`);
    console.log(`[parseCourseData] Found ${dataRows.length} data rows.`);

    if (dataRows.length === 0) { courses = []; return; } // No data rows

    let structuredCount = 0, skippedColCount = 0, skippedClassCount = 0;
    const tempCourses = dataRows.map((columns, index) => {
        const rowNum = index + 2; // 1-based index + header offset
        // Check column count
        if (!columns || columns.length < 6) {
            if (skippedColCount++ < 5) console.warn(` -> Row ${rowNum}: SKIPPED (Cols < 6). Got ${columns?.length}.`); else if (skippedColCount === 5) console.warn(` -> (Further col skips suppressed)`);
            return null;
        }
        // Create course object - Ensure values are strings and trimmed
        const courseData = {
            id: `course-${Date.now()}-${index}`, Class: String(columns[0] || '').trim(), Section: String(columns[1] || '').trim(),
            DaysTimes: String(columns[2] || '').trim(), Room: String(columns[3] || '').trim(), Instructor: String(columns[4] || '').trim(),
            MeetingDates: String(columns[5] || '').trim()
        };
        // Validate Class field
        if (!courseData.Class) {
            if (skippedClassCount++ < 5) console.warn(` -> Row ${rowNum}: SKIPPED (Missing Class). Col[0] was "${columns[0]}".`); else if (skippedClassCount === 5) console.warn(` -> (Further class skips suppressed)`);
            return null;
        }
        structuredCount++;
        return courseData;
    });
    console.log(`[parseCourseData] Summary: Structured: ${structuredCount}, SkippedCols: ${skippedColCount}, SkippedClass: ${skippedClassCount}`);
    const finalCourses = tempCourses.filter(c => c !== null);
    courses = finalCourses; // Assign to global
    console.log(`[parseCourseData] Final course count: ${courses.length}`);
    if (courses.length === 0 && dataRows.length > 0) console.error(`[parseCourseData] Error: No valid courses created.`);
    else if (courses.length > 0) console.log(`[parseCourseData] Assigned ${courses.length} courses.`);
    console.log("--- Finished parseCourseData ---");
}

// --- UI Population ---
/**
 * Populates the major selection dropdown INSIDE THE MODAL. Returns true if successful.
 */
function populateMajorsDropdown() {
    if (!majorSelect) { console.error("Major select dropdown (#major-select) not found!"); return false; }
    const majorList = Object.keys(requirements || {});
    if (majorList.length > 0) {
        majorSelect.innerHTML = majorList.map(m => `<option value="${m}">${m}</option>`).join('');
        majorSelect.disabled = false; // Enable
        console.log("Populated modal majors dropdown."); return true;
    } else {
        majorSelect.innerHTML = `<option disabled selected>No majors loaded</option>`;
        majorSelect.disabled = true; // Keep disabled
        console.warn("No majors found to populate modal dropdown."); return false;
    }
}

// --- Core Scheduling Logic ---
/**
 * Adds suggested courses based on globally stored selection.
 */
function generateBestSchedule() {
    console.log("--- generateBestSchedule called ---");
    if (!selectedMajor || !selectedYear || Object.keys(requirements).length === 0 || courses.length === 0) {
        showNotification("Please confirm selection or wait for data.", "error"); console.warn("generateBestSchedule halted: Selection/Data not ready."); return;
    }
    resetSchedule(); console.log(`Generating for: ${selectedMajor} - ${selectedYear}`);
    if (!requirements[selectedMajor]?.[selectedYear]) { alert(`Error: Requirements missing for ${selectedMajor} - ${selectedYear}.`); return; }
    const suggestedCourseCodes = requirements[selectedMajor][selectedYear];
    if (!suggestedCourseCodes || suggestedCourseCodes.length === 0) { showNotification("No suggested courses listed.", "warning"); return; }
    let coursesAddedCount = 0;
    suggestedCourseCodes.forEach(code => { if (!code) return; const possibleSections = courses.filter(c => c.Class?.toLowerCase() === code.toLowerCase()); let added = false; for (let section of possibleSections) { if (!hasConflict(section)) { selectedCourses.push(section); added = true; coursesAddedCount++; break; } } if (!added && possibleSections.length > 0) showNotification(`Could not add "${code}": All sections conflict.`, 'warning'); else if (possibleSections.length === 0) showNotification(`Course code "${code}" not found.`, 'warning'); });
    renderSchedule(); if (coursesAddedCount > 0) showNotification(`Added ${coursesAddedCount} suggested course(s).`, 'success');
}

/**
 * Checks for time conflicts.
 */
function hasConflict(newCourse) {
    // (No changes needed)
    if (!newCourse?.DaysTimes || typeof newCourse.DaysTimes !== 'string') return false; const dayRegex = /Mo|Tu|We|Th|Fr/gi; const timeRegex = /(\d{1,2}):(\d{2})\s*([AP]M)\s*-\s*(\d{1,2}):(\d{2})\s*([AP]M)/i; const newDays = (newCourse.DaysTimes.match(dayRegex) || []); const newTimeMatch = newCourse.DaysTimes.match(timeRegex); if (!newTimeMatch || newDays.length === 0) return false; const parseTimeToMinutes = (h, m, ap) => { let hr = parseInt(h, 10); const mn = parseInt(m, 10); if (typeof ap !== 'string' || isNaN(hr) || isNaN(mn) || hr<1 || hr>12 || mn<0 || mn>59) return NaN; const isPM = ap.toUpperCase() === 'PM'; if (isPM && hr !== 12) hr += 12; else if (!isPM && hr === 12) hr = 0; return hr * 60 + mn; }; const newStart = parseTimeToMinutes(newTimeMatch[1],newTimeMatch[2],newTimeMatch[3]); const newEnd = parseTimeToMinutes(newTimeMatch[4],newTimeMatch[5],newTimeMatch[6]); if (isNaN(newStart) || isNaN(newEnd) || newStart >= newEnd) return false; for (const existingCourse of selectedCourses) { if (!existingCourse?.DaysTimes || typeof existingCourse.DaysTimes !== 'string') continue; const existingDays = (existingCourse.DaysTimes.match(dayRegex) || []); const existingTimeMatch = existingCourse.DaysTimes.match(timeRegex); if (!existingTimeMatch || existingDays.length === 0) continue; const existingStart = parseTimeToMinutes(existingTimeMatch[1],existingTimeMatch[2],existingTimeMatch[3]); const existingEnd = parseTimeToMinutes(existingTimeMatch[4],existingTimeMatch[5],existingTimeMatch[6]); if (isNaN(existingStart) || isNaN(existingEnd) || existingStart >= existingEnd) continue; let daysOverlap = newDays.some(nd => existingDays.some(ed => nd.toLowerCase() === ed.toLowerCase())); if (daysOverlap) { const timeOverlap = (newStart < existingEnd) && (existingStart < newEnd); if (timeOverlap) { console.log(`Conflict: ${newCourse.Class} ${newCourse.Section} conflicts with ${existingCourse.Class} ${existingCourse.Section}`); return true; } } } return false;
}

/**
 * Clears selected courses and rerenders.
 */
function resetSchedule() {
    // (No changes needed)
    console.log("--- resetSchedule called ---"); selectedCourses = []; renderSchedule(); showNotification("Schedule cleared.", "normal", 2000);
}

/**
 * Renders selected courses, sorted by time.
 */
function renderSchedule() {
    // (No changes needed - already includes sorting)
    console.log("--- renderSchedule START ---"); const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']; const dayMap = { mo: 'Monday', tu: 'Tuesday', we: 'Wednesday', th: 'Thursday', fr: 'Friday' }; const fallbackDayId = 'Monday'; daysOfWeek.forEach(dayId => { const el = document.getElementById(dayId); if (el) el.querySelectorAll('.time-slot').forEach(slot => slot.remove()); }); if (!selectedCourses || selectedCourses.length === 0) { console.log("No courses to render."); return; } const sortedCourses = selectedCourses.slice().sort((a, b) => { const timeA = parseTimeToMinutes(a.DaysTimes); const timeB = parseTimeToMinutes(b.DaysTimes); const sortA = isNaN(timeA) ? Infinity : timeA; const sortB = isNaN(timeB) ? Infinity : timeB; if (sortA === Infinity && sortB === Infinity) return (a.Class || '').localeCompare(b.Class || ''); return sortA - sortB; }); console.log("Rendering sorted courses:", sortedCourses.map(c=>`${c.Class} (${c.DaysTimes})`)); sortedCourses.forEach((course) => { if (!course?.DaysTimes || typeof course.DaysTimes !== 'string') return; const dayRegex = /Mo|Tu|We|Th|Fr/gi; const matchedDays = course.DaysTimes.match(dayRegex); const hasStandardDays = matchedDays && matchedDays.length > 0; const timeDisplayMatch = course.DaysTimes.match(/(\d{1,2}:\d{2}\s*[AP]M\s*-\s*\d{1,2}:\d{2}\s*[AP]M)/i); const timeText = timeDisplayMatch ? timeDisplayMatch[0] : `Days/Time: ${course.DaysTimes}`; const courseId = `${course.Class||'N/A'} ${course.Section||''}`; const courseDetails = `<small>${course.Instructor||'N/A'} - ${course.Room||'N/A'}</small>`; const htmlId = course.id || `${course.Class}-${course.Section}-${Math.random().toString(16).slice(2)}`; if (hasStandardDays) { matchedDays.forEach(dayCode => { const dayName = dayMap[dayCode.toLowerCase()]; if (dayName) { const dayElement = document.getElementById(dayName); if (dayElement) { const slot = document.createElement('div'); slot.className = timeDisplayMatch ? 'time-slot standard-slot' : 'time-slot non-standard-time-slot'; slot.innerHTML = `<strong>${courseId}</strong><br>${timeText}<br>${courseDetails}`; slot.dataset.courseId = htmlId; dayElement.appendChild(slot); } } }); } else { const fallbackElement = document.getElementById(fallbackDayId); if (fallbackElement) { const slot = document.createElement('div'); slot.className = 'time-slot tba-slot'; slot.innerHTML = `<strong>${courseId} (TBA/Other)</strong><br>${timeText}<br>${courseDetails}`; slot.dataset.courseId = htmlId; fallbackElement.appendChild(slot); } } }); console.log("--- renderSchedule END ---");
}

// --- Search Popup Logic ---
function togglePopup() { /* (No changes needed) */ if (!popup) return; const isVisible = popup.style.display === 'block'; popup.style.display = isVisible ? 'none' : 'block'; if (!isVisible) { if (popupSearchInput) { popupSearchInput.value = ''; popupSearchInput.focus(); } if (popupResultsContainer) popupResultsContainer.innerHTML = '<p>Enter Course Code or Instructor Name and press Enter.</p>'; currentSearchResults = []; } }
function popupSearch(event) { /* (No changes needed) */ if (event.key === 'Enter') { if (!popupSearchInput || !popupResultsContainer) return; const query = popupSearchInput.value.trim(); const queryLower = query.toLowerCase(); currentSearchResults = []; if (!query) { popupResultsContainer.innerHTML = '<p>Please enter a search term.</p>'; return; } if (courses.length === 0) { popupResultsContainer.innerHTML = '<p>Course data not ready or is empty.</p>'; return; } currentSearchResults = courses.filter(c => (c.Class?.toLowerCase().includes(queryLower)) || (c.Instructor?.toLowerCase().includes(queryLower))); if (currentSearchResults.length > 0) { popupResultsContainer.innerHTML = currentSearchResults.map((c, index) => `<div><span><strong>${c.Class} ${c.Section}</strong> - ${c.DaysTimes||'TBA'} (${c.Instructor||'N/A'})</span><button class="add-button" data-course-index="${index}">Add</button></div>`).join(''); } else { const p = document.createElement('p'); p.textContent = `No courses found matching "${query}".`; popupResultsContainer.innerHTML = ''; popupResultsContainer.appendChild(p); } } }
function addFromSearch(course) { /* (No changes needed) */ if (!course?.Class) { alert("Cannot add: Invalid data."); return; } const alreadyAdded = selectedCourses.some(sc => sc.Class === course.Class && sc.Section === course.Section); if (alreadyAdded) { showNotification(`${course.Class} ${course.Section} is already added.`, 'warning', 3000); return; } if (!hasConflict(course)) { selectedCourses.push(course); renderSchedule(); showNotification(`${course.Class} ${course.Section} added.`, 'success', 3000); } else { showNotification(`Conflict: Cannot add ${course.Class} ${course.Section}.`, 'warning'); } }

// --- Notification Function ---
let notificationTimeoutId = null;
function showNotification(message, type = 'normal', duration = 4000) { /* (No changes needed) */ if (!notificationArea) { alert(message); return; } const notification = document.createElement('div'); notification.className = `notification ${type}`; notification.textContent = message; notification.addEventListener('click', () => { notification.classList.remove('visible'); notification.addEventListener('transitionend', () => notification.remove(), { once: true }); if (notificationTimeoutId === Number(notification.dataset.timeoutId)) { clearTimeout(notificationTimeoutId); notificationTimeoutId = null; } }, { once: true }); notificationArea.appendChild(notification); requestAnimationFrame(() => notification.classList.add('visible')); if (notificationTimeoutId) clearTimeout(notificationTimeoutId); const newTimeoutId = setTimeout(() => { if (notification.parentElement) { notification.classList.remove('visible'); notification.addEventListener('transitionend', () => notification.remove(), { once: true }); } if(notificationTimeoutId === newTimeoutId) notificationTimeoutId = null; }, duration); notification.dataset.timeoutId = newTimeoutId.toString(); notificationTimeoutId = newTimeoutId; }

// --- Event Listener Setup ---
function setupEventListeners() {
    // Listener for search results
    if (popupResultsContainer) { popupResultsContainer.addEventListener('click', function(event) { if (event.target?.classList.contains('add-button')) { const button = event.target; const courseIndexStr = button.dataset.courseIndex; if (courseIndexStr != null) { const index = parseInt(courseIndexStr, 10); if (!isNaN(index) && Array.isArray(currentSearchResults) && index >= 0 && index < currentSearchResults.length) { const courseToAdd = currentSearchResults[index]; if (courseToAdd?.Class) addFromSearch(courseToAdd); else { console.error("Invalid course obj!", courseToAdd); alert("Internal Error: Course data issue."); } } else { console.error(`Invalid index ${index} / results issue.`); alert("Internal Error: Index mismatch."); } } else { console.error("Button index missing."); alert("Internal Error: Button data missing."); } } }); console.log("Added listener to #popup-results."); } else { console.error("Could not find #popup-results."); }
    // Listener for modal confirm button
    if (modalConfirmButton) { modalConfirmButton.addEventListener('click', handleModalConfirm); console.log("Added listener to #modal-confirm-button."); } else { console.error("Modal confirm button not found!"); }
}

/**
 * Handles the click on the modal's confirm button.
 * Validates selection, hides modal, updates display, fetches courses.
 */
function handleModalConfirm() {
    if (!majorSelect || !yearSelect) { updateModalStatus("Internal Error: Dropdowns missing.", true); return; }
    const major = majorSelect.value;
    const year = yearSelect.value;

    // Validate selection
    if (!major || majorSelect.options[majorSelect.selectedIndex]?.disabled) {
        updateModalStatus("Please select a valid major.", true); return;
    }
    if (!year) { updateModalStatus("Please select a year.", true); return; }

    selectedMajor = major; selectedYear = year; // Store globally
    console.log(`Modal confirmed: ${selectedMajor} - ${selectedYear}`);
    if (modalOverlay) modalOverlay.classList.remove('modal-visible'); // Hide modal
    updateSelectionDisplay(); // Update main display text

    // Show Loading Indicator and disable buttons
    if (loadingIndicator) loadingIndicator.style.display = 'flex';
    disableButtons(true); // Ensure main buttons are disabled
    showNotification("Loading course data...", "normal", 3000);

    // Fetch Courses now
    fetchCourses()
        .then(() => {
            // Hide indicator on success
            if (loadingIndicator) loadingIndicator.style.display = 'none';
            // Check if courses actually loaded
            if (courses && courses.length > 0) {
                console.log("Course data loaded successfully after modal confirmation.");
                disableButtons(false); // Enable main buttons
                showNotification("Course data loaded.", "success", 2000);
                // You could potentially call generateBestSchedule() here automatically if desired
            } else {
                // If fetch succeeded but parsing resulted in empty array
                throw new Error("Failed to load valid course data (parsing result empty).");
            }
        })
        .catch(error => {
            // Hide indicator on error
            if (loadingIndicator) loadingIndicator.style.display = 'none';
            console.error("Failed to load courses after modal confirmation:", error);
            showNotification(`Error loading courses: ${error.message}`, 'error', 10000);
            disableButtons(true); // Keep buttons disabled
            if (selectionDisplay) selectionDisplay.innerHTML += ` <span style="color:red;">(Error loading courses)</span>`;
        });
}

// --- Application Initialization --- (Revised Flow) ---
function initializeApp() {
    console.log("Initializing application...");
    disableButtons(true); // Disable main buttons from the start
    // Initial message is set in HTML

    // Check essential elements
    if (!modalOverlay || !modalConfirmButton || !majorSelect || !loadingIndicator) {
        console.error("Essential UI elements not found! Cannot initialize properly.");
        alert("Error initializing page. Critical UI elements missing.");
        return; // Stop initialization if modal elements are missing
    }

    // 1. Show Modal & Set Initial State
    updateModalStatus("Loading majors...", false);
    majorSelect.disabled = true; // Disable major select until populated
    modalConfirmButton.disabled = true; // Disable confirm until major select is ready
    modalOverlay.classList.add('modal-visible');
    console.log("Modal displayed. Fetching requirements...");

    // 2. Fetch Requirements for Modal Dropdown
    fetchRequirements()
        .then(() => {
            const majorsWerePopulated = populateMajorsDropdown();
            if (majorsWerePopulated) {
                updateModalStatus("Please make your selection.", false);
                modalConfirmButton.disabled = false; // Enable confirm button
            } else {
                updateModalStatus("No majors available.", true); // Show error in modal
                modalConfirmButton.disabled = true; // Keep confirm disabled
            }
        })
        .catch(error => {
            console.error("Initialization failed - Could not fetch requirements:", error);
            updateModalStatus(`Error loading majors: ${error.message}`, true);
            showNotification(`Failed to load majors: ${error.message}`, 'error', 10000);
            modalConfirmButton.disabled = true; // Ensure confirm disabled on error
        });

    // 3. Setup event listeners (for modal button and search results)
    setupEventListeners();

    console.log("Initialization setup complete. Waiting for modal confirmation...");
    // Course fetching & main UI enabling now happens in handleModalConfirm
}

// --- Start the application ---
initializeApp();