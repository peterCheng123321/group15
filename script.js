// script.js
// Final version incorporating modal, loading indicator, dynamic display, etc.

console.log("Script loaded. Initializing...")

// --- Global Variables ---
let courses = []
let requirements = {}
let selectedCourses = []
let currentSearchResults = []
let selectedMajor = "" // Store selected values globally
let selectedYear = "" // Store selected values globally
let ratingsData = [];

// --- Additional Global Variables ---
let currentView = "calendar" // "calendar" or "list"
const courseNotes = {} // Store notes for courses
let currentNotesCourseId = null // Track which course is being edited

// --- DOM Elements ---
// Main Controls / Display
const selectionDisplay = document.getElementById("selection-display")
const loadingIndicator = document.getElementById("loading-indicator")
const suggestedBtn = document.querySelector('button[onclick="generateBestSchedule()"]')
const searchBtn = document.querySelector('button[onclick="togglePopup()"]')
const resetBtn = document.querySelector('button[onclick="resetSchedule()"]')
// Modal Elements
const modalOverlay = document.getElementById("modal-overlay")
const modalElement = document.getElementById("initial-selection-modal")
const modalConfirmButton = document.getElementById("modal-confirm-button")
const modalStatusDisplay = document.getElementById("modal-status")
const majorSelect = document.getElementById("major-select") // Dropdown inside modal
const yearSelect = document.getElementById("year-select") // Dropdown inside modal
// Search Popup Elements
const popup = document.getElementById("search-popup")
const popupSearchInput = document.getElementById("popup-search")
const popupResultsContainer = document.getElementById("popup-results")
// Other UI
const notificationArea = document.getElementById("notification-area")

// --- Constants ---
const requirementsFile = "engineering_majors_requirements.json"
const coursesFile = "courses.csv"

// --- Utility Functions ---

// Add this function to get the department code from a class name
function getDepartmentCode(className) {
  if (!className) return ""
  // Extract the department code (letters before the first number)
  const match = className.match(/^([A-Za-z]+)/)
  return match ? match[1] : ""
}

/**
 * Parses HH:MM AM/PM time string into minutes past midnight.
 */
function parseTimeToMinutes(timeString) {
  if (!timeString || typeof timeString !== "string") return Number.NaN
  const timeRegex = /(\d{1,2}):(\d{2})\s*([AP]M)\s*-/i
  const match = timeString.match(timeRegex)
  if (!match) return Number.NaN
  let hour = Number.parseInt(match[1], 10)
  const minute = Number.parseInt(match[2], 10)
  const ampm = match[3]
  if (typeof ampm !== "string" || isNaN(hour) || isNaN(minute) || hour < 1 || hour > 12 || minute < 0 || minute > 59)
    return Number.NaN
  const isPM = ampm.toUpperCase() === "PM"
  if (isPM && hour !== 12) hour += 12
  else if (!isPM && hour === 12) hour = 0
  return hour * 60 + minute
}

/**
 * Disables or enables main action buttons.
 */
function disableButtons(disabled) {
  if (suggestedBtn) suggestedBtn.disabled = disabled
  if (searchBtn) searchBtn.disabled = disabled
  // if (resetBtn) resetBtn.disabled = disabled; // Decide if reset should be disabled too
}

/**
 * Updates the main display area with the selected major and year.
 */
function updateSelectionDisplay() {
  if (selectionDisplay) {
    if (selectedMajor && selectedYear) {
      selectionDisplay.textContent = `${selectedMajor} - ${selectedYear}`
      selectionDisplay.classList.remove("initial-message") // Remove italic if needed
    } else {
      selectionDisplay.innerHTML = `<i>Please make selection in popup.</i>`
      selectionDisplay.classList.add("initial-message") // Add class for italic styling
    }
  }
}

/**
 * Updates status messages INSIDE the modal.
 */
function updateModalStatus(message, isError = false) {
  if (modalStatusDisplay) {
    modalStatusDisplay.textContent = message
    modalStatusDisplay.classList.toggle("error", isError)
  }
  if (isError) console.error(`Modal Status (Error): ${message}`)
  else console.log(`Modal Status: ${message}`)
}

// --- Data Fetching and Parsing Functions ---

/**
 * Fetches and parses the major requirements JSON file.
 */
function fetchRequirements() {
  console.log(`Workspaceing ${requirementsFile}...`)
  return fetch(requirementsFile)
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${requirementsFile}`)
      return res.json().catch((e) => {
        throw new Error(`Invalid JSON in ${requirementsFile}: ${e.message}`)
      })
    })
    .then((data) => {
      if (data?.Unknown && typeof data.Unknown === "object") {
        requirements = data.Unknown // Assign global
        console.log("Requirements data assigned.")
        if (Object.keys(requirements).length === 0) console.warn("'Unknown' object is empty.")
        return requirements // Resolve with data
      } else {
        throw new Error(`Invalid structure in ${requirementsFile}.`)
      }
    })
}

/**
 * Fetches the courses CSV file and uses PapaParse for parsing.
 */
function fetchCourses() {
  console.log(`Workspaceing ${coursesFile}...`)
  return fetch(coursesFile)
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${coursesFile}`)
      return res.text().catch((e) => {
        throw new Error(`Could not read text from ${coursesFile}: ${e.message}`)
      })
    })
    .then((csvData) => {
      console.log(`Workspaceed ${coursesFile}. Size: ${csvData.length} bytes.`)
      if (!csvData || csvData.trim().length === 0) {
        console.warn(`${coursesFile} is empty.`)
        courses = []
      } else {
        console.log("Parsing CSV using PapaParse...")
        // Use PapaParse - assuming first row is NOT a header for index access
        const results = Papa.parse(csvData, { skipEmptyLines: true })
        console.log(`PapaParse completed. Rows: ${results.data.length}. Errors: ${results.errors.length}`)
        if (results.errors.length > 0) console.error("PapaParse Errors:", results.errors)
        // Process the array of arrays from PapaParse
        parseCourseData(results.data)
      }
      console.log(`[fetchCourses] Global 'courses' length: ${courses.length}`)
      return courses // Resolve with processed courses
    })
}

