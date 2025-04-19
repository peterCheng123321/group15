# Course Scheduler

A modern course scheduling application built with Next.js for university students. Easily browse courses, plan your semester schedule, and manage your academic path.

## Features

- **Course Catalog:** Browse and search through available courses
- **Interactive Calendar:** View your schedule in a weekly calendar format
- **Image Import:** Import schedule screenshots directly using OCR
- **Notification System:** Receive alerts about schedule conflicts and changes
- **Responsive Design:** Works seamlessly on mobile and desktop devices
- **User Authentication:** Secure login and registration system
- **Course Auto-save:** Automatic saving of course selections
- **Academic Progress Tracking:** Monitor your degree requirements

## Tech Stack

- **Frontend:** Next.js, React, TypeScript
- **Styling:** Tailwind CSS, shadcn/ui components
- **OCR Integration:** Tesseract.js for image text recognition
- **State Management:** React hooks and context API
- **Database:** Prisma ORM with SQLite
- **Authentication:** NextAuth.js
- **API:** Next.js API Routes

## Database Configuration

### Prisma Schema

The application uses Prisma ORM with SQLite for data persistence. The schema is defined in `prisma/schema.prisma`:

```prisma
// User model
model User {
  id        String   @id @default(cuid())
  name      String?
  email     String   @unique
  password  String
  courses   SelectedCourse[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

// SelectedCourse model
model SelectedCourse {
  id          String   @id @default(cuid())
  userId      String
  courseClass String
  section     String
  instructor  String?
  daysTimes   String?
  room        String?
  user        User     @relation(fields: [userId], references: [id])
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### Database Setup

1. Install Prisma CLI:
   ```bash
   npm install -g prisma
   ```

2. Initialize the database:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

3. For development, the database is stored in `prisma/dev.db`

## Environment Configuration

Create a `.env` file in the root directory with the following variables:

```env
# Database
DATABASE_URL="file:./dev.db"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"

# Optional: Google OAuth (if using Google authentication)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

## API Endpoints

### Authentication
- `POST /api/auth/[...nextauth]` - NextAuth.js authentication routes
- `POST /api/register` - User registration

### Course Management
- `GET /api/courses` - Get user's saved courses
- `POST /api/courses` - Save user's courses
- `GET /api/requirements` - Get degree requirements
- `GET /api/sample-courses` - Get sample course data

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- SQLite (for database)
- Git

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/peterCheng123321/group15.git
   cd group15
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up the database:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

4. Configure environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. Run the development server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

### Building for Production

```bash
npm run build
npm start
```

## Usage

1. **Course Search:** Use the search functionality to find courses by department, code, or instructor
2. **Calendar View:** Visualize your weekly schedule with color-coded course blocks
3. **Image Import:** Upload an image of your schedule to automatically extract course information
4. **Major Requirements:** View courses required for your major/degree program
5. **User Account:** Register and login to save your course selections
6. **Notifications:** Receive alerts about schedule conflicts and changes

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 