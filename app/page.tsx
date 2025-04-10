import Link from 'next/link';
import CourseScheduler from "@/components/course-scheduler"
import { Button } from '@/components/ui/button'
import { BookUser } from 'lucide-react'

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="mb-8 p-6 bg-white rounded-lg shadow-md border border-gray-200 flex flex-col md:flex-row justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Explore Academic Progress</h2>
          <p className="text-gray-600">
            View degree requirements, track your progress, and see how courses fit into your plan using sample student data.
          </p>
        </div>
        <Link href="/academic-progress" passHref>
          <Button className="mt-4 md:mt-0">
            <BookUser className="mr-2 h-4 w-4" />
            View Sample Progress
          </Button>
        </Link>
      </div>

      <CourseScheduler />
    </main>
  )
}