// Fetch ratings data from CSV
function fetchRatingsData() {
  fetch("courses_with_ratings.csv")
       .then(response => response.text())
       .then(csvText => {
            let results = Papa.parse(csvText, { header: true, skipEmptyLines: true });
            ratingsData = results.data;
       })
       .catch(error => console.error("Error loading ratings data:", error));
}

/**
 * Processes the array of rows parsed by PapaParse into the global 'courses' array.
 * Expects 'parsedRows' to be an array of arrays (columns).
 */
function parseCourseData(parsedRows) {
  console.log("--- Starting parseCourseData ---")
  // Check if there's at least a header and one data row
  if (!parsedRows || parsedRows.length < 2) {
    console.warn("[parseCourseData] Not enough rows received from PapaParse (requires header + data).")
    courses = []
    return
  }
  const headerRow = parsedRows[0]
  const dataRows = parsedRows.slice(1) // Skip header row
  console.log(`[parseCourseData] Header: ${JSON.stringify(headerRow)}`)
  console.log(`[parseCourseData] Found ${dataRows.length} data rows.`)

  if (dataRows.length === 0) {
    courses = []
    return
  } // No data rows

  let structuredCount = 0,
    skippedColCount = 0,
    skippedClassCount = 0
  const tempCourses = dataRows.map((columns, index) => {
    const rowNum = index + 2 // 1-based index + header offset
    // Check column count
    if (!columns || columns.length < 6) {
      if (skippedColCount++ < 5) console.warn(` -> Row ${rowNum}: SKIPPED (Cols < 6). Got ${columns?.length}.`)
      else if (skippedColCount === 5) console.warn(` -> (Further col skips suppressed)`)
      return null
    }
    // Create course object - Ensure values are strings and trimmed
    const courseData = {
      id: `course-${Date.now()}-${index}`,
      Class: String(columns[0] || "").trim(),
      Section: String(columns[1] || "").trim(),
      DaysTimes: String(columns[2] || "").trim(),
      Room: String(columns[3] || "").trim(),
      Instructor: String(columns[4] || "").trim(),
      MeetingDates: String(columns[5] || "").trim(),
    }
    // Validate Class field
    if (!courseData.Class) {
      if (skippedClassCount++ < 5)
        console.warn(` -> Row ${rowNum}: SKIPPED (Missing Class). Col[0] was "${columns[0]}".`)
      else if (skippedClassCount === 5) console.warn(` -> (Further class skips suppressed)`)
      return null
    }
    structuredCount++
    return courseData
  })
  console.log(
    `[parseCourseData] Summary: Structured: ${structuredCount}, SkippedCols: ${skippedColCount}, SkippedClass: ${skippedClassCount}`,
  )
  const finalCourses = tempCourses.filter((c) => c !== null)
  courses = finalCourses // Assign to global
  console.log(`[parseCourseData] Final course count: ${courses.length}`)
  if (courses.length === 0 && dataRows.length > 0) console.error(`[parseCourseData] Error: No valid courses created.`)
  else if (courses.length > 0) console.log(`[parseCourseData] Assigned ${courses.length} courses.`)
  console.log("--- Finished parseCourseData ---")
}

// --- UI Population ---
/**
 * Populates the major selection dropdown INSIDE THE MODAL. Returns true if successful.
 */
function populateMajorsDropdown() {
  if (!majorSelect) {
    console.error("Major select dropdown (#major-select) not found!")
    return false
  }
  const majorList = Object.keys(requirements || {})
  if (majorList.length > 0) {
    majorSelect.innerHTML = majorList.map((m) => `<option value="${m}">${m}</option>`).join("")
    majorSelect.disabled = false // Enable
    console.log("Populated modal majors dropdown.")
    return true
  } else {
    majorSelect.innerHTML = `<option disabled selected>No majors loaded</option>`
    majorSelect.disabled = true // Keep disabled
    console.warn("No majors found to populate modal dropdown.")
    return false
  }
}

// --- Core Scheduling Logic ---
/**
 * Adds suggested courses based on globally stored selection.
 */
