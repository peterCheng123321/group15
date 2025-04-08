// import type { Course, Requirements } from "./types"

// // Add this function at the top of the file to parse CSV data
// export async function parseCsvFile(filePath: string): Promise<Course[]> {
//   try {
//     const response = await fetch(filePath)
//     if (!response.ok) {
//       throw new Error(`Failed to fetch CSV file: ${response.status}`)
//     }

//     const csvText = await response.text()
//     const lines = csvText.split("\n")
//     const headers = lines[0].split(",")

//     const courses: Course[] = []

//     // Start from index 1 to skip headers
//     for (let i = 1; i < lines.length; i++) {
//       if (!lines[i].trim()) continue // Skip empty lines

//       const values = lines[i].split(",")
//       if (values.length < headers.length) continue // Skip malformed lines

//       const course: Course = {
//         id: `csv-course-${i}`,
//         Class: values[0]?.trim() || "",
//         Section: values[1]?.trim() || "",
//         DaysTimes: values[2]?.trim() || "",
//         Room: values[3]?.trim() || "",
//         Instructor: values[4]?.trim() || "",
//         MeetingDates: values[5]?.trim() || "",
//         Reviews:[]
//       }

//       courses.push(course)
//     }

//     return courses
//   } catch (error) {
//     console.error("Error parsing CSV file:", error)
//     return []
//   }
// }

// // Mock function to fetch requirements
// export async function fetchRequirements(): Promise<Requirements> {
//   // In a real app, this would be a fetch call to your API
//   return {
//     Unknown: {
//       "Aerospace Engineering, BS": {
//         Freshman: ["ECS 101", "CHE 106", "CHE 107", "WRT 105", "FYS 101", "ECS 104"],
//         Sophomore: ["MAT 295", "MAT 296", "PHY 211", "PHY 221", "WRT 205", "ECS 221"],
//         Junior: ["ECS 326", "MAT 397", "ECS 325", "MAE 315", "MAE 341", "MAE 312"],
//         Senior: ["MAT 485", "AEE 471", "AEE 427", "AEE 446", "AEE 577", "AEE 472"],
//       },
//       "Biomedical Engineering, BS": {
//         Freshman: ["CHE 106", "CHE 107", "ECS 101", "WRT 105", "FYS 101", "CHE 116"],
//         Sophomore: ["MAT 295", "MAT 296", "PHY 211", "PHY 221", "BEN 201", "BEN 231"],
//         Junior: ["MAT 397", "BEN 333", "ECS 326", "BEN 341", "BEN 364", "BEN 375"],
//         Senior: ["MAT 485", "BEN 568", "BEN 565", "BEN 481", "BEN 485", "BEN 486"],
//       },
//       "Computer Science, BS": {
//         Freshman: ["ECS 101", "CIS 151", "WRT 105", "FYS 101"],
//         Sophomore: ["CRS 225", "MAT 295", "MAT 296", "CIS 252", "PHI 251", "PHY 211"],
//         Junior: ["CRS 325", "IST 344", "MAT 397", "MAT 331", "CIS 321", "PHI 378"],
//         Senior: ["PHI 451", "PHI 551", "PHI 552", "CIS 453", "CIS 477", "CSE 486"],
//       },
//       "Mechanical Engineering, BS": {
//         Freshman: ["ECS 101", "CHE 106", "CHE 107", "WRT 105", "FYS 101", "ECN 101"],
//         Sophomore: ["MAT 295", "ECN 203", "MAT 296", "PHY 211", "PHY 221", "WRT 205"],
//         Junior: ["ECS 326", "MAT 397", "ECS 325", "MAE 315", "MAE 341", "MAE 312"],
//         Senior: ["MAT 485", "MEE 416", "MEE 431", "MEE 471", "MAE 530", "MAE 571"],
//       },
//     },
//   }
// }

// // Replace the existing fetchCourses function with this updated version
// export async function fetchCourses(): Promise<Course[]> {
//   try {
//     // Use the CSV parser to get courses from the CSV file
//     const coursesFromCsv = await parseCsvFile("/courses.csv")

