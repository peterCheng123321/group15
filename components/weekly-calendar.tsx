"use client"

import type { SelectedCourse } from "@/lib/types"
import { getDepartmentCode } from "@/lib/utils"

interface WeeklyCalendarProps {
  selectedCourses: SelectedCourse[]
  onShowDetails: (course: SelectedCourse) => void
  courseNotes: Record<string, string>
}

export function WeeklyCalendar({ selectedCourses, onShowDetails, courseNotes }: WeeklyCalendarProps) {
  const CALENDAR_START_HOUR = 8 // 8 AM
  const HOUR_HEIGHT = 60 // 60px per hour
  const MINUTES_PER_HOUR = 60
  const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
  const dayMap = { mo: "Monday", tu: "Tuesday", we: "Wednesday", th: "Thursday", fr: "Friday" }

  // Generate time markers (8 AM to 7 PM)
  const timeMarkers = Array.from({ length: 12 }, (_, i) => {
    const hour = i + CALENDAR_START_HOUR
    return hour <= 12 ? `${hour} AM` : `${hour - 12} PM`
  })

  return (
    <div className="mt-6 print:mt-0">
      <div className="grid grid-cols-[50px_repeat(5,1fr)] gap-3">
        {/* Time column */}
        <div className="flex flex-col items-end pr-2 pt-[50px]">
          {timeMarkers.map((time, index) => (
            <div key={index} className="h-[60px] flex items-center text-gray-500 text-sm font-medium">
              {time}
            </div>
          ))}
        </div>

        {/* Days columns */}
        {daysOfWeek.map((day) => (
          <div key={day} className="bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col">
            <div className="p-3 border-b border-gray-200 font-semibold text-center">{day}</div>
            <div className="relative flex-grow h-[720px]">
              {/* Hour grid lines */}
              <div className="absolute inset-0 flex flex-col pointer-events-none">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="h-[60px] border-t border-dashed border-gray-200 w-full" />
                ))}
              </div>

              {/* Time slots */}

              {/* Time slots */}
              <div className="absolute inset-0 p-2">
                {selectedCourses.map((course) => {
                  if (!course.DaysTimes) return null

                  const dayRegex = /Mo|Tu|We|Th|Fr/gi
                  const matchedDays = course.DaysTimes.match(dayRegex) || []

                  if (matchedDays.length === 0) {
                    // Handle TBA courses - only show on Monday
                    if (day === "Monday") {
                      return (
                        <div
                          key={course.id}
                          className={`absolute top-0 left-0 right-0 min-h-[60px] p-3 rounded-md border-l-4 ${getDepartmentClass(course.Class)} ${courseNotes[course.id] ? "has-notes" : ""}`}
                          onClick={() => onShowDetails(course)}
                        >
                          <div className="font-semibold">
                            {course.Class} {course.Section} (TBA)
                          </div>
                          <div className="text-sm text-primary-600">{course.DaysTimes}</div>
                          <div className="text-xs text-gray-500">
                            {course.Instructor} - {course.Room}
                          </div>
                        </div>
                      )
                    }
                    return null
                  }

                  // Check if this course should be displayed on this day
                  const shouldDisplayOnDay = matchedDays.some(
                    (d) => dayMap[d.toLowerCase() as keyof typeof dayMap] === day,
                  )

                  if (!shouldDisplayOnDay) return null

                  // Parse time for positioning
                  const timeRegex = /(\d{1,2}):(\d{2})\s*([AP]M)\s*-\s*(\d{1,2}):(\d{2})\s*([AP]M)/i
                  const timeMatch = course.DaysTimes.match(timeRegex)

                  if (!timeMatch) return null

                  // Calculate position and height
                  const startHour = Number.parseInt(timeMatch[1])
                  const startMinute = Number.parseInt(timeMatch[2])
                  const startPeriod = timeMatch[3].toUpperCase()
                  const endHour = Number.parseInt(timeMatch[4])
                  const endMinute = Number.parseInt(timeMatch[5])
                  const endPeriod = timeMatch[6].toUpperCase()

                  // Convert to 24-hour format
                  let start24Hour = startHour
                  if (startPeriod === "PM" && startHour !== 12) start24Hour += 12
                  if (startPeriod === "AM" && startHour === 12) start24Hour = 0

                  let end24Hour = endHour
                  if (endPeriod === "PM" && endHour !== 12) end24Hour += 12
                  if (endPeriod === "AM" && endHour === 12) end24Hour = 0

                  // Calculate minutes from calendar start
                  const startMinutes = start24Hour * 60 + startMinute - CALENDAR_START_HOUR * 60
                  const endMinutes = end24Hour * 60 + endMinute - CALENDAR_START_HOUR * 60

                  // Calculate position and height
                  const topPosition = (startMinutes / MINUTES_PER_HOUR) * HOUR_HEIGHT
                  const height = ((endMinutes - startMinutes) / MINUTES_PER_HOUR) * HOUR_HEIGHT

                  return (
                    <div
                      key={`${course.id}-${day}`}
                      className={`absolute p-2 rounded-md border-l-4 shadow-sm transition-all hover:translate-y-[-2px] hover:shadow-md ${getDepartmentClass(course.Class)} ${courseNotes[course.id] ? "has-notes" : ""}`}
                      style={{
                        top: `${topPosition}px`,
                        height: `${height}px`,
                        left: "4px",
                        right: "4px",
                      }}
                      onClick={() => onShowDetails(course)}
                    >
                      <div className="font-semibold text-sm">
                        {course.Class} {course.Section}
                      </div>
                      <div className="text-xs text-primary-600">
                        {timeMatch[1]}:{timeMatch[2]} {timeMatch[3]}-{timeMatch[4]}:{timeMatch[5]} {timeMatch[6]}
                      </div>
                      <div className="text-xs text-gray-500">{course.Instructor}</div>
                      <div className="text-xs text-gray-500">{course.Room}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Helper function to get department styling class
function getDepartmentClass(className?: string): string {
  if (!className) return "border-gray-400 bg-gray-100"

  const deptCode = getDepartmentCode(className)

  const deptColors: Record<string, string> = {
    BEN: "border-blue-500 bg-blue-50",
    CSE: "border-green-500 bg-green-50",
    MAE: "border-red-500 bg-red-50",
    CEN: "border-yellow-500 bg-yellow-50",
    CEE: "border-purple-500 bg-purple-50",
    ELE: "border-teal-500 bg-teal-50",
    MAT: "border-orange-500 bg-orange-50",
    PHY: "border-indigo-500 bg-indigo-50",
    CHE: "border-emerald-500 bg-emerald-50",
    ECS: "border-cyan-500 bg-cyan-50",
    AEE: "border-rose-500 bg-rose-50",
    WRT: "border-gray-500 bg-gray-50",
  }

  return deptColors[deptCode] || "border-gray-400 bg-gray-100"
}
