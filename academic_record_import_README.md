# MySlice Academic Record Import Feature

This feature allows students to import their academic record directly from Syracuse University's MySlice portal to enhance their course scheduling experience with personalized recommendations.

## Overview

The MySlice Academic Record Import feature:

1. Securely logs into your MySlice account using Selenium WebDriver
2. Navigates to the Academic Progress page
3. Scrapes your completed courses, including:
   - Course codes
   - Course names
   - Grades earned
   - Credits
   - Terms when courses were taken
4. Uses this data to provide personalized course recommendations and performance predictions

## Prerequisites

To use this feature, you need to have the following installed:

- Python 3.6+
- Node.js 14+
- Chrome browser
- The following Python packages:
  - selenium
  - beautifulsoup4
  - webdriver-manager

You can install the required Python packages with:

```bash
pip install selenium beautifulsoup4 webdriver-manager
```

## Setup

1. Clone this repository
2. Install the required Node.js dependencies:

```bash
npm install
```

3. Start the backend API server:

```bash
node academic_scraper_api.js
```

4. Make sure the environment variable for the API URL is set in your Next.js project:

```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Integration

To add the Academic Record Importer to your application, import the component:

```jsx
import AcademicRecordImporter from '../components/AcademicRecordImporter';

// In your component:
const handleImportComplete = (courses) => {
  // Do something with the imported courses
  console.log('Imported courses:', courses);
};

// In your render method:
<AcademicRecordImporter onImportComplete={handleImportComplete} />
```

## Integrating with Performance Prediction Model

The imported academic record can be used with the performance prediction model to provide personalized course recommendations. Here's how to integrate them:

```jsx
import { useState } from 'react';
import AcademicRecordImporter from '../components/AcademicRecordImporter';
import { predictStudentPerformance, getRecommendation } from '../lib/performancePredictor';

export default function AcademicProgressPage() {
  const [importedCourses, setImportedCourses] = useState([]);
  const [predictedPerformance, setPredictedPerformance] = useState([]);
  
  // Handle the imported courses
  const handleImportComplete = async (courses) => {
    setImportedCourses(courses);
    
    // Calculate GPA from imported courses
    const totalPoints = courses.reduce((total, course) => {
      const gradeMap = {
        'A+': 4.0, 'A': 4.0, 'A-': 3.7,
        'B+': 3.3, 'B': 3.0, 'B-': 2.7,
        'C+': 2.3, 'C': 2.0, 'C-': 1.7,
        'D+': 1.3, 'D': 1.0, 'D-': 0.7,
        'F': 0.0
      };
      
      const credits = parseFloat(course.credits) || 0;
      const gradeValue = gradeMap[course.grade] || 0;
      return total + (gradeValue * credits);
    }, 0);
    
    const totalCredits = courses.reduce((total, course) => {
      return total + (parseFloat(course.credits) || 0);
    }, 0);
    
    const gpa = totalCredits > 0 ? totalPoints / totalCredits : 0;
    
    // Prepare student data for prediction
    const studentData = {
      gpa,
      completedCourses: courses.map(course => ({
        code: course.code,
        grade: course.grade,
        department: course.code.split(' ')[0],
        credits: parseFloat(course.credits) || 3
      })),
      currentWorkload: 0, // Set to 0 for planning purposes
      historicalPerformance: courses.map(course => ({
        code: course.code,
        grade: course.grade,
        department: course.code.split(' ')[0]
      }))
    };
    
    // Courses to predict performance for
    const coursesToPredict = [
      // Example courses - these would come from your course catalog
      {
        code: "CSE 101",
        department: "CSE",
        credits: 3,
        difficulty: 0.6,
        prerequisites: []
      },
      {
        code: "MAT 295",
        department: "MAT",
        credits: 4,
        difficulty: 0.7,
        prerequisites: []
      }
    ];
    
    // Predict performance
    const predictions = await predictStudentPerformance(studentData, coursesToPredict);
    setPredictedPerformance(predictions);
  };
  
  return (
    <div>
      <h1>Academic Progress</h1>
      
      <AcademicRecordImporter onImportComplete={handleImportComplete} />
      
      {predictedPerformance.length > 0 && (
        <div>
          <h2>Predicted Performance</h2>
          <ul>
            {predictedPerformance.map((prediction, index) => (
              <li key={index}>
                <strong>{prediction.courseCode}</strong>: 
                Predicted Grade: {prediction.predictedGrade} ({prediction.predictedGPA})
                <br />
                <span>Confidence: {prediction.confidence}</span>
                <br />
                <span>{getRecommendation(prediction.predictedGPA)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
```

This integration will:
1. Import the student's courses from MySlice
2. Calculate their GPA from the imported courses
3. Format the data for the prediction model
4. Generate personalized performance predictions
5. Display the predicted grades and recommendations

## How It Works

1. **Backend API**: The `academic_scraper_api.js` provides endpoints for:
   - Starting a scraping job
   - Checking job status
   - Getting the scraped academic record

2. **Python Scraper**: The `ScrapeCourses.py` script:
   - Uses Selenium to automate browser interaction
   - Handles login to MySlice
   - Navigates to the Academic Progress page
   - Extracts course information
   - Saves results to a JSON file

3. **Frontend Component**: The `AcademicRecordImporter.jsx` component:
   - Provides a user interface for initiating the import
   - Shows import progress
   - Displays the imported courses
   - Allows the user to use the data for recommendations

4. **Performance Prediction**: The `performancePredictor.js` module:
   - Loads a pre-trained TensorFlow.js model
   - Takes the student's academic history
   - Predicts performance in future courses
   - Provides confidence levels and personalized recommendations

## Security

This application uses the following security measures:

- Credentials are never stored in the application code
- Users log in directly to the MySlice portal
- Cookies are saved locally and not transmitted to any third parties
- The API server runs locally on your machine

## Troubleshooting

If you encounter issues:

1. **Login problems**: Make sure you can log in to MySlice in your browser
2. **Scraping fails**: Check the MySlice screenshot saved in the root directory for debugging
3. **No courses found**: Try running the script manually to debug:

```bash
python ScrapeCourses.py
```

## Contributing

If you'd like to improve this feature, please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 