//     if (coursesFromCsv.length > 0) {
//       console.log(`Fetched ${coursesFromCsv.length} courses from CSV`)
//       return coursesFromCsv
//     }

//     // Fallback to mock data if CSV parsing fails
//     console.warn("Using fallback mock data for courses")
//     return [
//       {
//         id: "course-1",
//         Class: "ECS 101",
//         Section: "M001",
//         DaysTimes: "MoWe 9:30AM - 10:50AM",
//         Room: "Link Hall 105",
//         Instructor: "J. Smith",
//         MeetingDates: "01/13/2025 - 04/28/2025",
//       },
//       {
//         id: "course-2",
//         Class: "CHE 106",
//         Section: "M002",
//         DaysTimes: "TuTh 11:00AM - 12:20PM",
//         Room: "Science Building 210",
//         Instructor: "A. Johnson",
//         MeetingDates: "01/13/2025 - 04/28/2025",
//       },
//       {
//         id: "course-3",
//         Class: "MAT 295",
//         Section: "M003",
//         DaysTimes: "MoWeFr 8:00AM - 9:20AM",
//         Room: "Carnegie Hall 100",
//         Instructor: "P. Williams",
//         MeetingDates: "01/13/2025 - 04/28/2025",
//       },
//       {
//         id: "course-4",
//         Class: "PHY 211",
//         Section: "M001",
//         DaysTimes: "TuTh 2:00PM - 3:20PM",
//         Room: "Physics Building 120",
//         Instructor: "R. Thompson",
//         MeetingDates: "01/13/2025 - 04/28/2025",
//       },
//       {
//         id: "course-5",
//         Class: "WRT 105",
//         Section: "M004",
//         DaysTimes: "MoWe 1:00PM - 2:20PM",
//         Room: "Hall of Languages 207",
//         Instructor: "M. Davis",
//         MeetingDates: "01/13/2025 - 04/28/2025",
//       },
//       {
//         id: "course-6",
//         Class: "CIS 151",
//         Section: "M001",
//         DaysTimes: "TuTh 9:30AM - 10:50AM",
//         Room: "Hinds Hall 018",
//         Instructor: "L. Wilson",
//         MeetingDates: "01/13/2025 - 04/28/2025",
//       },
//       {
//         id: "course-7",
//         Class: "MAE 315",
//         Section: "M002",
//         DaysTimes: "MoWeFr 11:00AM - 12:20PM",
//         Room: "Link Hall 203",
//         Instructor: "K. Brown",
//         MeetingDates: "01/13/2025 - 04/28/2025",
//       },
//       {
//         id: "course-8",
//         Class: "BEN 201",
//         Section: "M001",
//         DaysTimes: "TuTh 3:30PM - 4:50PM",
//         Room: "Bowne Hall 110",
//         Instructor: "S. Miller",
//         MeetingDates: "01/13/2025 - 04/28/2025",
//       },
//     ]
//   } catch (error) {
//     console.error("Failed to fetch courses:", error)
//     throw error
//   }
// }

import type { Course, Requirements } from "./types";

// Function to parse the reviews CSV file
async function parseReviewsCsv(
  filePath: string
): Promise<Map<string, string[]>> {
  try {
    const response = await fetch(filePath);
    if (!response.ok) {
      throw new Error(`Failed to fetch reviews CSV file: ${response.status}`);
    }

    const csvText = await response.text();
    const lines = csvText.split("\n");
    const reviewsMap = new Map<string, string[]>();

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue; // Skip empty lines

      const values = lines[i].split(",");

      // console.log(values);

      const professorName = values[0]?.trim() || "";
      const reviews = [
        values[2]?.trim() || "", // RMP_Review1
        values[3]?.trim() || "", // RMP_Review2
        values[4]?.trim() || "", // RMP_Review3
      ];
      reviewsMap.set(professorName, reviews);
    }
    // console.log(reviewsMap);
    return reviewsMap;
  } catch (error) {
    console.error("Error parsing reviews CSV file:", error);
    return new Map();
  }
}

