"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
// Add the missing import for the Plus and Trash2 icons at the top of the file
import { Camera, FileUp, Image, Loader2, AlertCircle, CheckCircle, Edit, Plus, Trash2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { SelectedCourse } from "@/lib/types"
import { createWorker } from "tesseract.js"

interface ImageScheduleImportProps {
  onCoursesExtracted: (courses: SelectedCourse[]) => void
}

export function ImageScheduleImport({ onCoursesExtracted }: ImageScheduleImportProps) {
  const [file, setFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [extractedCourses, setExtractedCourses] = useState<SelectedCourse[]>([])
  const [activeTab, setActiveTab] = useState<string>("upload")
  const [recognitionProgress, setRecognitionProgress] = useState(0)
  const [recognizedText, setRecognizedText] = useState<string>("")
  const [editMode, setEditMode] = useState(false)
  const { toast } = useToast()
  const workerRef = useRef<any>(null)

  // Initialize Tesseract worker
  useEffect(() => {
    const initWorker = async () => {
      try {
        const worker = await createWorker({
          logger: (progress) => {
            if (progress.status === "recognizing text") {
              setRecognitionProgress(progress.progress * 100)
            }
          },
        })

        // Initialize with English language
        await worker.loadLanguage("eng")
        await worker.initialize("eng")
        workerRef.current = worker

        console.log("Tesseract worker initialized")
      } catch (error) {
        console.error("Failed to initialize Tesseract worker:", error)
        toast({
          title: "OCR initialization failed",
          description: "Could not initialize text recognition engine. Please try again later.",
          variant: "destructive",
        })
      }
    }

    initWorker()

    // Cleanup worker on unmount
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate()
      }
    }
  }, [toast])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0]
      setFile(selectedFile)

      // Create preview URL
      const url = URL.createObjectURL(selectedFile)
      setPreviewUrl(url)

      // Reset states
      setExtractedCourses([])
      setRecognizedText("")
      setRecognitionProgress(0)
      setEditMode(false)
    }
  }

  // Add this pre-processing step to improve OCR results - add this right before the OCR processing
  const preprocessImage = async (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        // Create a canvas to manipulate the image
        const canvas = document.createElement("canvas")
        const ctx = canvas.getContext("2d")

        if (!ctx) {
          resolve(file) // If we can't get context, return original file
          return
        }

        // Set canvas dimensions
        canvas.width = img.width
        canvas.height = img.height

        // Draw image with white background to improve contrast
        ctx.fillStyle = "#FFFFFF"
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0)

        // Apply image processing for better OCR
        try {
          // Increase contrast
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
          const data = imageData.data

          // Simple contrast enhancement
          const factor = 1.5 // Contrast factor
          for (let i = 0; i < data.length; i += 4) {
            // Convert to grayscale first for better OCR
            const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]

            // Apply contrast
            const contrast = (gray - 128) * factor + 128

            // Threshold to make text more distinct
            const value = contrast > 150 ? 255 : 0

            data[i] = value // R
            data[i + 1] = value // G
            data[i + 2] = value // B
          }

          ctx.putImageData(imageData, 0, 0)
        } catch (e) {
          console.error("Error processing image:", e)
          // Continue with original image if processing fails
        }

        // Convert canvas to blob
        canvas.toBlob((blob) => {
          if (!blob) {
            resolve(file) // If conversion fails, return original file
            return
          }

          // Create a new file from the blob
          const processedFile = new File([blob], file.name, {
            type: "image/png",
            lastModified: Date.now(),
          })

          resolve(processedFile)
        }, "image/png")
      }

      img.onerror = () => {
        resolve(file) // If loading fails, return original file
      }

      img.crossOrigin = "anonymous"
      img.src = URL.createObjectURL(file)
    })
  }

  // Update the processImage function to use the preprocessed image
  const processImage = async () => {
    if (!file || !workerRef.current) {
      toast({
        title: "Cannot process image",
        description: file ? "OCR engine not ready. Please try again." : "Please select an image first.",
        variant: "destructive",
      })
      return
    }

    setIsProcessing(true)
    setRecognitionProgress(0)

    try {
      // Preprocess the image for better OCR results
      const processedFile = await preprocessImage(file)

      // Create a preview of the processed image
      const processedPreviewUrl = URL.createObjectURL(processedFile)
      setPreviewUrl(processedPreviewUrl)

      // Perform OCR on the processed image
      const result = await workerRef.current.recognize(processedFile)
      const extractedText = result.data.text
      setRecognizedText(extractedText)

      // Parse the extracted text to identify courses
      const courses = parseCoursesFromText(extractedText)

      if (courses.length > 0) {
        setExtractedCourses(courses)
        toast({
          title: "Schedule extracted successfully",
          description: `Found ${courses.length} courses in your schedule.`,
          variant: "default",
        })
      } else {
        toast({
          title: "No courses found",
          description: "Could not identify any courses in the image. Try editing the text or using a clearer image.",
          variant: "warning",
        })
        // Enable edit mode automatically if no courses found
        setEditMode(true)
      }
    } catch (error) {
      console.error("Error processing image:", error)
      toast({
        title: "Processing failed",
        description: "Failed to extract text from image. Please try again with a clearer image.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
      setRecognitionProgress(100)
    }
  }

  const parseCoursesFromText = (text: string): SelectedCourse[] => {
    const courses: SelectedCourse[] = []
    let courseId = 1

    // Clean up the text - replace multiple spaces with single space
    const cleanedText = text.replace(/\s+/g, " ").trim()
    console.log("Cleaned text:", cleanedText)

    // First pass: Look for complete course patterns
    // Format: Course code + Section + Days/Times + Room + Instructor
    const coursePattern =
      /([A-Z]{2,4}\s*\d{3})\s*(?:Section\s*)?([A-Z]\d{3,4})?.*?((?:Mo|Tu|We|Th|Fr|Sa|Su)+\s*\d{1,2}:\d{2}\s*[AP]M\s*-\s*\d{1,2}:\d{2}\s*[AP]M).*?((?:Hall|Room|Building|Center|Ctr|Theater|Lab|Science|Tech|Languages|Sims)\s+[A-Za-z0-9\s&-]+\s*\d+)?.*?((?:[A-Z][a-z]+\s+)+[A-Z][a-z]+)?/gi

    let match
    while ((match = coursePattern.exec(cleanedText)) !== null) {
      const [_, courseCode, section, daysTimes, room, instructor] = match

      courses.push({
        id: `course-${Date.now()}-${courseId++}`,
        Class: courseCode?.trim() || "Unknown Course",
        Section: section?.trim() || "M001",
        DaysTimes: daysTimes?.trim() || "TBA",
        Room: room?.trim() || "TBA",
        Instructor: instructor?.trim() || "Not specified",
        MeetingDates: "01/14/2025 - 04/24/2025",
      })
    }

    // If no courses found with the complete pattern, try a more targeted approach
    if (courses.length === 0) {
      // Extract course codes first
      const courseCodeRegex = /([A-Z]{2,4})\s*(\d{3})/g
      const courseCodes = []

      while ((match = courseCodeRegex.exec(cleanedText)) !== null) {
        const [_, dept, num] = match
        courseCodes.push({
          code: `${dept} ${num}`,
          index: match.index,
        })
      }

      // Extract section numbers
      const sectionRegex = /([A-Z]\d{3,4})/g
      const sections = []

      while ((match = sectionRegex.exec(cleanedText)) !== null) {
        sections.push({
          section: match[1],
          index: match.index,
        })
      }

      // Extract times
      const timeRegex = /(\d{1,2}:\d{2}\s*[AP]M\s*-\s*\d{1,2}:\d{2}\s*[AP]M)/g
      const times = []

      while ((match = timeRegex.exec(cleanedText)) !== null) {
        times.push({
          time: match[1],
          index: match.index,
        })
      }

      // Extract days
      const dayRegex = /((?:Mo|Tu|We|Th|Fr|Sa|Su)+)/g
      const days = []

      while ((match = dayRegex.exec(cleanedText)) !== null) {
        days.push({
          days: match[1],
          index: match.index,
        })
      }

      // Extract rooms
      const roomRegex =
        /((?:Hall|Room|Building|Center|Ctr|Theater|Lab|Science|Tech|Languages|Sims)\s+[A-Za-z0-9\s&-]+\s*\d+)/g
      const rooms = []

      while ((match = roomRegex.exec(cleanedText)) !== null) {
        rooms.push({
          room: match[1],
          index: match.index,
        })
      }

      // Extract instructors - looking for capitalized names
      const instructorRegex = /([A-Z][a-z]+\s+[A-Z][a-z]+)/g
      const instructors = []

      while ((match = instructorRegex.exec(cleanedText)) !== null) {
        // Skip if it looks like a building name
        if (!match[1].includes("Hall") && !match[1].includes("Room") && !match[1].includes("Building")) {
          instructors.push({
            instructor: match[1],
            index: match.index,
          })
        }
      }

      // Associate information with each course code based on proximity
      courseCodes.forEach((courseCode, i) => {
        // Find closest section
        let closestSection = "M001" // Default section
        let minSectionDist = Number.MAX_SAFE_INTEGER

        sections.forEach((section) => {
          const dist = Math.abs(section.index - courseCode.index)
          if (dist < minSectionDist && dist < 100) {
            // Only consider sections within reasonable distance
            minSectionDist = dist
            closestSection = section.section
          }
        })

        // Find closest time
        let closestTime = "TBA"
        let minTimeDist = Number.MAX_SAFE_INTEGER

        times.forEach((time) => {
          const dist = Math.abs(time.index - courseCode.index)
          if (dist < minTimeDist && dist < 200) {
            minTimeDist = dist
            closestTime = time.time
          }
        })

        // Find closest days
        let closestDays = ""
        let minDaysDist = Number.MAX_SAFE_INTEGER

        days.forEach((day) => {
          const dist = Math.abs(day.index - courseCode.index)
          if (dist < minDaysDist && dist < 200) {
            minDaysDist = dist
            closestDays = day.days
          }
        })

        // Find closest room
        let closestRoom = "TBA"
        let minRoomDist = Number.MAX_SAFE_INTEGER

        rooms.forEach((room) => {
          const dist = Math.abs(room.index - courseCode.index)
          if (dist < minRoomDist && dist < 200) {
            minRoomDist = dist
            closestRoom = room.room
          }
        })

        // Find closest instructor
        let closestInstructor = "Not specified"
        let minInstructorDist = Number.MAX_SAFE_INTEGER

        instructors.forEach((instructor) => {
          const dist = Math.abs(instructor.index - courseCode.index)
          if (dist < minInstructorDist && dist < 200) {
            minInstructorDist = dist
            closestInstructor = instructor.instructor
          }
        })

        // Create course object
        courses.push({
          id: `course-${Date.now()}-${courseId++}`,
          Class: courseCode.code,
          Section: closestSection,
          DaysTimes: closestDays ? `${closestDays} ${closestTime}` : closestTime,
          Room: closestRoom,
          Instructor: closestInstructor,
          MeetingDates: "01/14/2025 - 04/24/2025",
        })
      })

      // Filter out any courses that look like they might be section numbers incorrectly identified as courses
      return courses.filter((course) => {
        // Check if the course code looks like a section number
        return !course.Class.match(/^M\d{3,4}$/) && !course.Class.match(/^ages/) && !course.Class.match(/^tion/)
      })
    }

    return courses
  }

  const handleRecognizedTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setRecognizedText(e.target.value)
  }

  const parseEditedText = () => {
    if (!recognizedText.trim()) {
      toast({
        title: "No text to parse",
        description: "Please enter some text to extract courses from.",
        variant: "destructive",
      })
      return
    }

    const courses = parseCoursesFromText(recognizedText)

    if (courses.length > 0) {
      setExtractedCourses(courses)
      setEditMode(false)
      toast({
        title: "Courses extracted",
        description: `Found ${courses.length} courses in the edited text.`,
        variant: "default",
      })
    } else {
      toast({
        title: "No courses found",
        description: "Could not identify any courses in the text. Please check the format and try again.",
        variant: "warning",
      })
    }
  }

  const handleImportCourses = () => {
    if (extractedCourses.length === 0) {
      toast({
        title: "No courses to import",
        description: "Please process an image first to extract courses.",
        variant: "destructive",
      })
      return
    }

    onCoursesExtracted(extractedCourses)

    toast({
      title: "Courses imported",
      description: `Successfully added ${extractedCourses.length} courses to your schedule.`,
      variant: "default",
    })

    // Reset state
    setFile(null)
    setPreviewUrl(null)
    setExtractedCourses([])
    setRecognizedText("")
    setRecognitionProgress(0)
    setEditMode(false)
  }

  const handleEditCourse = (index: number, field: keyof SelectedCourse, value: string) => {
    setExtractedCourses((prev) => {
      const updated = [...prev]
      updated[index] = {
        ...updated[index],
        [field]: value,
      }
      return updated
    })
  }

  // Add this function to allow manual addition of courses
  const handleAddManualCourse = () => {
    const newCourse: SelectedCourse = {
      id: `course-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      Class: "",
      Section: "M001",
      DaysTimes: "TBA",
      Room: "TBA",
      Instructor: "Not specified",
      MeetingDates: "01/14/2025 - 04/24/2025",
    }

    setExtractedCourses((prev) => [...prev, newCourse])
  }

  // Add this function to remove a course
  const handleRemoveCourse = (index: number) => {
    setExtractedCourses((prev) => prev.filter((_, i) => i !== index))
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Image className="h-5 w-5" />
          Import Schedule from Image
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload">Upload Image</TabsTrigger>
            <TabsTrigger value="camera" disabled={true}>
              Take Photo (Coming Soon)
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-4">
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="schedule-image">Upload Schedule Image</Label>
              <Input
                id="schedule-image"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="cursor-pointer"
              />
            </div>

            {previewUrl && (
              <div className="mt-4 border rounded-md overflow-hidden">
                <img
                  src={previewUrl || "/placeholder.svg"}
                  alt="Schedule preview"
                  className="w-full object-contain max-h-[300px]"
                />
              </div>
            )}

            {isProcessing && (
              <div className="mt-4">
                <div className="flex justify-between mb-2">
                  <span className="text-sm">Processing image...</span>
                  <span className="text-sm">{Math.round(recognitionProgress)}%</span>
                </div>
                <Progress value={recognitionProgress} className="h-2" />
              </div>
            )}

            {recognizedText && !isProcessing && (
              <div className="mt-4">
                <div className="flex justify-between items-center mb-2">
                  <Label htmlFor="recognized-text">Extracted Text</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditMode(!editMode)}
                    className="flex items-center gap-1"
                  >
                    <Edit className="h-3 w-3" />
                    {editMode ? "Done Editing" : "Edit Text"}
                  </Button>
                </div>

                {editMode ? (
                  <div className="space-y-2">
                    <textarea
                      id="recognized-text"
                      value={recognizedText}
                      onChange={handleRecognizedTextChange}
                      className="w-full h-40 p-2 border rounded-md font-mono text-sm"
                    />
                    <Button onClick={parseEditedText} size="sm">
                      Parse Edited Text
                    </Button>
                  </div>
                ) : (
                  <div className="border rounded-md p-2 bg-slate-50 max-h-40 overflow-y-auto">
                    <pre className="text-xs whitespace-pre-wrap font-mono">{recognizedText}</pre>
                  </div>
                )}
              </div>
            )}

            {extractedCourses.length > 0 && !editMode && (
              <div className="mt-4 border rounded-md p-4 bg-slate-50">
                <h3 className="font-medium mb-2 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Extracted Courses:
                </h3>
                <ul className="space-y-2">
                  {extractedCourses.map((course, index) => (
                    <li key={course.id} className="p-2 border rounded bg-white">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">
                          {course.Class} {course.Section}
                        </span>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              handleEditCourse(
                                index,
                                "Class",
                                prompt("Enter new class name", course.Class) || course.Class,
                              )
                            }
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleRemoveCourse(index)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                      <div className="text-sm text-slate-500 mt-1">
                        {course.DaysTimes} • {course.Room} • {course.Instructor}
                      </div>
                    </li>
                  ))}
                </ul>
                <Button variant="outline" size="sm" className="mt-4 w-full" onClick={handleAddManualCourse}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Course Manually
                </Button>
              </div>
            )}

            {extractedCourses.length > 0 && !editMode && (
              <div className="mt-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-medium">Edit Extracted Courses</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAddManualCourse}
                    className="flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    Add Course
                  </Button>
                </div>

                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {extractedCourses.map((course, index) => (
                    <div key={course.id} className="border rounded-md p-3 bg-white">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1 mr-2">
                          <Label htmlFor={`course-${index}-class`}>Course</Label>
                          <Input
                            id={`course-${index}-class`}
                            value={course.Class}
                            onChange={(e) => handleEditCourse(index, "Class", e.target.value)}
                            className="mt-1"
                          />
                        </div>
                        <div className="flex-1 mr-2">
                          <Label htmlFor={`course-${index}-section`}>Section</Label>
                          <Input
                            id={`course-${index}-section`}
                            value={course.Section}
                            onChange={(e) => handleEditCourse(index, "Section", e.target.value)}
                            className="mt-1"
                          />
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveCourse(index)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                        <div>
                          <Label htmlFor={`course-${index}-days-times`}>Days/Times</Label>
                          <Input
                            id={`course-${index}-days-times`}
                            value={course.DaysTimes}
                            onChange={(e) => handleEditCourse(index, "DaysTimes", e.target.value)}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`course-${index}-room`}>Room</Label>
                          <Input
                            id={`course-${index}-room`}
                            value={course.Room}
                            onChange={(e) => handleEditCourse(index, "Room", e.target.value)}
                            className="mt-1"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <Label htmlFor={`course-${index}-instructor`}>Instructor</Label>
                          <Input
                            id={`course-${index}-instructor`}
                            value={course.Instructor}
                            onChange={(e) => handleEditCourse(index, "Instructor", e.target.value)}
                            className="mt-1"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {recognizedText && extractedCourses.length === 0 && !isProcessing && !editMode && (
              <div className="mt-4 border rounded-md p-4 bg-amber-50 flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-800">No courses detected</p>
                  <p className="text-sm text-amber-700 mt-1">
                    The system couldn't identify any courses in the image. Try using the "Edit Text" button to correct
                    the extracted text, or upload a clearer image.
                  </p>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="camera">
            <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
              <Camera className="h-10 w-10 mb-2 text-slate-300" />
              <p>Camera functionality coming soon</p>
              <p className="text-sm mt-2">This feature will allow you to take a photo of your schedule directly.</p>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => document.getElementById("schedule-image")?.click()}
          disabled={isProcessing}
        >
          <FileUp className="mr-2 h-4 w-4" />
          Select Image
        </Button>

        {!extractedCourses.length ? (
          <Button onClick={processImage} disabled={!file || isProcessing || !workerRef.current}>
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Image className="mr-2 h-4 w-4" />
                Extract Courses
              </>
            )}
          </Button>
        ) : (
          <Button onClick={handleImportCourses} disabled={extractedCourses.length === 0}>
            Import {extractedCourses.length} Courses
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
