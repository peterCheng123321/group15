import json
import sqlite3
import os

# **Check if the real JSON file exists, otherwise use the fake JSON file**
json_file = "syracuse_courses.json" if os.path.exists("syracuse_courses.json") and os.path.getsize("syracuse_courses.json") > 2 else "fake_courses.json"

# **Load JSON file**
with open(json_file, "r", encoding="utf-8") as f:
    courses = json.load(f)

# **Connect to SQLite database**
conn = sqlite3.connect("courses.db")
cursor = conn.cursor()

# **Create 'courses' table if it doesn't exist**
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

# **Insert course data**
for course in courses:
    title = course.get("Course Title", "Unknown Title")
    description = course.get("Description", "No description available")

    # **Extract course code and name**
    parts = title.split(" - ", 1)
    if len(parts) == 2:
        course_code = parts[0]  # Course Code
        course_name = parts[1]  # Course Name
    else:
        course_code = "Unknown Code"
        course_name = title

    cursor.execute("INSERT INTO courses (course_code, course_name, description) VALUES (?, ?, ?)",
                   (course_code, course_name, description))

# **Commit changes and close connection**
conn.commit()
conn.close()

print(f"✅ Successfully imported {len(courses)} courses from '{json_file}' into SQLite database (courses.db)")
