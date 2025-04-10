import React, { useState, useEffect, useMemo } from 'react';
import CourseCard from '@/components/CourseCard';
import type { SelectedCourse } from '@/lib/types';
import { DragDropContext, Droppable, Draggable, DroppableProvided, DraggableProvided, DroppableStateSnapshot, DraggableStateSnapshot, DropResult } from '@hello-pangea/dnd';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Download } from 'lucide-react';

interface CalendarViewProps {
  courses: SelectedCourse[];
  onShowDetails: (course: SelectedCourse) => void;
  onOpenNotes?: (courseId: string) => void;
  onRemoveCourse?: (courseId: string) => void;
  courseNotes: Record<string, string>;
  onCourseDrop?: (courseId: string, newDay: string, newTime: string) => void;
}

export function CalendarView({ 
  courses, 
  onShowDetails, 
  onOpenNotes = () => {}, 
  onRemoveCourse = () => {}, 
  courseNotes = {},
  onCourseDrop = () => {} 
}: CalendarViewProps) {
  const [selectedCourse, setSelectedCourse] = useState<SelectedCourse | null>(null);

  // Add a unique key to force re-render when courses change
  const [calendarKey, setCalendarKey] = useState(Date.now());
  
  // Force a re-render whenever courses change
  useEffect(() => {
    setCalendarKey(Date.now());
    console.log("Calendar refreshing with", courses.length, "courses");
  }, [courses]);

  function parseTimeToMinutes(timeStr: string): number {
    if (!timeStr) return 0;
    
    const [hoursStr, minutesWithAmPm] = timeStr.split(':');
    if (!hoursStr || !minutesWithAmPm) return 0;
    
    let hours = parseInt(hoursStr, 10);
    const isPM = minutesWithAmPm.toLowerCase().includes('pm') && hours !== 12;
    const isAM = minutesWithAmPm.toLowerCase().includes('am') && hours === 12;
    
    if (isPM) hours += 12;
    if (isAM) hours = 0;
    
    const minutes = parseInt(minutesWithAmPm.substring(0, 2), 10);
    return hours * 60 + minutes;
  }

  // Format minutes back to time string
  const formatTime = (minutes: number): string => {
    const hours24 = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const hours12 = hours24 > 12 ? hours24 - 12 : hours24 === 0 ? 12 : hours24;
    const ampm = hours24 >= 12 ? 'PM' : 'AM';
    return `${hours12}:${mins.toString().padStart(2, '0')}${ampm}`;
  };

  // Generate a unique list of all time slots based on DaysTimes
  const allTimeSlots = useMemo(() => {
    const timeSlots = new Set<string>();
    
    // Add standard time slots for working hours
    for (let hour = 8; hour <= 20; hour++) {
      const h = hour > 12 ? hour - 12 : hour;
      const amPm = hour >= 12 ? "PM" : "AM";
      timeSlots.add(`${h}:00${amPm}`);
    }
    
    // Add actual course time slots
    courses.forEach((course) => {
      if (course.DaysTimes) {
        const timeMatch = course.DaysTimes.match(/(\d{1,2}:\d{2}[AP]M)\s*-\s*(\d{1,2}:\d{2}[AP]M)/i);
        if (timeMatch) {
          timeSlots.add(timeMatch[1]);  // Start time
          timeSlots.add(timeMatch[2]);  // End time
        }
      }
    });
    
    // Convert to array and sort
    return Array.from(timeSlots)
      .sort((a, b) => {
        const timeA = parseTimeToMinutes(a) || 0;
        const timeB = parseTimeToMinutes(b) || 0;
        return timeA - timeB;
      });
  }, [courses]);

  // Extract unique days from courses
  const uniqueDays = useMemo(() => {
    // Define the ordered weekdays we want to display
    const orderedDays = ['Mo', 'Tu', 'We', 'Th', 'Fr'];
    
    // Always return all weekdays in the correct order
    return orderedDays;
  }, []);

  const getDayName = (day: string): string => {
    const dayNames = {
      'Mo': 'Monday',
      'Tu': 'Tuesday',
      'We': 'Wednesday',
      'Th': 'Thursday',
      'Fr': 'Friday'
    };
    return dayNames[day as keyof typeof dayNames] || day;
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    
    const courseId = result.draggableId;
    const newDay = result.destination.droppableId;
    const timeSlot = allTimeSlots[Math.floor((result.destination.index / 100) * allTimeSlots.length)];
    
    onCourseDrop(courseId, newDay, timeSlot);
  };

  const exportCalendar = () => {
    // Create iCal format string
    let icalContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Course Scheduler//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH'
    ];

    // Add each course as an event
    courses.forEach(course => {
      if (!course.DaysTimes) return;

      const timeMatch = course.DaysTimes.match(/(\d{1,2}:\d{2}[AP]M)\s*-\s*(\d{1,2}:\d{2}[AP]M)/i);
      if (!timeMatch) return;

      const startTime = timeMatch[1];
      const endTime = timeMatch[2];
      const days = course.DaysTimes.match(/[MTWFS][ouehra]/g) || [];

      // Convert time to 24-hour format
      const parseTime = (timeStr: string) => {
        const [hours, minutes] = timeStr.split(':');
        const ampm = timeStr.slice(-2).toUpperCase();
        let hour = parseInt(hours);
        if (ampm === 'PM' && hour !== 12) hour += 12;
        if (ampm === 'AM' && hour === 12) hour = 0;
        return `${hour.toString().padStart(2, '0')}${minutes.slice(0, 2)}`;
      };

      const startTime24 = parseTime(startTime);
      const endTime24 = parseTime(endTime);

      // Create an event for each day
      days.forEach(day => {
        const dayMap: Record<string, number> = {
          'Mo': 1, 'Tu': 2, 'We': 3, 'Th': 4, 'Fr': 5
        };
        const dayNum = dayMap[day];
        if (!dayNum) return;

        // Create a date for the current semester (assuming Fall 2024)
        const startDate = new Date(2024, 8, 2); // September 2, 2024
        const eventDate = new Date(startDate);
        eventDate.setDate(startDate.getDate() + (dayNum - 1));

        const formatDate = (date: Date, time: string) => {
          return `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}T${time}00`;
        };

        icalContent.push(
          'BEGIN:VEVENT',
          `DTSTART:${formatDate(eventDate, startTime24)}`,
          `DTEND:${formatDate(eventDate, endTime24)}`,
          `SUMMARY:${course.Class || 'Unknown Course'} - ${course.Section || 'Unknown Section'}`,
          `LOCATION:${course.Room || 'TBD'}`,
          `DESCRIPTION:Instructor: ${course.Instructor || 'TBD'}\\nNotes: ${courseNotes[course.id] || 'No notes'}`,
          'END:VEVENT'
        );
      });
    });

    icalContent.push('END:VCALENDAR');

    // Create and download the file
    const blob = new Blob([icalContent.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'course_schedule.ics');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const renderCalendar = () => {
    return (
      <>
        <div className="flex justify-end mb-4">
          <button
            onClick={exportCalendar}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Download size={16} />
            Export Calendar
          </button>
        </div>
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="border rounded-xl overflow-hidden shadow-lg bg-white dark:bg-gray-900">
            <div className="flex">
              {/* Time column */}
              <div className="relative border-r min-h-[800px] w-20 bg-gray-50 dark:bg-gray-800">
                {Array.from({ length: 14 }).map((_, i) => {
                  const hour = i + 8;
                  const formattedHour = hour > 12 ? `${hour - 12} PM` : hour === 12 ? '12 PM' : `${hour} AM`;
                  const top = (i / 14) * 100;
                  
                  return (
                    <div
                      key={hour}
                      className="absolute left-0 right-0 border-t border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 pl-3 py-1 font-medium"
                      style={{ top: `${top}%` }}
                    >
                      {formattedHour}
                    </div>
                  );
                })}
              </div>
              
              {/* Days columns */}
              {uniqueDays.map(day => (
                <Droppable key={day} droppableId={day}>
                  {(provided: DroppableProvided, snapshot: DroppableStateSnapshot) => (
                    <div 
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="flex flex-col flex-1 min-w-[200px] border-r border-gray-200 dark:border-gray-700 last:border-r-0"
                    >
                      <div className={`py-4 text-center font-semibold border-b border-gray-200 dark:border-gray-700 
                        ${snapshot.isDraggingOver ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-gray-50 dark:bg-gray-800'}`}>
                        <span className="text-gray-700 dark:text-gray-300 text-lg">
                          {getDayName(day)}
                        </span>
                      </div>
                      <div className="relative flex-1 min-h-[800px]">
                        {courses
                          .filter(course => course.DaysTimes?.includes(day))
                          .map((course, index) => {
                            const timeMatch = course.DaysTimes?.match(/(\d{1,2}:\d{2}[AP]M)\s*-\s*(\d{1,2}:\d{2}[AP]M)/i);
                            if (!timeMatch) return null;
                            
                            const startTime = timeMatch[1];
                            const endTime = timeMatch[2];
                            const startMinutes = parseTimeToMinutes(startTime);
                            const endMinutes = parseTimeToMinutes(endTime);
                            
                            if (startMinutes === 0 || endMinutes === 0) return null;
                            
                            const dayStartMinutes = 8 * 60;
                            const dayEndMinutes = 22 * 60;
                            const dayDurationMinutes = dayEndMinutes - dayStartMinutes;
                            
                            const top = ((startMinutes - dayStartMinutes) / dayDurationMinutes) * 100;
                            const height = Math.max(15, ((endMinutes - startMinutes) / dayDurationMinutes) * 100);
                            
                            return (
                              <Draggable
                                key={`${course.id}-${day}`}
                                draggableId={course.id}
                                index={Math.floor((top / 100) * allTimeSlots.length)}
                              >
                                {(provided: DraggableProvided, snapshot: DraggableStateSnapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    className={`absolute left-0 right-0 px-2 transition-all duration-200 ease-in-out transform 
                                      ${snapshot.isDragging ? 'scale-105 shadow-xl z-50 opacity-90' : 'hover:scale-[1.02]'}`}
                                    style={{
                                      ...provided.draggableProps.style,
                                      top: `${Math.max(0, Math.min(100, top))}%`,
                                      height: `${height}%`,
                                      transition: snapshot.isDragging ? 'none' : 'all 0.2s ease-in-out'
                                    }}
                                    onClick={() => setSelectedCourse(course)}
                                  >
                                    <CourseCard
                                      course={course}
                                      position={{ top: 0, height: 100 }}
                                      hasNotes={!!courseNotes[course.id]}
                                      onShowDetails={() => setSelectedCourse(course)}
                                      onOpenNotes={() => onOpenNotes(course.id)}
                                      onRemove={() => onRemoveCourse(course.id)}
                                    />
                                  </div>
                                )}
                              </Draggable>
                            );
                          })}
                        {provided.placeholder}
                      </div>
                    </div>
                  )}
                </Droppable>
              ))}
            </div>
          </div>
        </DragDropContext>

        <Dialog.Root open={!!selectedCourse} onOpenChange={() => setSelectedCourse(null)}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
            <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-[90vw] max-w-2xl max-h-[85vh] overflow-y-auto">
              {selectedCourse && (
                <>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <Dialog.Title className="text-xl font-bold text-gray-900 dark:text-gray-100">
                        {selectedCourse.Class}
                      </Dialog.Title>
                      <Dialog.Description className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Section {selectedCourse.Section}
                      </Dialog.Description>
                    </div>
                    <Dialog.Close className="text-gray-400 hover:text-gray-500">
                      <X className="h-5 w-5" />
                    </Dialog.Close>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h3 className="font-medium text-gray-700 dark:text-gray-300">Schedule</h3>
                        <p className="text-gray-600 dark:text-gray-400">{selectedCourse.DaysTimes}</p>
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-700 dark:text-gray-300">Location</h3>
                        <p className="text-gray-600 dark:text-gray-400">{selectedCourse.Room}</p>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="font-medium text-gray-700 dark:text-gray-300">Instructor</h3>
                      <p className="text-gray-600 dark:text-gray-400">{selectedCourse.Instructor}</p>
                    </div>
                    
                    <div>
                      <h3 className="font-medium text-gray-700 dark:text-gray-300">Meeting Dates</h3>
                      <p className="text-gray-600 dark:text-gray-400">{selectedCourse.MeetingDates}</p>
                    </div>

                    {courseNotes[selectedCourse.id] && (
                      <div>
                        <h3 className="font-medium text-gray-700 dark:text-gray-300">Notes</h3>
                        <p className="text-gray-600 dark:text-gray-400">{courseNotes[selectedCourse.id]}</p>
                      </div>
                    )}
                  </div>

                  <div className="mt-6 flex justify-end gap-3">
                    <button
                      onClick={() => onOpenNotes(selectedCourse.id)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md dark:text-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600"
                    >
                      Edit Notes
                    </button>
                    <Dialog.Close className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md">
                      Close
                    </Dialog.Close>
                  </div>
                </>
              )}
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </>
    );
  };

  return renderCalendar();
} 