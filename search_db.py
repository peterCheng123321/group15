import sqlite3

# **Connect to the SQLite database**
conn = sqlite3.connect("courses.db")
cursor = conn.cursor()

# **Prompt the user to enter a search keyword**
keyword = input("🔍 Enter search keyword (course code or name): ")

# **Execute SQL query to search for courses**
cursor.execute("SELECT * FROM courses WHERE course_code LIKE ? OR course_name LIKE ? OR description LIKE ?",
               (f"%{keyword}%", f"%{keyword}%", f"%{keyword}%"))

# **Fetch all matching results**
results = cursor.fetchall()

# **Display search results**
if results:
    print("\n✅ Search Results:")
    for row in results:
        print(f"📌 {row[1]} - {row[2]}\n   {row[3]}\n")
else:
    print("❌ No matching courses found.")

# **Close the database connection**
conn.close()