function generateBestSchedule() {
  console.log("--- generateBestSchedule called ---")
  if (!selectedMajor || !selectedYear || Object.keys(requirements).length === 0 || courses.length === 0) {
    showNotification("Please confirm selection or wait for data.", "error")
    console.warn("generateBestSchedule halted: Selection/Data not ready.")
    return
  }
  resetSchedule()
  console.log(`Generating for: ${selectedMajor} - ${selectedYear}`)
  if (!requirements[selectedMajor]?.[selectedYear]) {
    alert(`Error: Requirements missing for ${selectedMajor} - ${selectedYear}.`)
    return
  }
  const suggestedCourseCodes = requirements[selectedMajor][selectedYear]
  if (!suggestedCourseCodes || suggestedCourseCodes.length === 0) {
    showNotification("No suggested courses listed.", "warning")
    return
  }
  let coursesAddedCount = 0
  suggestedCourseCodes.forEach((code) => {
    if (!code) return
    const possibleSections = courses.filter((c) => c.Class?.toLowerCase() === code.toLowerCase())
    let added = false
    for (const section of possibleSections) {
      if (!hasConflict(section)) {
        selectedCourses.push(section)
        added = true
        coursesAddedCount++
        break
      }
    }
    if (!added && possibleSections.length > 0)
      showNotification(`Could not add "${code}": All sections conflict.`, "warning")
    else if (possibleSections.length === 0) showNotification(`Course code "${code}" not found.`, "warning")
  })
  renderSchedule()
  if (coursesAddedCount > 0) showNotification(`Added ${coursesAddedCount} suggested course(s).`, "success")
}

/**
 * Checks for time conflicts.
 */
function hasConflict(newCourse) {
  // (No changes needed)
  if (!newCourse?.DaysTimes || typeof newCourse.DaysTimes !== "string") return false
  const dayRegex = /Mo|Tu|We|Th|Fr/gi
  const timeRegex = /(\d{1,2}):(\d{2})\s*([AP]M)\s*-\s*(\d{1,2}):(\d{2})\s*([AP]M)/i
  const newDays = newCourse.DaysTimes.match(dayRegex) || []
  const newTimeMatch = newCourse.DaysTimes.match(timeRegex)
  if (!newTimeMatch || newDays.length === 0) return false
  const parseTimeToMinutes = (h, m, ap) => {
    let hr = Number.parseInt(h, 10)
    const mn = Number.parseInt(m, 10)
    if (typeof ap !== "string" || isNaN(hr) || isNaN(mn) || hr < 1 || hr > 12 || mn < 0 || mn > 59) return Number.NaN
    const isPM = ap.toUpperCase() === "PM"
    if (isPM && hr !== 12) hr += 12
    else if (!isPM && hr === 12) hr = 0
    return hr * 60 + mn
  }
  const newStart = parseTimeToMinutes(newTimeMatch[1], newTimeMatch[2], newTimeMatch[3])
  const newEnd = parseTimeToMinutes(newTimeMatch[4], newTimeMatch[5], newTimeMatch[6])
  if (isNaN(newStart) || isNaN(newEnd) || newStart >= newEnd) return false
  for (const existingCourse of selectedCourses) {
    if (!existingCourse?.DaysTimes || typeof existingCourse.DaysTimes !== "string") continue
    const existingDays = existingCourse.DaysTimes.match(dayRegex) || []
    const existingTimeMatch = existingCourse.DaysTimes.match(timeRegex)
    if (!existingTimeMatch || existingDays.length === 0) continue
    const existingStart = parseTimeToMinutes(existingTimeMatch[1], existingTimeMatch[2], existingTimeMatch[3])
    const existingEnd = parseTimeToMinutes(existingTimeMatch[4], existingTimeMatch[5], existingTimeMatch[6])
    if (isNaN(existingStart) || isNaN(existingEnd) || existingStart >= existingEnd) continue
    const daysOverlap = newDays.some((nd) => existingDays.some((ed) => nd.toLowerCase() === ed.toLowerCase()))
    if (daysOverlap) {
      const timeOverlap = newStart < existingEnd && existingStart < newEnd
      if (timeOverlap) {
        console.log(
          `Conflict: ${newCourse.Class} ${newCourse.Section} conflicts with ${existingCourse.Class} ${existingCourse.Section}`,
        )
        return true
      }
    }
  }
  return false
}

/**
 * Clears selected courses and rerenders.
 */
function resetSchedule() {
  // (No changes needed)
  console.log("--- resetSchedule called ---")
  selectedCourses = []
  renderSchedule()
  updateScheduleStats()
  if (currentView === "list") {
    updateListView()
  }
  showNotification("Schedule cleared.", "normal", 2000)
}

/**
 * Renders selected courses, sorted by time.
 */