// Function to parse courses CSV and merge reviews
export async function parseCsvFile(
  filePath: string,
  reviewsFilePath: string
): Promise<Course[]> {
  try {
    const response = await fetch(filePath);
    if (!response.ok) {
      throw new Error(`Failed to fetch CSV file: ${response.status}`);
    }

    const csvText = await response.text();
    const lines = csvText.split("\n");
    const headers = lines[0].split(",");

    const courses: Course[] = [];

    // Fetch and parse reviews CSV
    const reviewsMap = await parseReviewsCsv(reviewsFilePath);

    // console.log(reviewsMap);

    // Start from index 1 to skip headers
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue; // Skip empty lines

      const values = lines[i].split(",");
      // if (values.length < headers.length) continue; // Skip malformed lines

      console.log(lines[i]);
      console.log(reviewsMap.get(lines[i]));

      const course: Course = {
        id: `csv-course-${i}`,
        Class: values[0]?.trim() || "",
        Section: values[1]?.trim() || "",
        DaysTimes: values[2]?.trim() || "",
        Room: values[3]?.trim() || "",
        Instructor: values[4]?.trim() || "",
        MeetingDates: values[5]?.trim() || "",
        Reviews: reviewsMap.get(values[4]?.trim() || "") || [],
      };

      courses.push(course);
    }

    console.log(`Fetched ${courses.length} courses from CSV`);

    return courses;
  } catch (error) {
    console.error("Error parsing CSV file:", error);
    return [];
  }
}

// Mock function to fetch requirements
export async function fetchRequirements(): Promise<Requirements> {
  // In a real app, this would be a fetch call to your API
  return {
    Unknown: {
      "Aerospace Engineering, BS": {
        Freshman: [
          "ECS 101",
          "CHE 106",
          "CHE 107",
          "WRT 105",
          "FYS 101",
          "ECS 104",
        ],
        Sophomore: [
          "MAT 295",
          "MAT 296",
          "PHY 211",
          "PHY 221",
          "WRT 205",
          "ECS 221",
        ],
        Junior: [
          "ECS 326",
          "MAT 397",
          "ECS 325",
          "MAE 315",
          "MAE 341",
          "MAE 312",
        ],
        Senior: [
          "MAT 485",
          "AEE 471",
          "AEE 427",
          "AEE 446",
          "AEE 577",
          "AEE 472",
        ],
      },
      "Biomedical Engineering, BS": {
        Freshman: [
          "CHE 106",
          "CHE 107",
          "ECS 101",
          "WRT 105",
          "FYS 101",
          "CHE 116",
        ],
        Sophomore: [
          "MAT 295",
          "MAT 296",
          "PHY 211",
          "PHY 221",
          "BEN 201",
          "BEN 231",
        ],
        Junior: [
          "MAT 397",
          "BEN 333",
          "ECS 326",
          "BEN 341",
          "BEN 364",
          "BEN 375",
        ],
        Senior: [
          "MAT 485",
          "BEN 568",
          "BEN 565",
          "BEN 481",
          "BEN 485",
          "BEN 486",
        ],
      },
      "Computer Science, BS": {
        Freshman: ["ECS 101", "CIS 151", "WRT 105", "FYS 101"],
        Sophomore: [
          "CRS 225",
          "MAT 295",
          "MAT 296",
          "CIS 252",
          "PHI 251",
          "PHY 211",
        ],
        Junior: [
          "CRS 325",
          "IST 344",
          "MAT 397",
          "MAT 331",
          "CIS 321",
          "PHI 378",
        ],
        Senior: [
          "PHI 451",
          "PHI 551",
          "PHI 552",
          "CIS 453",
          "CIS 477",
          "CSE 486",
        ],
      },
      "Mechanical Engineering, BS": {
        Freshman: [
          "ECS 101",
          "CHE 106",
          "CHE 107",
          "WRT 105",
          "FYS 101",
          "ECN 101",
        ],
        Sophomore: [
          "MAT 295",
          "ECN 203",
          "MAT 296",
          "PHY 211",
          "PHY 221",
          "WRT 205",
        ],
        Junior: [
          "ECS 326",
          "MAT 397",
          "ECS 325",
          "MAE 315",
          "MAE 341",
          "MAE 312",
        ],
        Senior: [
          "MAT 485",
          "MEE 416",
          "MEE 431",
          "MEE 471",
          "MAE 530",
          "MAE 571",
        ],
      },
    },
  };
}

