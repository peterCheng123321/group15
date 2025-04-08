"use client"

import { useState, useEffect } from "react"
import { AppHeader } from "./app-header"
import { MainControls } from "./main-controls"
import { Dashboard } from "./dashboard"
import { SearchPopup } from "./search-popup"
import { CourseDetailsModal } from "./course-details-modal"
import { CourseNotesModal } from "./course-notes-modal"
import { InitialSelectionModal } from "./initial-selection-modal"
import { NotificationArea } from "./notification-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AcademicDataVisualizer } from "./academic-data-visualizer"
import { Calendar, GraduationCap, BookOpen } from "lucide-react"
import type { Course, SelectedCourse, Notification, Major, Requirements } from "@/lib/types"
import { fetchCourses, fetchRequirements } from "@/lib/data-utils"
import { hasConflict } from "@/lib/schedule-utils"

export default function CourseScheduler() {
  // State
  const [courses, setCourses] = useState<Course[]>([])
  const [requirements, setRequirements] = useState<Requirements>({})
  const [selectedCourses, setSelectedCourses] = useState<SelectedCourse[]>([])
  const [currentSearchResults, setCurrentSearchResults] = useState<Course[]>([])
  const [selectedMajor, setSelectedMajor] = useState<string>("")
  const [selectedYear, setSelectedYear] = useState<string>("")
  const [currentView, setCurrentView] = useState<"calendar" | "list">("calendar")
  const [courseNotes, setCourseNotes] = useState<Record<string, string>>({})
  const [currentNotesCourseId, setCurrentNotesCourseId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [isSearchPopupOpen, setIsSearchPopupOpen] = useState<boolean>(false)
  const [isCourseDetailsModalOpen, setIsCourseDetailsModalOpen] = useState<boolean>(false)
  const [isNotesModalOpen, setIsNotesModalOpen] = useState<boolean>(false)
  const [isInitialModalOpen, setIsInitialModalOpen] = useState<boolean>(true)
  const [currentCourseDetails, setCurrentCourseDetails] = useState<Course | null>(null)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [majors, setMajors] = useState<Major[]>([])
  const [isDataReady, setIsDataReady] = useState<boolean>(false)
  const [activeTab, setActiveTab] = useState("schedule")

  // Initialize app
  useEffect(() => {
    const initializeApp = async () => {
      try {
        setIsLoading(true);
        const requirementsData = await fetchRequirements()
        setRequirements(requirementsData)
        console.log("Requirements loaded:", Object.keys(requirementsData).length, "majors");

        // Extract majors directly from the requirements
        const majorsList = Object.keys(requirementsData).map((majorName) => ({
          id: majorName,
          name: majorName,
        }));

        setMajors(majorsList)
        setIsDataReady(true)
        
        // Load courses right away
        try {
          const coursesData = await fetchCourses()
          setCourses(coursesData)
          console.log("Courses loaded:", coursesData.length);
          showNotification("Course data loaded successfully", "success")
        } catch (error) {
          console.error("Failed to load courses:", error)
          showNotification("Failed to load courses. Please try again.", "error")
        }
      } catch (error) {
        console.error("Failed to initialize app:", error)
        showNotification("Failed to load majors. Please refresh the page.", "error")
      } finally {
        setIsLoading(false);
      }
    }

    initializeApp()
  }, [])

  // Only generate schedule after major and year selection
  useEffect(() => {
    if (selectedMajor && selectedYear && courses.length > 0) {
      // Automatically generate a schedule when selection changes
      // generateBestSchedule() // Uncomment this if you want auto-generation
    }
  }, [selectedMajor, selectedYear, courses.length])

  const loadCourses = async () => {
    setIsLoading(true)
    try {
      const coursesData = await fetchCourses()
      setCourses(coursesData)
      console.log("Loaded courses:", coursesData.length);
      showNotification("Course data loaded successfully", "success")
    } catch (error) {
      console.error("Failed to load courses:", error)
      showNotification("Failed to load courses. Please try again.", "error")
    } finally {
      setIsLoading(false)
    }
  }

  // Generate best schedule based on major and year
  const generateBestSchedule = () => {
    if (!selectedMajor || !selectedYear || Object.keys(requirements).length === 0) {
      showNotification("Please confirm selection or wait for data to load.", "error");
      return;
    }

    if (courses.length === 0) {
      showNotification("No courses available. Please try refreshing the page.", "error");
      console.error("Courses array is empty when generating schedule");
      return;
    }

    console.log("Generating schedule for major:", selectedMajor, "year:", selectedYear);
    console.log("Available courses:", courses.length);
    console.log("Requirements keys:", Object.keys(requirements));

    // Reset current schedule
    setSelectedCourses([]);

    // Get suggested courses for the selected major and year
    const majorRequirements = requirements[selectedMajor];
    if (!majorRequirements) {
      showNotification(`No requirements found for major: ${selectedMajor}`, "error");
      console.error("Could not find requirements for major:", selectedMajor);
      return;
    }

    const yearRequirements = majorRequirements[selectedYear];
    if (!yearRequirements || !Array.isArray(yearRequirements) || yearRequirements.length === 0) {
      showNotification(`No suggested courses listed for ${selectedMajor} - ${selectedYear}.`, "warning");
      console.error("Year requirements missing or empty for:", selectedMajor, selectedYear);
      return;
    }

    console.log("Required courses for", selectedMajor, selectedYear, ":", yearRequirements);

    // Print first few courses for debugging
    console.log("Sample available courses:");
    courses.slice(0, 5).forEach(course => {
      console.log(`- ${course.id}: Class=${course.Class}, Section=${course.Section}`);
    });

    let coursesAddedCount = 0;
    const newSelectedCourses: SelectedCourse[] = [];
    const notFoundCourses: string[] = [];

    // Loop through each course code
    for (let i = 0; i < yearRequirements.length; i++) {
      const code = yearRequirements[i];
      if (!code) continue;

      // Handle both formats - with or without spaces
      const normalizedCode = code.trim();
      const codeWithoutSpace = normalizedCode.replace(/\s+/g, '');
      
      // Find all possible sections of this course - more flexible matching
      const possibleSections = courses.filter((c) => {
        if (!c.Class) return false;
        
        const courseClass = c.Class.trim();
        const courseClassNoSpace = courseClass.replace(/\s+/g, '');
        
        // Try multiple matching strategies
        return (
          courseClass.toLowerCase() === normalizedCode.toLowerCase() || // Exact match with spaces
          courseClassNoSpace.toLowerCase() === codeWithoutSpace.toLowerCase() || // Match without spaces
          courseClass.toLowerCase().includes(normalizedCode.toLowerCase()) // Partial match
        );
      });

      console.log(`Looking for course ${code}: found ${possibleSections.length} possible sections`);
      
      if (possibleSections.length === 0) {
        // Try a more lenient search if no matches found
        const lenientSections = courses.filter(c => 
          c.Class && c.Class.replace(/\s+/g, '').toLowerCase().includes(codeWithoutSpace.toLowerCase())
        );
        
        if (lenientSections.length > 0) {
          console.log(`Found ${lenientSections.length} sections with lenient matching for ${code}`);
          
          let added = false;
          for (const section of lenientSections) {
            if (!hasConflict(section, newSelectedCourses)) {
              newSelectedCourses.push({
                ...section,
                id: `course-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              });
              added = true;
              coursesAddedCount++;
              break;
            }
          }
          
          if (!added) {
            showNotification(`Could not add "${code}": All sections conflict.`, "warning");
          }
        } else {
          notFoundCourses.push(code);
        }
        continue;
      }

      let added = false;
      for (const section of possibleSections) {
        if (!hasConflict(section, newSelectedCourses)) {
          // Create a new SelectedCourse with a unique ID
          const newCourse: SelectedCourse = {
            ...section,
            id: `course-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          };
          
          newSelectedCourses.push(newCourse);
          added = true;
          coursesAddedCount++;
          break;
        }
      }

      if (!added && possibleSections.length > 0) {
        showNotification(`Could not add "${code}": All sections conflict.`, "warning");
      }
    }

    // Force a re-render by creating a new array
    setSelectedCourses([...newSelectedCourses]);
    console.log(`Added ${coursesAddedCount} courses to schedule. Schedule now has ${newSelectedCourses.length} courses.`);

    if (notFoundCourses.length > 0) {
      const message = notFoundCourses.length === 1 
        ? `Could not find course: ${notFoundCourses[0]}`
        : `Could not find ${notFoundCourses.length} courses: ${notFoundCourses.slice(0, 3).join(", ")}${notFoundCourses.length > 3 ? '...' : ''}`;
      
      showNotification(message, "warning");
      console.warn("Courses not found:", notFoundCourses);
    }

    if (coursesAddedCount > 0) {
      showNotification(`Added ${coursesAddedCount} course(s) to your schedule.`, "success");
    } else if (coursesAddedCount === 0 && notFoundCourses.length === 0) {
      showNotification("No courses could be added to your schedule.", "error");
    }
  };

  // Handle courses imported from image
  const handleImportFromImage = (importedCourses: SelectedCourse[]) => {
    if (importedCourses.length === 0) {
      showNotification("No courses were found in the image.", "warning")
      return
    }

    // Check for conflicts with existing courses
    const coursesToAdd: SelectedCourse[] = []
    const conflictingCourses: SelectedCourse[] = []

    importedCourses.forEach((course) => {
      if (hasConflict(course, selectedCourses)) {
        conflictingCourses.push(course)
      } else {
        coursesToAdd.push(course)
      }
    })

    // Add non-conflicting courses
    if (coursesToAdd.length > 0) {
      setSelectedCourses((prev) => [...prev, ...coursesToAdd])
      showNotification(`Added ${coursesToAdd.length} courses from image.`, "success")
    }

    // Notify about conflicts
    if (conflictingCourses.length > 0) {
      showNotification(`${conflictingCourses.length} course(s) had time conflicts and were not added.`, "warning")
    }
  }

  // Reset schedule
  const resetSchedule = () => {
    setSelectedCourses([])
    showNotification("Schedule cleared.", "default")
  }

  // Toggle search popup
  const toggleSearchPopup = () => {
    setIsSearchPopupOpen(!isSearchPopupOpen)
    if (!isSearchPopupOpen) {
      setCurrentSearchResults([])
    }
  }

  // Search courses
  const searchCourses = (query: string) => {
    if (!query.trim()) {
      setCurrentSearchResults([])
      return
    }

    const queryLower = query.toLowerCase()

    // Improved search logic to match on multiple fields
    const results = courses.filter((c) => {
      // Search in course code
      if (c.Class?.toLowerCase().includes(queryLower)) {
        return true
      }

      // Search in instructor name
      if (c.Instructor?.toLowerCase().includes(queryLower)) {
        return true
      }

      // Search in section
      if (c.Section?.toLowerCase().includes(queryLower)) {
        return true
      }

      // Search in days/times
      if (c.DaysTimes?.toLowerCase().includes(queryLower)) {
        return true
      }

      // Search in room
      if (c.Room?.toLowerCase().includes(queryLower)) {
        return true
      }

      return false
    })

    // Sort results to prioritize exact matches
    results.sort((a, b) => {
      const aClassMatch = a.Class?.toLowerCase() === queryLower ? 0 : 1
      const bClassMatch = b.Class?.toLowerCase() === queryLower ? 0 : 1
      return aClassMatch - bClassMatch
    })

    setCurrentSearchResults(results)

    if (results.length === 0) {
      showNotification(`No courses found matching "${query}"`, "warning")
    } else {
      showNotification(`Found ${results.length} courses matching "${query}"`, "success")
    }
  }

  // Add course from search
  const addCourseFromSearch = (course: Course) => {
    // First check if the course exists in our database
    const existingCourse = courses.find(
      (c) => c.Class?.toLowerCase() === course.Class?.toLowerCase() && 
             c.Section?.toLowerCase() === course.Section?.toLowerCase()
    );

    if (!existingCourse) {
      showNotification(`Course ${course.Class} ${course.Section} not found in the database.`, "error");
      return;
    }

    if (hasConflict(course, selectedCourses)) {
      showNotification(`Time conflict: Cannot add ${course.Class} ${course.Section}.`, "warning");
      return;
    }

    const newCourse: SelectedCourse = {
      ...course,
      id: `course-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };

    setSelectedCourses((prev) => [...prev, newCourse]);
    showNotification(`${course.Class} ${course.Section} added to your schedule.`, "success");

    // Close the search popup after adding a course
    setIsSearchPopupOpen(false);
  };

  // Remove course
  const removeCourse = (courseId: string) => {
    const courseToRemove = selectedCourses.find((c) => c.id === courseId)
    if (courseToRemove) {
      setSelectedCourses(selectedCourses.filter((c) => c.id !== courseId))
      showNotification(`Removed ${courseToRemove.Class} ${courseToRemove.Section}`, "default")
    }
  }

  // Show course details
  const showCourseDetails = (course: Course) => {
    setCurrentCourseDetails(course)
    setIsCourseDetailsModalOpen(true)
  }

  // Open notes modal
  const openNotesModal = (courseId: string) => {
    setCurrentNotesCourseId(courseId)
    setIsNotesModalOpen(true)
  }

  // Save notes
  const saveNotes = (notes: string) => {
    if (currentNotesCourseId) {
      if (notes.trim()) {
        setCourseNotes({
          ...courseNotes,
          [currentNotesCourseId]: notes,
        })
        showNotification("Notes saved successfully", "success")
      } else {
        // Remove notes if empty
        const newNotes = { ...courseNotes }
        delete newNotes[currentNotesCourseId]
        setCourseNotes(newNotes)
      }
    }
    setIsNotesModalOpen(false)
    setCurrentNotesCourseId(null)
  }

  // Toggle view between calendar and list
  const toggleView = () => {
    setCurrentView(currentView === "calendar" ? "list" : "calendar")
  }

  // Handle major and year selection
  const handleSelectionConfirm = (major: string, year: string) => {
    setSelectedMajor(major)
    setSelectedYear(year)
    setIsInitialModalOpen(false)
  }

  // Show notification
  const showNotification = (
    message: string,
    type: "success" | "warning" | "error" | "default" = "default",
    duration = 3000,
  ) => {
    const id = Date.now().toString()
    
    // Format message - make first letter uppercase if not already
    const formattedMessage = message.charAt(0).toUpperCase() + message.slice(1);
    
    const newNotification: Notification = {
      id,
      message: formattedMessage,
      type,
    }

    // Keep only the 2 most recent notifications to reduce clutter
    setNotifications((prev) => {
      const updatedNotifications = [...prev, newNotification];
      return updatedNotifications.slice(-2);
    })

    // Auto-remove notification after duration
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id))
    }, duration)
  }

  // Remove notification
  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }

  return (
    <div className="app-container max-w-7xl mx-auto p-4 md:p-6">
      <AppHeader selectedMajor={selectedMajor} selectedYear={selectedYear} isLoading={isLoading} />

      <div className="mb-6 bg-white rounded-xl shadow-soft">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6 p-1 bg-primary-50 rounded-t-xl">
            <TabsTrigger
              value="schedule"
              className="flex items-center gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-soft"
            >
              <Calendar className="h-4 w-4" />
              Course Scheduler
            </TabsTrigger>
            <TabsTrigger
              value="academic"
              className="flex items-center gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-soft"
            >
              <GraduationCap className="h-4 w-4" />
              Academic Progress
            </TabsTrigger>
            <TabsTrigger
              value="requirements"
              className="flex items-center gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-soft"
            >
              <BookOpen className="h-4 w-4" />
              Degree Requirements
            </TabsTrigger>
          </TabsList>

          <div className="p-6">
            <TabsContent value="schedule" className="space-y-6 mt-0">
              <MainControls
                onGenerateSchedule={generateBestSchedule}
                onToggleSearch={toggleSearchPopup}
                onResetSchedule={resetSchedule}
                onImportFromImage={handleImportFromImage}
                disabled={!selectedMajor || !selectedYear || courses.length === 0}
              />

              <Dashboard
                selectedCourses={selectedCourses}
                currentView={currentView}
                onToggleView={toggleView}
                onShowDetails={showCourseDetails}
                onOpenNotes={openNotesModal}
                onRemoveCourse={removeCourse}
                courseNotes={courseNotes}
              />
            </TabsContent>

            <TabsContent value="academic" className="mt-0">
              <div className="space-y-6">
                <AcademicDataVisualizer />
              </div>
            </TabsContent>

            <TabsContent value="requirements" className="mt-0">
              <div className="space-y-6">
                {/* This tab will show the degree requirements view */}
                <div className="bg-gradient-to-br from-primary-50 to-white rounded-xl shadow-sm p-6">
                  <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-primary-800">
                    <BookOpen className="h-5 w-5" />
                    Degree Requirements
                  </h2>
                  <p className="text-muted-foreground mb-6">
                    View and track your progress toward completing your degree requirements. Import your academic data
                    to see which requirements you've completed and which ones you still need to fulfill.
                  </p>
                  <div className="border-t border-primary-100 pt-4">
                    <AcademicDataVisualizer />
                  </div>
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {isSearchPopupOpen && (
        <SearchPopup
          onClose={toggleSearchPopup}
          onSearch={searchCourses}
          searchResults={currentSearchResults}
          onAddCourse={addCourseFromSearch}
        />
      )}

      {isCourseDetailsModalOpen && currentCourseDetails && (
        <CourseDetailsModal course={currentCourseDetails} onClose={() => setIsCourseDetailsModalOpen(false)} />
      )}

      {isNotesModalOpen && currentNotesCourseId && (
        <CourseNotesModal
          courseId={currentNotesCourseId}
          initialNotes={courseNotes[currentNotesCourseId] || ""}
          onSave={saveNotes}
          onClose={() => setIsNotesModalOpen(false)}
          course={selectedCourses.find((c) => c.id === currentNotesCourseId) || null}
        />
      )}

      {isInitialModalOpen && (
        <InitialSelectionModal requirements={requirements} isDataReady={isDataReady} onConfirm={handleSelectionConfirm} />
      )}

      <NotificationArea notifications={notifications} onRemove={removeNotification} />
    </div>
  )
}