function renderSchedule() {
  console.log("--- renderSchedule START ---")
  const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
  const dayMap = { mo: "Monday", tu: "Tuesday", we: "Wednesday", th: "Thursday", fr: "Friday" }
  const fallbackDayId = "Monday"

  daysOfWeek.forEach((dayId) => {
    const el = document.getElementById(dayId)
    if (el) el.querySelectorAll(".time-slot").forEach((slot) => slot.remove())
  })

  if (!selectedCourses || selectedCourses.length === 0) {
    console.log("No courses to render.")
    return
  }

  const sortedCourses = selectedCourses.slice().sort((a, b) => {
    const timeA = parseTimeToMinutes(a.DaysTimes)
    const timeB = parseTimeToMinutes(b.DaysTimes)
    const sortA = isNaN(timeA) ? Number.POSITIVE_INFINITY : timeA
    const sortB = isNaN(timeB) ? Number.POSITIVE_INFINITY : timeB
    if (sortA === Number.POSITIVE_INFINITY && sortB === Number.POSITIVE_INFINITY)
      return (a.Class || "").localeCompare(b.Class || "")
    return sortA - sortB
  })

  console.log(
    "Rendering sorted courses:",
    sortedCourses.map((c) => `${c.Class} (${c.DaysTimes})`),
  )

  sortedCourses.forEach((course) => {
    if (!course?.DaysTimes || typeof course.DaysTimes !== "string") return

    const dayRegex = /Mo|Tu|We|Th|Fr/gi
    const matchedDays = course.DaysTimes.match(dayRegex)
    const hasStandardDays = matchedDays && matchedDays.length > 0

    const timeDisplayMatch = course.DaysTimes.match(/(\d{1,2}:\d{2}\s*[AP]M\s*-\s*\d{1,2}:\d{2}\s*[AP]M)/i)
    const timeText = timeDisplayMatch ? timeDisplayMatch[0] : `Days/Time: ${course.DaysTimes}`

    const courseId = `${course.Class || "N/A"} ${course.Section || ""}`
    const courseDetails = `<small>${course.Instructor || "N/A"} - ${course.Room || "N/A"}</small>`
    const htmlId = course.id || `${course.Class}-${course.Section}-${Math.random().toString(16).slice(2)}`

    // Get department code for styling
    const deptCode = getDepartmentCode(course.Class)
    const deptClass = deptCode ? `dept-${deptCode}` : ""

    if (hasStandardDays) {
      matchedDays.forEach((dayCode) => {
        const dayName = dayMap[dayCode.toLowerCase()]
        if (dayName) {
          const dayElement = document.getElementById(dayName)
          if (dayElement) {
            const slot = document.createElement("div")

            // Apply appropriate classes including department styling
            let slotClass = timeDisplayMatch ? "time-slot standard-slot" : "time-slot non-standard-time-slot"
            if (deptClass) slotClass += ` ${deptClass}`

            slot.className = slotClass
            slot.innerHTML = `
                            <strong>${courseId}</strong>
                            <div class="time-slot-time">${timeText}</div>
                            ${courseDetails}
                        `
            slot.dataset.courseId = htmlId

            // Add click event for more details
            slot.addEventListener("click", () => {
              showCourseDetails(course)
            })

            dayElement.appendChild(slot)
          }
        }
      })
    } else {
      const fallbackElement = document.getElementById(fallbackDayId)
      if (fallbackElement) {
        const slot = document.createElement("div")

        // Apply TBA styling plus department if available
        let slotClass = "time-slot tba-slot"
        if (deptClass) slotClass += ` ${deptClass}`

        slot.className = slotClass
        slot.innerHTML = `
                    <strong>${courseId} (TBA/Other)</strong>
                    <div class="time-slot-time">${timeText}</div>
                    ${courseDetails}
                `
        slot.dataset.courseId = htmlId

        // Add click event for more details
        slot.addEventListener("click", () => {
          showCourseDetails(course)
        })

        fallbackElement.appendChild(slot)
      }
    }
  })

  console.log("--- renderSchedule END ---")
  updateScheduleStats()
  if (currentView === "list") {
    updateListView()
  }
}

// Add a function to show course details when clicking on a course
function showCourseDetails(course) {
  if (!course) return

  // Create a simple modal to show course details
  const detailsHtml = `
        <div style="text-align: left; margin-bottom: 20px;">
            <h3>${course.Class} ${course.Section || ""}</h3>
            <p><strong>Days/Times:</strong> ${course.DaysTimes || "TBA"}</p>
            <p><strong>Instructor:</strong> ${course.Instructor || "TBA"}</p>
            <p><strong>Room:</strong> ${course.Room || "TBA"}</p>
            <p><strong>Meeting Dates:</strong> ${course.MeetingDates || "TBA"}</p>
        </div>
        <button onclick="this.parentNode.remove()">Close</button>
    `

  const detailsModal = document.createElement("div")
  detailsModal.className = "modal"
  detailsModal.style.position = "fixed"
  detailsModal.style.top = "50%"
  detailsModal.style.left = "50%"
  detailsModal.style.transform = "translate(-50%, -50%)"
  detailsModal.style.zIndex = "2000"
  detailsModal.style.padding = "25px"
  detailsModal.style.backgroundColor = "white"
  detailsModal.style.borderRadius = "10px"
  detailsModal.style.boxShadow = "0 10px 25px rgba(0,0,0,0.2)"
  detailsModal.style.maxWidth = "90%"
  detailsModal.style.width = "400px"

  detailsModal.innerHTML = detailsHtml
  document.body.appendChild(detailsModal)
}

/**
 * Updates the schedule statistics display
 */
