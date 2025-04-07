import type { Course, SelectedCourse } from "./types"

// Improve the hasConflict function to better handle CSV data format
export function hasConflict(newCourse: Course, existingCourses: SelectedCourse[]): boolean {
  if (!newCourse?.DaysTimes || typeof newCourse.DaysTimes !== "string") return false

  // Improved regex to handle various day formats from CSV
  const dayRegex = /Mo|Tu|We|Th|Fr|Monday|Tuesday|Wednesday|Thursday|Friday/gi
  const timeRegex = /(\d{1,2}):(\d{2})\s*([AP]M)\s*-\s*(\d{1,2}):(\d{2})\s*([AP]M)/i

  const newDays = newCourse.DaysTimes.match(dayRegex) || []
  const newTimeMatch = newCourse.DaysTimes.match(timeRegex)

  if (!newTimeMatch || newDays.length === 0) return false

  const parseTimeToMinutes = (h: string, m: string, ap: string): number => {
    let hr = Number.parseInt(h, 10)
    const mn = Number.parseInt(m, 10)

    if (typeof ap !== "string" || isNaN(hr) || isNaN(mn) || hr < 1 || hr > 12 || mn < 0 || mn > 59) {
      return Number.NaN
    }

    const isPM = ap.toUpperCase() === "PM"
    if (isPM && hr !== 12) hr += 12
    else if (!isPM && hr === 12) hr = 0

    return hr * 60 + mn
  }

  const newStart = parseTimeToMinutes(newTimeMatch[1], newTimeMatch[2], newTimeMatch[3])
  const newEnd = parseTimeToMinutes(newTimeMatch[4], newTimeMatch[5], newTimeMatch[6])

  if (isNaN(newStart) || isNaN(newEnd) || newStart >= newEnd) return false

  // Map full day names to abbreviations for comparison
  const dayNameMap: Record<string, string> = {
    monday: "mo",
    tuesday: "tu",
    wednesday: "we",
    thursday: "th",
    friday: "fr",
  }

  // Normalize day names to abbreviations
  const normalizedNewDays = newDays.map((day) => {
    const lowerDay = day.toLowerCase()
    return dayNameMap[lowerDay] || lowerDay
  })

  for (const existingCourse of existingCourses) {
    if (!existingCourse?.DaysTimes || typeof existingCourse.DaysTimes !== "string") continue

    const existingDays = existingCourse.DaysTimes.match(dayRegex) || []
    const existingTimeMatch = existingCourse.DaysTimes.match(timeRegex)

    if (!existingTimeMatch || existingDays.length === 0) continue

    const existingStart = parseTimeToMinutes(existingTimeMatch[1], existingTimeMatch[2], existingTimeMatch[3])
    const existingEnd = parseTimeToMinutes(existingTimeMatch[4], existingTimeMatch[5], existingTimeMatch[6])

    if (isNaN(existingStart) || isNaN(existingEnd) || existingStart >= existingEnd) continue

    // Normalize existing days to abbreviations
    const normalizedExistingDays = existingDays.map((day) => {
      const lowerDay = day.toLowerCase()
      return dayNameMap[lowerDay] || lowerDay
    })

    // Check for day overlap
    const daysOverlap = normalizedNewDays.some((nd) => normalizedExistingDays.some((ed) => nd === ed))

    if (daysOverlap) {
      const timeOverlap = newStart < existingEnd && existingStart < newEnd
      if (timeOverlap) {
        return true
      }
    }
  }

  return false
}
