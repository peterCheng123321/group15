import sqlite3
import json

# **Define database and JSON file names**
db_name = "courses.db"
json_file = "syracuse_courses.json"  

# **Load JSON Data**
try:
    with open(json_file, "r", encoding="utf-8") as file:
        courses = json.load(file)
except FileNotFoundError:
    print(f"❌ Error: JSON file '{json_file}' not found!")
    exit()
except json.JSONDecodeError:
    print("❌ Error: Invalid JSON format!")
    exit()

# **Connect to SQLite database**
conn = sqlite3.connect(db_name)
cursor = conn.cursor()

# **Create 'courses' table**
cursor.execute("""
CREATE TABLE IF NOT EXISTS courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_code TEXT NOT NULL,
    course_name TEXT NOT NULL,
    description TEXT
)
""")

# **Clear table before inserting new data**
cursor.execute("DELETE FROM courses")

# **Insert data from JSON**
for course in courses:
    title = course.get("Course Title", "Unknown Title")
    description = course.get("Description", "No description available")

    # Extract course code (e.g., "CIS 151 - Fundamentals of Computing and Programming")
    parts = title.split(" - ", 1)
    if len(parts) == 2:
        course_code = parts[0]
        course_name = parts[1]
    else:
        course_code = "Unknown Code"
        course_name = title

    cursor.execute("INSERT INTO courses (course_code, course_name, description) VALUES (?, ?, ?)",
                   (course_code, course_name, description))

# **Commit changes and close connection**
conn.commit()
conn.close()

print(f"✅ Successfully created '{db_name}' and imported {len(courses)} courses!")
