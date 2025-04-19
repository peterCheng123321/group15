'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import CourseScheduler from "@/components/course-scheduler"
import { Button } from '@/components/ui/button'
import { BookUser, LogIn, UserPlus } from 'lucide-react'

export default function Home() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const handleLogout = async () => {
    try {
      await signOut({ 
        redirect: true,
        callbackUrl: '/'
      });
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-8">
      <nav className="bg-white shadow-sm mb-8 rounded-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-bold">Course Scheduler</h1>
              </div>
            </div>
            <div className="flex items-center ml-auto">
              {status === 'authenticated' && session?.user ? (
                <div className="flex items-center space-x-4">
                  <div className="flex flex-col items-end">
                    <span className="text-sm font-medium text-gray-900">
                      {session.user.name || 'User'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {session.user.email}
                    </span>
                  </div>
                  <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-medium">
                    {session.user.name?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <button
                    onClick={handleLogout}
                    className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-100"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-4">
                  <Link
                    href="/login"
                    className="flex items-center text-indigo-600 hover:text-indigo-800 px-4 py-2 rounded-md text-sm font-medium border border-indigo-600 hover:bg-indigo-50 transition-colors"
                  >
                    <LogIn className="mr-2 h-4 w-4" />
                    Login
                  </Link>
                  <Link
                    href="/register"
                    className="flex items-center bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    Register
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

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