function updateScheduleStats() {
  // Count total courses
  const totalCourses = selectedCourses.length
  document.getElementById("stat-courses").textContent = totalCourses

  // Estimate credit hours (most courses are 3-4 credits)
  // In a real app, this would come from the course data
  const estimatedCredits = Math.round(totalCourses * 3.5)
  document.getElementById("stat-credits").textContent = estimatedCredits

  // Calculate total class hours per week
  let totalMinutes = 0
  selectedCourses.forEach((course) => {
    if (course.DaysTimes) {
      const timeMatch = course.DaysTimes.match(/(\d{1,2}):(\d{2})\s*([AP]M)\s*-\s*(\d{1,2}):(\d{2})\s*([AP]M)/i)
      if (timeMatch) {
        const startHour = Number.parseInt(timeMatch[1])
        const startMin = Number.parseInt(timeMatch[2])
        const startPeriod = timeMatch[3]
        const endHour = Number.parseInt(timeMatch[4])
        const endMin = Number.parseInt(timeMatch[5])
        const endPeriod = timeMatch[6]

        // Convert to 24-hour format
        let start24Hour = startHour
        if (startPeriod.toUpperCase() === "PM" && startHour !== 12) start24Hour += 12
        if (startPeriod.toUpperCase() === "AM" && startHour === 12) start24Hour = 0

        let end24Hour = endHour
        if (endPeriod.toUpperCase() === "PM" && endHour !== 12) end24Hour += 12
        if (endPeriod.toUpperCase() === "AM" && endHour === 12) end24Hour = 0

        // Calculate duration in minutes
        const startMinutes = start24Hour * 60 + startMin
        const endMinutes = end24Hour * 60 + endMin
        const duration = endMinutes - startMinutes

        // Count days
        const dayMatches = course.DaysTimes.match(/Mo|Tu|We|Th|Fr/gi) || []
        const dayCount = dayMatches.length

        // Add to total (duration * days per week)
        if (duration > 0 && dayCount > 0) {
          totalMinutes += duration * dayCount
        }
      }
    }
  })

  // Convert minutes to hours
  const totalHours = Math.round((totalMinutes / 60) * 10) / 10 // Round to 1 decimal
  document.getElementById("stat-hours").textContent = totalHours

  // Count unique departments
  const departments = new Set()
  selectedCourses.forEach((course) => {
    if (course.Class) {
      const deptCode = getDepartmentCode(course.Class)
      if (deptCode) departments.add(deptCode)
    }
  })
  document.getElementById("stat-departments").textContent = departments.size
}

/**
 * Apply filters to the course display
 */
function applyFilters() {
  const deptFilter = document.getElementById("filter-department").value
  const timeFilter = document.getElementById("filter-time").value

  // First reset all courses to visible
  document.querySelectorAll(".time-slot").forEach((slot) => {
    slot.style.display = "block"
  })

  // Apply department filter if selected
  if (deptFilter) {
    document.querySelectorAll(".time-slot").forEach((slot) => {
      if (!slot.classList.contains(`dept-${deptFilter}`)) {
        slot.style.display = "none"
      }
    })
  }

  // Apply time filter if selected
  if (timeFilter) {
    document.querySelectorAll(".time-slot").forEach((slot) => {
      if (slot.style.display === "none") return // Skip already hidden slots

      const timeText = slot.querySelector(".time-slot-time")?.textContent || ""
      const timeMatch = timeText.match(/(\d{1,2}):(\d{2})\s*([AP]M)/i)

      if (timeMatch) {
        let hour = Number.parseInt(timeMatch[1])
        const period = timeMatch[3].toUpperCase()

        // Convert to 24-hour
        if (period === "PM" && hour !== 12) hour += 12
        if (period === "AM" && hour === 12) hour = 0

        // Check time ranges
        if (timeFilter === "morning" && (hour < 8 || hour >= 12)) {
          slot.style.display = "none"
        } else if (timeFilter === "afternoon" && (hour < 12 || hour >= 17)) {
          slot.style.display = "none"
        } else if (timeFilter === "evening" && hour < 17) {
          slot.style.display = "none"
        }
      }
    })
  }
}

/**
 * Toggle between calendar and list view
 */
function toggleView() {
  const calendarView = document.querySelector(".calendar")
  const listView = document.getElementById("list-view")

  if (currentView === "calendar") {
    // Switch to list view
    calendarView.style.display = "none"
    listView.style.display = "block"
    currentView = "list"

    // Populate the list view
    updateListView()
  } else {
    // Switch to calendar view
    calendarView.style.display = "grid"
    listView.style.display = "none"
    currentView = "calendar"
  }
}

/**
 * Update the list view with current courses
 */
function updateListView() {
  const tableBody = document.getElementById("courses-table-body")
  if (!tableBody) return

  // Clear existing rows
  tableBody.innerHTML = ""

  // Add a row for each course
  selectedCourses.forEach((course) => {
    const row = document.createElement("tr")
    row.className = "course-row"

    // Add department class for styling
    const deptCode = getDepartmentCode(course.Class)
    if (deptCode) row.classList.add(`dept-${deptCode}`)

    row.innerHTML = `
      <td>${course.Class || "N/A"}</td>
      <td>${course.Section || "N/A"}</td>
      <td>${course.DaysTimes || "TBA"}</td>
      <td>${course.Instructor || "N/A"}</td>
      <td>${course.Room || "N/A"}</td>
      <td class="course-actions">
        <button onclick="showCourseDetails(selectedCourses[${selectedCourses.indexOf(course)}])" class="secondary-button">Details</button>
        <button onclick="openNotesModal('${course.id}')" class="secondary-button">Notes</button>
        <button onclick="removeCourse('${course.id}')" class="secondary-button">Remove</button>
      </td>
    `

    tableBody.appendChild(row)
  })

  // Show message if no courses
  if (selectedCourses.length === 0) {
    const row = document.createElement("tr")
    row.innerHTML = '<td colspan="6" style="text-align: center;">No courses added yet.</td>'
    tableBody.appendChild(row)
  }
}

