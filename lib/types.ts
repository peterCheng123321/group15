export interface Course {
  id?: string
  Class?: string
  Section?: string
  DaysTimes?: string
  Room?: string
  Instructor?: string
  MeetingDates?: string
  RMP_Rating?: string
}

export interface SelectedCourse extends Course {
  id: string
}

export interface Notification {
  id: string
  message: string
  type: "success" | "warning" | "error" | "default"
}

export interface Major {
  id: string
  name: string
}

export interface Requirements {
  [key: string]: {
    [majorName: string]: {
      [year: string]: string[]
    }
  }
}
