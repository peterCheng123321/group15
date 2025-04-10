'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Button, Card, Alert, Spinner, List, Tag, Progress, Typography, Select, SelectTrigger, SelectValue, SelectContent, SelectItem, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { Clock, CheckCircle, AlertCircle, BookOpen, Download, BarChart2, ListChecks, GraduationCap, Star, Book, Calendar, User, School, ArrowRight } from 'lucide-react';
import AcademicRecordImporter from '@/components/AcademicRecordImporter';

// Constants
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const ECS_REQUIREMENTS_PATH = '/backend/data/ecs_requirements_cleaned.json'; // Updated path relative to public folder or served via API
const SAMPLE_COURSES_PATH = '/api/sample-courses'; // Use an API endpoint to serve the sample data
const GRADE_POINTS = {
    'A+': 4.0, 'A': 4.0, 'A-': 3.7, 'B+': 3.3, 'B': 3.0, 'B-': 2.7,
    'C+': 2.3, 'C': 2.0, 'C-': 1.7, 'D+': 1.3, 'D': 1.0, 'F': 0.0,
    'P': null, 'IP': null, 'WD': null, // Grades not counting towards GPA
};

export default function AcademicProgressPage() {
  // State variables
  const [studentCourses, setStudentCourses] = useState([]);
  const [studentInfo, setStudentInfo] = useState(null);
  const [recommendedCourses, setRecommendedCourses] = useState([]);
  const [futureRequirements, setFutureRequirements] = useState([]);
  const [ecsRequirements, setEcsRequirements] = useState({});
  const [selectedMajor, setSelectedMajor] = useState('Computer Science'); // Default or load from user profile
  const [activeTab, setActiveTab] = useState('progress'); // 'progress', 'calendar', 'recommended'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showImporter, setShowImporter] = useState(false);

  // Fetch initial data (ECS requirements, courses, etc.)
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch course data - include selected major in the API call
        const response = await fetch(`/api/sample-courses?major=${encodeURIComponent(selectedMajor)}`);
        if (!response.ok) {
          throw new Error('Failed to fetch course data');
        }
        const data = await response.json();
        setStudentCourses(data.courses || []);
        setStudentInfo(data.student || {});
        setRecommendedCourses(data.recommendedCourses || []);
        setFutureRequirements(data.futureRequirements || []);
        
        // Fetch ECS requirements
        const reqResponse = await fetch('/api/requirements');
        if (!reqResponse.ok) {
          throw new Error('Failed to fetch requirements data');
        }
        const reqData = await reqResponse.json();
        setEcsRequirements(reqData);
        
        setError(null);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [selectedMajor]); // Re-fetch data when major changes

  // Load Sample Data Function
  const loadSampleData = async () => {
      setLoading(true);
      setError(null);
      try {
          const sampleResponse = await fetch(SAMPLE_COURSES_PATH);
          if (!sampleResponse.ok) throw new Error(`Failed to fetch sample courses: ${sampleResponse.statusText}`);
          const sampleData = await sampleResponse.json();
          
          // Check if we have the new data structure or just an array of courses
          if (sampleData.courses) {
              setStudentCourses(sampleData.courses);
              setStudentInfo(sampleData.student);
              setRecommendedCourses(sampleData.recommendedCourses || []);
              setFutureRequirements(sampleData.futureRequirements || []);
          } else {
              setStudentCourses(sampleData);
          }
          
          setShowImporter(false); // Hide importer if sample is loaded
      } catch (err) {
          console.error("Sample data loading error:", err);
          setError(`Failed to load sample data: ${err.message}`);
      } finally {
          setLoading(false);
      }
  };

  // Handle data imported from the MySlice importer component
  const handleImportComplete = (importedCourses) => {
    if (importedCourses && importedCourses.length > 0) {
      setStudentCourses(importedCourses);
      setShowImporter(false); // Hide importer after successful import
      setError(null);
    } else {
      setError("Import completed, but no course data was received.");
    }
  };

  // Memoized calculations for performance
  const majorReqData = useMemo(() => ecsRequirements[selectedMajor], [ecsRequirements, selectedMajor]);

  const completedCourseCodes = useMemo(() => new Set(
    studentCourses
      .filter(c => c.grade && c.grade !== 'F' && c.grade !== 'WD' && c.grade !== 'IP' && GRADE_POINTS[c.grade] !== undefined && (GRADE_POINTS[c.grade] === null || GRADE_POINTS[c.grade] >= 1.0))
      .map(c => c.code?.trim())
  ), [studentCourses]);

  const inProgressCourseCodes = useMemo(() => new Set(
      studentCourses.filter(c => c.grade === 'IP').map(c => c.code?.trim())
  ), [studentCourses]);

  const statistics = useMemo(() => {
    const completedForStats = studentCourses.filter(c => c.grade && c.grade !== 'F' && c.grade !== 'WD' && c.grade !== 'IP' && GRADE_POINTS[c.grade] !== undefined && (GRADE_POINTS[c.grade] === null || GRADE_POINTS[c.grade] >= 1.0));
    const gpaCourses = studentCourses.filter(c => c.grade && GRADE_POINTS[c.grade] !== undefined && GRADE_POINTS[c.grade] !== null);

    let totalPoints = 0;
    let totalGpaCredits = 0;
    gpaCourses.forEach(course => {
        const credits = parseFloat(course.credits || 0);
        const gradeValue = GRADE_POINTS[course.grade];
        if (!isNaN(credits) && credits > 0 && gradeValue !== null) {
            totalPoints += gradeValue * credits;
            totalGpaCredits += credits;
        }
    });

    const totalCreditsEarned = completedForStats.reduce((total, course) => {
        const credits = parseFloat(course.credits || 0);
        return total + (isNaN(credits) ? 0 : credits);
    }, 0);

    const gpa = totalGpaCredits > 0 ? (totalPoints / totalGpaCredits).toFixed(2) : "0.00";

    const totalRequiredCredits = majorReqData?.total_credits ? parseInt(majorReqData.total_credits) : 120;
    const progressPercentage = totalRequiredCredits > 0 ? Math.min(100, Math.round((totalCreditsEarned / totalRequiredCredits) * 100)) : 0;

    return {
        coursesCompleted: completedForStats.length,
        creditsEarned: totalCreditsEarned,
        gpa: gpa,
        degreeProgress: progressPercentage
    };
  }, [studentCourses, majorReqData]);

  // Group courses by term for calendar view
  const coursesByTerm = useMemo(() => {
    const termMap = {};
    
    // Add completed and in-progress courses
    studentCourses.forEach(course => {
      if (!termMap[course.term]) {
        termMap[course.term] = [];
      }
      termMap[course.term].push(course);
    });
    
    // Add recommended courses 
    recommendedCourses.forEach(course => {
      if (!termMap[course.term]) {
        termMap[course.term] = [];
      }
      termMap[course.term].push({...course, isRecommended: true});
    });
    
    // Add future requirements
    futureRequirements.forEach(course => {
      if (!termMap[course.term]) {
        termMap[course.term] = [];
      }
      termMap[course.term].push({...course, isFuture: true});
    });
    
    // Sort terms chronologically
    const terms = Object.keys(termMap).sort((a, b) => {
      const [aSession, aYear] = a.split(' ');
      const [bSession, bYear] = b.split(' ');
      
      if (aYear !== bYear) return parseInt(aYear) - parseInt(bYear);
      
      const sessionOrder = {
        'Fall': 3,
        'Summer': 2,
        'Spring': 1,
        'Winter': 0
      };
      
      return sessionOrder[aSession] - sessionOrder[bSession];
    });
    
    return { terms, termMap };
  }, [studentCourses, recommendedCourses, futureRequirements]);

  // Render Functions for UI parts
  const renderRequirementsProgress = () => {
    if (!majorReqData || !majorReqData.categories) return <p>Select a major to view requirements.</p>;

    return Object.entries(majorReqData.categories).map(([categoryName, categoryCourses]) => {
      const requiredCount = categoryCourses.length;
      let completedCount = 0;

      categoryCourses.forEach(reqCourse => {
        if (reqCourse.code && completedCourseCodes.has(reqCourse.code.trim())) {
          completedCount++;
        }
      });

      const progress = requiredCount > 0 ? Math.round((completedCount / requiredCount) * 100) : 0;

      return (
        <Card key={categoryName} className="mb-4">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg font-medium">{categoryName}</CardTitle>
              <Tag variant={progress === 100 ? 'success' : 'default'}>
                {progress === 100 ? <CheckCircle className="h-4 w-4 mr-1"/> : null}
                {progress}%
              </Tag>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-2">
              {completedCount} of {requiredCount} courses completed.
            </p>
            <Progress value={progress} />
          </CardContent>
        </Card>
      );
    });
  };

  const renderRemainingCourses = () => {
    if (!majorReqData || !majorReqData.categories) return null;

    const remaining = [];
    Object.entries(majorReqData.categories).forEach(([categoryName, categoryCourses]) => {
      const remainingInCategory = categoryCourses.filter(reqCourse =>
        reqCourse.code &&
        !completedCourseCodes.has(reqCourse.code.trim()) &&
        !inProgressCourseCodes.has(reqCourse.code.trim())
      );
      if (remainingInCategory.length > 0) {
        remaining.push({ category: categoryName, courses: remainingInCategory });
      }
    });

    if (remaining.length === 0 && studentCourses.length > 0) {
        return <p className="text-center text-muted-foreground">All required courses completed or in progress!</p>;
    }

    return (
      <>
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-4">
          <Typography variant="subtitle" className="text-blue-800 font-semibold">Semester Planning Guidelines</Typography>
          <Typography variant="caption" className="text-blue-700 block mt-1">
            Syracuse University recommends 15 credits per semester to stay on track for a four-year degree. 
            Balance your course selection with major requirements, core courses, and electives.
          </Typography>
        </div>
        
        {remaining.map(({ category, courses }) => (
          <div key={category} className="mb-4">
            <Typography variant="h6" className="mb-2">{category}</Typography>
            <List>
              {courses.map((course, idx) => (
                <List.Item key={`${course.code}-${idx}`}>
                  {course.code} - {course.name || 'No title available'}
                </List.Item>
              ))}
            </List>
          </div>
        ))}
      </>
    );
  };
  
  const renderCalendarView = () => {
    if (coursesByTerm.terms.length === 0) return <p>No course data available for calendar view.</p>;
    
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {coursesByTerm.terms.map(term => (
            <Card key={term} className="overflow-hidden">
              <CardHeader className={`${term.includes('2024') ? 'bg-blue-50' : ''}`}>
                <CardTitle className="text-lg flex items-center justify-between">
                  <span>{term}</span>
                  {term.includes('2024') && term.includes('Fall') && (
                    <Tag variant="success" className="ml-2">Coming Next</Tag>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <List>
                  {coursesByTerm.termMap[term].map((course, idx) => (
                    <List.Item key={`${course.code}-${idx}`} className="flex items-center">
                      <div className="flex-1">
                        <div className="font-medium">
                          {course.code} 
                          {course.isRecommended && <Tag colorScheme="blue" className="ml-2 text-xs">Recommended</Tag>}
                          {course.isFuture && <Tag colorScheme="gray" className="ml-2 text-xs">Required</Tag>}
                        </div>
                        <div className="text-sm text-muted-foreground">{course.name}</div>
                      </div>
                      <div className="flex items-center">
                        {course.credits && <span className="text-sm mr-3">{course.credits} cr</span>}
                        {course.grade && (
                          <Tag 
                            className={`font-mono ${course.grade === 'IP' ? 'text-blue-700' : ''}`}
                            colorScheme={
                              course.grade === 'IP' ? 'blue' : 
                              course.grade.startsWith('A') ? 'green' : 
                              course.grade.startsWith('B') ? 'blue' : 
                              course.grade.startsWith('C') ? 'yellow' : 
                              course.grade.startsWith('D') ? 'orange' : 
                              course.grade === 'F' ? 'red' : 'gray'
                            }
                          >
                            {course.grade}
                          </Tag>
                        )}
                      </div>
                    </List.Item>
                  ))}
                </List>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  };
  
  const renderRecommendedCoursesView = () => {
    if (recommendedCourses.length === 0) return <p>No recommended courses data available.</p>;
    
    return (
      <div className="space-y-6">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-6">
          <Typography variant="h6" className="text-blue-800 mb-2">How We Make Recommendations</Typography>
          <Typography variant="caption" className="text-blue-700">
            Our recommendations are personalized based on your academic performance, course prerequisites, professor ratings, and course difficulty. 
            We analyze your past grades to suggest courses where you're likely to succeed.
          </Typography>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Recommended Courses for Fall 2024</CardTitle>
          </CardHeader>
          <CardContent>
            <Typography variant="subtitle" className="mb-4">These courses are recommended based on your academic progress and profile</Typography>
            <div className="space-y-6">
              {recommendedCourses.map((course, idx) => (
                <Card key={`rec-${idx}`} className={`${course.highly_recommended ? 'bg-green-50 border-green-200' : 'bg-blue-50'}`}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{course.code}: {course.name}</CardTitle>
                        <div className="text-sm text-muted-foreground mt-1">
                          {course.credits} credits • {course.term}
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        {course.fulfills_requirement && (
                          <Tag colorScheme="purple" className="mb-1">Major Requirement</Tag>
                        )}
                        {course.highly_recommended && !course.fulfills_requirement && (
                          <Tag colorScheme="green" className="mb-1">Highly Recommended</Tag>
                        )}
                        {course.difficulty_warning && (
                          <Tag colorScheme="orange">Challenging Course</Tag>
                        )}
                        {!course.difficulty_warning && !course.highly_recommended && !course.fulfills_requirement && (
                          <Tag colorScheme="blue">Recommended</Tag>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        {/* Professor and Rating */}
                        {course.professor && (
                          <div className="mb-3">
                            <Typography variant="subtitle" className="text-sm font-medium">Professor</Typography>
                            <div className="flex items-center mt-1">
                              <span className="font-medium">{course.professor}</span>
                              <div className="ml-2 bg-white px-2 py-1 rounded text-xs flex items-center">
                                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 mr-1" />
                                <span className={`font-bold ${
                                  course.professor_rating >= 4.5 ? 'text-green-600' : 
                                  course.professor_rating >= 3.5 ? 'text-blue-600' : 
                                  'text-orange-600'
                                }`}>
                                  {course.professor_rating}/5.0
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Course Details */}
                        <div className="mb-3">
                          <Typography variant="subtitle" className="text-sm font-medium">Course Information</Typography>
                          <div className="grid grid-cols-2 gap-x-4 text-sm mt-1">
                            <div>
                              <span className="text-muted-foreground">Difficulty:</span>
                              <span className={`ml-1 font-medium ${
                                course.course_difficulty === "Easy" ? "text-green-600" :
                                course.course_difficulty === "Moderate" ? "text-blue-600" :
                                "text-orange-600"
                              }`}>
                                {course.course_difficulty}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Avg. Grade:</span>
                              <span className="ml-1 font-medium">{course.average_grade}</span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Requirement Info */}
                        {course.fulfills_requirement && course.requirement_category && (
                          <div className="mb-3">
                            <Typography variant="subtitle" className="text-sm font-medium">Major Requirement</Typography>
                            <p className="text-sm mt-1">
                              This course fulfills a requirement in the <strong>{course.requirement_category}</strong> category of your major.
                            </p>
                          </div>
                        )}
                        
                        {/* Match Reason */}
                        {course.match_reason && (
                          <div className="mb-3">
                            <Typography variant="subtitle" className="text-sm font-medium">Why This Course Matches You</Typography>
                            <p className="text-sm mt-1">{course.match_reason}</p>
                          </div>
                        )}
                        
                        {/* Prerequisites */}
                        {course.prerequisite_codes?.length > 0 && (
                          <div className="mb-3">
                            <Typography variant="subtitle" className="text-sm font-medium">Prerequisites</Typography>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {course.prerequisite_codes.map(preReq => (
                                <Tag 
                                  key={preReq} 
                                  variant={completedCourseCodes.has(preReq) ? "success" : inProgressCourseCodes.has(preReq) ? "default" : "outline"}
                                  className="text-xs"
                                >
                                  {preReq} 
                                  {completedCourseCodes.has(preReq) && <CheckCircle className="h-3 w-3 ml-1" />}
                                  {inProgressCourseCodes.has(preReq) && <Clock className="h-3 w-3 ml-1" />}
                                </Tag>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div>
                        {/* Available Sections */}
                        {course.sections && course.sections.length > 0 && (
                          <div className="mb-3">
                            <Typography variant="subtitle" className="text-sm font-medium">Available Sections</Typography>
                            <div className="space-y-2 mt-1">
                              {course.sections.map((section, sidx) => (
                                <div key={`section-${sidx}`} className="bg-white rounded p-2 text-xs">
                                  <div className="font-medium">Section {section.section} - {section.professor}</div>
                                  <div className="flex justify-between mt-1">
                                    <span>{section.days} {section.time}</span>
                                    <span className="text-muted-foreground">{section.location}</span>
                                  </div>
                                  <div className="flex justify-between items-center mt-1">
                                    <div>
                                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 inline mr-1" />
                                      <span className="font-medium">{section.professor_rating}</span>
                                    </div>
                                    <span className={`${section.seats_available < 10 ? 'text-orange-600' : 'text-green-600'}`}>
                                      {section.seats_available} seats left
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Student Feedback */}
                        {course.student_feedback && course.student_feedback.length > 0 && (
                          <div>
                            <Typography variant="subtitle" className="text-sm font-medium">Student Feedback</Typography>
                            <div className="mt-1 space-y-2">
                              {course.student_feedback.map((feedback, fidx) => (
                                <div key={`feedback-${fidx}`} className="bg-white rounded p-2 text-xs italic text-muted-foreground">
                                  "{feedback}"
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
        
        {futureRequirements.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Future Required Courses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {futureRequirements.map((course, idx) => (
                  <div key={`future-${idx}`} className="flex items-center">
                    <ArrowRight className="h-4 w-4 mr-2 text-muted-foreground" />
                    <div>
                      <div className="font-medium">{course.code}: {course.name}</div>
                      <div className="text-sm text-muted-foreground">{course.credits} credits • Planned for {course.term}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  // Main component render
  if (loading && studentCourses.length === 0) return <div className="flex justify-center items-center h-screen"><Spinner size="lg" /></div>;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Academic Progress Tracker</h1>
          {studentInfo && (
            <div className="text-gray-600 mt-1">
              <p>{studentInfo.name} - {selectedMajor} - Class of {studentInfo.graduationYear}</p>
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Major Selection Dropdown */}
          <div className="w-64">
            <Select value={selectedMajor} onValueChange={setSelectedMajor}>
              <SelectTrigger>
                <SelectValue placeholder="Select Major" />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(ecsRequirements).length > 0 ? (
                  Object.keys(ecsRequirements).map(major => (
                    <SelectItem key={major} value={major}>{major}</SelectItem>
                  ))
                ) : (
                  <SelectItem value="Computer Science">Computer Science</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          
          <Button onClick={() => setShowImporter(true)} variant="outline" className="flex items-center">
            <Download className="mr-2 h-4 w-4" /> Import Academic Record
          </Button>
        </div>
      </div>

      {/* Statistics Cards - Always show when we have student data */}
      {studentCourses.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-blue-50 to-white border border-blue-100">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Courses Completed</CardTitle>
              <ListChecks className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.coursesCompleted}</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-50 to-white border border-green-100">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Credits Earned</CardTitle>
              <GraduationCap className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.creditsEarned}</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-yellow-50 to-white border border-yellow-100">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overall GPA</CardTitle>
              <Star className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.gpa}</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-50 to-white border border-purple-100">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Degree Progress</CardTitle>
              <BarChart2 className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.degreeProgress}%</div>
              <div className="mt-2">
                <Progress 
                  value={statistics.degreeProgress} 
                  className="h-2 bg-purple-100" 
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Towards {majorReqData?.total_credits || '~120'} credits
                </p>
                <div className="mt-3 p-2 bg-blue-50 rounded text-xs text-blue-800 border border-blue-100">
                  <p className="font-semibold mb-1">Syracuse University Requirements:</p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li><span className="font-medium">Minimum:</span> 12 credits per semester (full-time status)</li>
                    <li><span className="font-medium">Recommended:</span> 15 credits per semester to graduate in 4 years</li>
                    <li><span className="font-medium">Maximum:</span> 19 credits per semester without extra tuition</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Tab Navigation */}
      <div className="flex space-x-1 border-b">
        <Button 
          variant={activeTab === 'progress' ? 'default' : 'ghost'} 
          className={`rounded-none border-b-2 ${activeTab === 'progress' ? 'border-blue-600' : 'border-transparent'} pb-2 px-4`}
          onClick={() => setActiveTab('progress')}
        >
          Progress Tracking
        </Button>
        <Button 
          variant={activeTab === 'calendar' ? 'default' : 'ghost'} 
          className={`rounded-none border-b-2 ${activeTab === 'calendar' ? 'border-blue-600' : 'border-transparent'} pb-2 px-4`}
          onClick={() => setActiveTab('calendar')}
        >
          <Calendar className="h-4 w-4 mr-2" /> Course Calendar
        </Button>
        <Button 
          variant={activeTab === 'recommended' ? 'default' : 'ghost'} 
          className={`rounded-none border-b-2 ${activeTab === 'recommended' ? 'border-blue-600' : 'border-transparent'} pb-2 px-4`}
          onClick={() => setActiveTab('recommended')}
        >
          Recommended Courses
        </Button>
      </div>
      
      {error && <Alert variant="destructive" className="mt-4">{error}</Alert>}

      {/* MySlice Importer Component (Conditionally Rendered) */}
      {showImporter && (
        <div className="mb-8">
          <AcademicRecordImporter onImportComplete={handleImportComplete} />
        </div>
      )}

      {/* Content based on active tab */}
      {studentCourses.length > 0 ? (
        <div className="mt-6">
          {activeTab === 'progress' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <Typography variant="h4" className="mb-4 flex items-center text-blue-800">
                  <ListChecks className="mr-2 h-5 w-5" /> Requirements Progress
                </Typography>
                {renderRequirementsProgress()}
              </div>
              <div>
                <Typography variant="h4" className="mb-4 flex items-center text-blue-800">
                  <Book className="mr-2 h-5 w-5" /> Remaining Required Courses
                </Typography>
                <div className="space-y-4 bg-white p-4 rounded-lg border">
                  {renderRemainingCourses()}
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'calendar' && (
            <div>
              <Typography variant="h4" className="mb-4 flex items-center text-blue-800">
                <Calendar className="mr-2 h-5 w-5" /> Course Calendar
              </Typography>
              <div className="bg-white p-4 rounded-lg border">
                {renderCalendarView()}
              </div>
            </div>
          )}
          
          {activeTab === 'recommended' && (
            <div>
              <Typography variant="h4" className="mb-4 flex items-center text-blue-800">
                <Star className="mr-2 h-5 w-5" /> Course Recommendations
              </Typography>
              {renderRecommendedCoursesView()}
            </div>
          )}
        </div>
      ) : ( 
        !loading && !showImporter && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="max-w-md w-full">
              <Card className="bg-gradient-to-b from-blue-50 to-white text-center p-8 border border-blue-100">
                <CardHeader>
                  <div className="mx-auto bg-blue-100 rounded-full p-3 w-16 h-16 flex items-center justify-center mb-4">
                    <Book className="h-8 w-8 text-blue-600" />
                  </div>
                  <CardTitle className="text-xl font-semibold text-blue-800">No Student Data Loaded</CardTitle>
                </CardHeader>
                <CardContent>
                  <Typography className="mb-6 text-muted-foreground">
                    Please load the sample student data or import your academic record from MySlice to view your progress.
                  </Typography>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button onClick={loadSampleData} className="bg-blue-600 hover:bg-blue-700 text-white">
                      <Book className="h-4 w-4 mr-2"/> Load Sample Data
                    </Button>
                    <Button onClick={() => setShowImporter(true)} variant="outline">
                      <Download className="h-4 w-4 mr-2"/> Import from MySlice
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )
      )}
    </div>
  );
} 