/**
 * Remove a course from the schedule
 */
function removeCourse(courseId) {
  const index = selectedCourses.findIndex((c) => c.id === courseId)
  if (index !== -1) {
    const course = selectedCourses[index]
    selectedCourses.splice(index, 1)
    renderSchedule()
    updateScheduleStats()
    if (currentView === "list") {
      updateListView()
    }
    showNotification(`Removed ${course.Class} ${course.Section}`, "normal", 3000)
  }
}

/**
 * Open the notes modal for a course
 */
function openNotesModal(courseId) {
  currentNotesCourseId = courseId
  const course = selectedCourses.find((c) => c.id === courseId)
  if (!course) return

  const modal = document.getElementById("course-notes-modal")
  const courseIdElement = document.getElementById("notes-course-id")
  const notesTextarea = document.getElementById("course-notes-text")

  if (modal && courseIdElement && notesTextarea) {
    courseIdElement.textContent = `${course.Class} ${course.Section}`
    notesTextarea.value = courseNotes[courseId] || ""
    modal.classList.add("modal-visible")
  }
}

/**
 * Close the notes modal
 */
function closeNotesModal() {
  const modal = document.getElementById("course-notes-modal")
  if (modal) {
    modal.classList.remove("modal-visible")
  }
  currentNotesCourseId = null
}

/**
 * Save notes for a course
 */
function saveNotes() {
  if (!currentNotesCourseId) return

  const notesTextarea = document.getElementById("course-notes-text")
  if (notesTextarea) {
    const notes = notesTextarea.value.trim()

    if (notes) {
      courseNotes[currentNotesCourseId] = notes

      // Add visual indicator to course slots
      document.querySelectorAll(`.time-slot[data-course-id="${currentNotesCourseId}"]`).forEach((slot) => {
        slot.classList.add("has-notes")
      })

      showNotification("Notes saved successfully", "success", 2000)
    } else {
      // Remove notes if empty
      delete courseNotes[currentNotesCourseId]

      // Remove visual indicator
      document.querySelectorAll(`.time-slot[data-course-id="${currentNotesCourseId}"]`).forEach((slot) => {
        slot.classList.remove("has-notes")
      })
    }

    closeNotesModal()
  }
}

/**
 * Export the schedule as PDF or image
 */
function exportSchedule(format) {
  if (format === "pdf") {
    // Simple approach: use browser print functionality
    showNotification("Preparing PDF export...", "normal", 2000)
    setTimeout(() => {
      window.print()
    }, 500)
  }
}

// --- Search Popup Logic ---
function togglePopup() {
  /* (No changes needed) */ if (!popup) return
  const isVisible = popup.style.display === "block"
  popup.style.display = isVisible ? "none" : "block"
  if (!isVisible) {
    if (popupSearchInput) {
      popupSearchInput.value = ""
      popupSearchInput.focus()
    }
    if (popupResultsContainer)
      popupResultsContainer.innerHTML = "<p>Enter Course Code or Instructor Name and press Enter.</p>"
    currentSearchResults = []
  }
}

// Enhance the popup search results to show more details and department styling
function popupSearch(event) {
  if (event.key === "Enter") {
    if (!popupSearchInput || !popupResultsContainer) return

    const query = popupSearchInput.value.trim()
    const queryLower = query.toLowerCase()
    currentSearchResults = []

    if (!query) {
      popupResultsContainer.innerHTML = "<p>Please enter a search term.</p>"
      return
    }

    if (courses.length === 0) {
      popupResultsContainer.innerHTML = "<p>Course data not ready or is empty.</p>"
      return
    }

    currentSearchResults = courses.filter(
      (c) => c.Class?.toLowerCase().includes(queryLower) || c.Instructor?.toLowerCase().includes(queryLower),
    )

    if (currentSearchResults.length > 0) {
      popupResultsContainer.innerHTML = currentSearchResults
        .map((c, index) => {
          const deptCode = getDepartmentCode(c.Class)
          const deptClass = deptCode ? `dept-${deptCode}` : ""

          return `
                <div class="${deptClass}" style="border-left: 4px solid; padding-left: 10px;">
                    <span>
                        <strong>${c.Class} ${c.Section}</strong><br>
                        <small>${c.DaysTimes || "TBA"}</small>
                        <span class="professor-clickable" onclick="showRatingPanel(event, '${c.Instructor}')">
                         ${c.Instructor || "N/A"}
                        </span>
                    </span>
                    <button class="add-button" data-course-index="${index}">Add</button>
                </div>`
        })
        .join("")
    } else {
      const p = document.createElement("p")
      p.textContent = `No courses found matching "${query}".`
      popupResultsContainer.innerHTML = ""
      popupResultsContainer.appendChild(p)
    }
  }
}