// Replace the existing fetchCourses function with this updated version
export async function fetchCourses(): Promise<Course[]> {
  try {
    // Use the CSV parser to get courses from the CSV file
    const coursesFromCsv = await parseCsvFile(
      "/courses.csv",
      "/courses_with_ratings.csv"
    );

    console.log(`Fetched ${coursesFromCsv.length} courses from CSV`);
    if (coursesFromCsv.length > 0) {
      console.log(`Fetched ${coursesFromCsv.length} courses from CSV`);
      return coursesFromCsv;
    }

    // Fallback to mock data if CSV parsing fails
    console.warn("Using fallback mock data for courses");
    return [
      {
        id: "course-1",
        Class: "ECS 101",
        Section: "M001",
        DaysTimes: "MoWe 9:30AM - 10:50AM",
        Room: "Link Hall 105",
        Instructor: "J. Smith",
        MeetingDates: "01/13/2025 - 04/28/2025",
        Reviews: [
          "Great course, taught by a great professor!",
          "The professor was very knowledgeable.",
        ],
      },
      {
        id: "course-2",
        Class: "CHE 106",
        Section: "M002",
        DaysTimes: "TuTh 11:00AM - 12:20PM",
        Room: "Science Building 210",
        Instructor: "A. Johnson",
        MeetingDates: "01/13/2025 - 04/28/2025",
        Reviews: [
          "Great course, taught by a great professor!",
          "The professor was very knowledgeable.",
        ],
      },
      {
        id: "course-3",
        Class: "MAT 295",
        Section: "M003",
        DaysTimes: "MoWeFr 8:00AM - 9:20AM",
        Room: "Carnegie Hall 100",
        Instructor: "P. Williams",
        MeetingDates: "01/13/2025 - 04/28/2025",
        Reviews: [
          "Great course, taught by a great professor!",
          "The professor was very knowledgeable.",
        ],
      },
      {
        id: "course-4",
        Class: "PHY 211",
        Section: "M001",
        DaysTimes: "TuTh 2:00PM - 3:20PM",
        Room: "Physics Building 120",
        Instructor: "R. Thompson",
        MeetingDates: "01/13/2025 - 04/28/2025",
        Reviews: [
          "Great course, taught by a great professor!",
          "The professor was very knowledgeable.",
        ],
      },
      {
        id: "course-5",
        Class: "WRT 105",
        Section: "M004",
        DaysTimes: "MoWe 1:00PM - 2:20PM",
        Room: "Hall of Languages 207",
        Instructor: "M. Davis",
        MeetingDates: "01/13/2025 - 04/28/2025",
        Reviews: [
          "Great course, taught by a great professor!",
          "The professor was very knowledgeable.",
        ],
      },
      {
        id: "course-6",
        Class: "CIS 151",
        Section: "M001",
        DaysTimes: "TuTh 9:30AM - 10:50AM",
        Room: "Hinds Hall 018",
        Instructor: "L. Wilson",
        MeetingDates: "01/13/2025 - 04/28/2025",
        Reviews: [
          "Great course, taught by a great professor!",
          "The professor was very knowledgeable.",
        ],
      },
      {
        id: "course-7",
        Class: "MAE 315",
        Section: "M002",
        DaysTimes: "MoWeFr 11:00AM - 12:20PM",
        Room: "Link Hall 203",
        Instructor: "K. Brown",
        MeetingDates: "01/13/2025 - 04/28/2025",
        Reviews: [
          "Great course, taught by a great professor!",
          "The professor was very knowledgeable.",
        ],
      },
      {
        id: "course-8",
        Class: "BEN 201",
        Section: "M001",
        DaysTimes: "TuTh 3:30PM - 4:50PM",
        Room: "Bowne Hall 110",
        Instructor: "S. Miller",
        MeetingDates: "01/13/2025 - 04/28/2025",
        Reviews: [
          "Great course, taught by a great professor!",
          "The professor was very knowledgeable.",
        ],
      },
    ];
  } catch (error) {
    console.error("Failed to fetch courses:", error);
    throw error;
  }
}