function addFromSearch(course) {
  /* (No changes needed) */ if (!course?.Class) {
    alert("Cannot add: Invalid data.")
    return
  }
  const alreadyAdded = selectedCourses.some((sc) => sc.Class === course.Class && sc.Section === course.Section)
  if (alreadyAdded) {
    showNotification(`${course.Class} ${course.Section} is already added.`, "warning", 3000)
    return
  }
  if (!hasConflict(course)) {
    selectedCourses.push(course)
    renderSchedule()
    updateScheduleStats()
    if (currentView === "list") {
      updateListView()
    }
    showNotification(`${course.Class} ${course.Section} added.`, "success", 3000)
  } else {
    showNotification(`Conflict: Cannot add ${course.Class} ${course.Section}.`, "warning")
  }
}

// --- Notification Function ---
let notificationTimeoutId = null
function showNotification(message, type = "normal", duration = 4000) {
  /* (No changes needed) */ if (!notificationArea) {
    alert(message)
    return
  }
  const notification = document.createElement("div")
  notification.className = `notification ${type}`
  notification.textContent = message
  notification.addEventListener(
    "click",
    () => {
      notification.classList.remove("visible")
      notification.addEventListener("transitionend", () => notification.remove(), { once: true })
      if (notificationTimeoutId === Number(notification.dataset.timeoutId)) {
        clearTimeout(notificationTimeoutId)
        notificationTimeoutId = null
      }
    },
    { once: true },
  )
  notificationArea.appendChild(notification)
  requestAnimationFrame(() => notification.classList.add("visible"))
  if (notificationTimeoutId) clearTimeout(notificationTimeoutId)
  const newTimeoutId = setTimeout(() => {
    if (notification.parentElement) {
      notification.classList.remove("visible")
      notification.addEventListener("transitionend", () => notification.remove(), { once: true })
    }
    if (notificationTimeoutId === newTimeoutId) notificationTimeoutId = null
  }, duration)
  notification.dataset.timeoutId = newTimeoutId.toString()
  notificationTimeoutId = newTimeoutId
}

// --- Event Listener Setup ---
function setupEventListeners() {
  // Listener for search results
  if (popupResultsContainer) {
    popupResultsContainer.addEventListener("click", (event) => {
      if (event.target?.classList.contains("add-button")) {
        const button = event.target
        const courseIndexStr = button.dataset.courseIndex
        if (courseIndexStr != null) {
          const index = Number.parseInt(courseIndexStr, 10)
          if (
            !isNaN(index) &&
            Array.isArray(currentSearchResults) &&
            index >= 0 &&
            index < currentSearchResults.length
          ) {
            const courseToAdd = currentSearchResults[index]
            if (courseToAdd?.Class) addFromSearch(courseToAdd)
            else {
              console.error("Invalid course obj!", courseToAdd)
              alert("Internal Error: Course data issue.")
            }
          } else {
            console.error(`Invalid index ${index} / results issue.`)
            alert("Internal Error: Index mismatch.")
          }
        } else {
          console.error("Button index missing.")
          alert("Internal Error: Button data missing.")
        }
      }
    })
    console.log("Added listener to #popup-results.")
  } else {
    console.error("Could not find #popup-results.")
  }
  // Listener for modal confirm button
  if (modalConfirmButton) {
    modalConfirmButton.addEventListener("click", handleModalConfirm)
    console.log("Added listener to #modal-confirm-button.")
  } else {
    console.error("Modal confirm button not found!")
  }
}

/**
 * Handles the click on the modal's confirm button.
 * Validates selection, hides modal, updates display, fetches courses.
 */
function handleModalConfirm() {
  if (!majorSelect || !yearSelect) {
    updateModalStatus("Internal Error: Dropdowns missing.", true)
    return
  }
  const major = majorSelect.value
  const year = yearSelect.value

  // Validate selection
  if (!major || majorSelect.options[majorSelect.selectedIndex]?.disabled) {
    updateModalStatus("Please select a valid major.", true)
    return
  }
  if (!year) {
    updateModalStatus("Please select a year.", true)
    return
  }

  selectedMajor = major
  selectedYear = year // Store globally
  console.log(`Modal confirmed: ${selectedMajor} - ${selectedYear}`)
  if (modalOverlay) modalOverlay.classList.remove("modal-visible") // Hide modal
  updateSelectionDisplay() // Update main display text

  // Show Loading Indicator and disable buttons
  if (loadingIndicator) loadingIndicator.style.display = "flex"
  disableButtons(true) // Ensure main buttons are disabled
  showNotification("Loading course data...", "normal", 3000)

  // Fetch Courses now
  fetchCourses()
    .then(() => {
      // Hide indicator on success
      if (loadingIndicator) loadingIndicator.style.display = "none"
      // Check if courses actually loaded
      if (courses && courses.length > 0) {
        console.log("Course data loaded successfully after modal confirmation.")
        disableButtons(false) // Enable main buttons
        showNotification("Course data loaded.", "success", 2000)
        // You could potentially call generateBestSchedule() here automatically if desired
      } else {
        // If fetch succeeded but parsing resulted in empty array
        throw new Error("Failed to load valid course data (parsing result empty).")
      }
    })
    .catch((error) => {
      // Hide indicator on error
      if (loadingIndicator) loadingIndicator.style.display = "none"
      console.error("Failed to load courses after modal confirmation:", error)
      showNotification(`Error loading courses: ${error.message}`, "error", 10000)
      disableButtons(true) // Keep buttons disabled
      if (selectionDisplay) selectionDisplay.innerHTML += ` <span style="color:red;">(Error loading courses)</span>`
    })
}

// --- Application Initialization --- (Revised Flow) ---
function initializeApp() {
  console.log("Initializing application...")
  disableButtons(true) // Disable main buttons from the start
  // Initial message is set in HTML

  // Check essential elements
  if (!modalOverlay || !modalConfirmButton || !majorSelect || !loadingIndicator) {
    console.error("Essential UI elements not found! Cannot initialize properly.")
    alert("Error initializing page. Critical UI elements missing.")
    return // Stop initialization if modal elements are missing
  }

  // 1. Show Modal & Set Initial State
  updateModalStatus("Loading majors...", false)
  majorSelect.disabled = true // Disable major select until populated
  modalConfirmButton.disabled = true // Disable confirm until major select is ready
  modalOverlay.classList.add("modal-visible")
  console.log("Modal displayed. Fetching requirements...")

  // 2. Fetch Requirements for Modal Dropdown
  fetchRequirements()
    .then(() => {
      const majorsWerePopulated = populateMajorsDropdown()
      if (majorsWerePopulated) {
        updateModalStatus("Please make your selection.", false)
        modalConfirmButton.disabled = false // Enable confirm button
      } else {
        updateModalStatus("No majors available.", true) // Show error in modal
        modalConfirmButton.disabled = true // Keep confirm disabled
      }
    })
    .catch((error) => {
      console.error("Initialization failed - Could not fetch requirements:", error)
      updateModalStatus(`Error loading majors: ${error.message}`, true)
      showNotification(`Failed to load majors: ${error.message}`, "error", 10000)
      modalConfirmButton.disabled = true // Ensure confirm disabled on error
    })

  // 3. Setup event listeners (for modal button and search results)
  setupEventListeners()

  // 4. Fetch Ratings Data
  fetchRatingsData();

  console.log("Initialization setup complete. Waiting for modal confirmation...")
  // Course fetching & main UI enabling now happens in handleModalConfirm
}

// --- Start the application ---
initializeApp()

//register function
  function registerCourses() {
    const user = localStorage.getItem('loggedInUser');
    if (!user) {
      alert("You need to login to use this feature.");
      return;
    }
    // Assuming selectedCourses is a global variable with the current courses added
    localStorage.setItem('registeredCourses_' + user, JSON.stringify(selectedCourses));
    alert("Courses registered successfully for " + user + "!");
  }

  //login/logout functionality
  window.addEventListener('DOMContentLoaded', function() {
    const loginBtn = document.getElementById('loginBtn');
    const loggedInUser = localStorage.getItem('loggedInUser');
    const usernameDisplay = document.getElementById('usernameDisplay');
  
    if (loggedInUser) {
      // Change the login/signup button into a logout button
      loginBtn.textContent = 'Logout';
      loginBtn.onclick = function() {
        localStorage.removeItem('loggedInUser');
        alert('Logged out successfully.');
        location.reload();
      };
  
      // Update the username display
      if (usernameDisplay) {
        usernameDisplay.textContent = loggedInUser;
      }
  
      // Retrieve and render any courses registered for the logged-in user
      const storedCourses = localStorage.getItem('registeredCourses_' + loggedInUser);
      if (storedCourses) {
        selectedCourses = JSON.parse(storedCourses);
        renderSchedule();
        updateScheduleStats();
      }
    } else {
      // Optionally, hide the username display if not logged in:
      if (usernameDisplay) {
        usernameDisplay.textContent = 'Guest';
      }
    }
  });  

  function showRatingPanel(event, professorName) {
    // Look up the rating information using case-insensitive matching
    const info = ratingsData.find(r => r.Instructor.trim().toLowerCase() === professorName.trim().toLowerCase());
    let panelContent = info ?
         `<strong>${professorName}</strong><br>
         Rating: ${info.RMP_Rating || "N/A"}<br>
         Reviews:<br>
         ${info.RMP_Review1 || "No review"}<br>
         ${info.RMP_Review2 || ""}<br>
         ${info.RMP_Review3 || ""}` :
         `<strong>${professorName}</strong><br>No rating information found.`;

    // Create or update the hovering panel
    let panel = document.getElementById("rating-panel");
    if (!panel) {
         panel = document.createElement("div");
         panel.id = "rating-panel";
         panel.className = "rating-panel";
         document.body.appendChild(panel);
    }
    panel.innerHTML = panelContent;

    // Position the panel near the clicked element
    const rect = event.target.getBoundingClientRect();
    panel.style.top = (rect.bottom + window.scrollY + 5) + "px";
    panel.style.left = (rect.left + window.scrollX) + "px";
    panel.style.display = "block";

    // Hide the panel when clicking outside
    document.addEventListener("click", function handler(e) {
         if (!panel.contains(e.target) && e.target !== event.target) {
              panel.style.display = "none";
              document.removeEventListener("click", handler);
         }
    });
}