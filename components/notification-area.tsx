"use client"

import { useEffect, useState } from "react"
import { CheckCircle, AlertTriangle, XCircle, X } from "lucide-react"
import type { Notification } from "@/lib/types"

interface NotificationAreaProps {
  notifications: Notification[]
  onRemove: (id: string) => void
}

export function NotificationArea({ notifications, onRemove }: NotificationAreaProps) {
  return (
    <div className="fixed top-5 right-5 z-50 flex flex-col gap-2 max-w-[350px]">
      {notifications.map((notification) => (
        <NotificationItem key={notification.id} notification={notification} onRemove={onRemove} />
      ))}
    </div>
  )
}

interface NotificationItemProps {
  notification: Notification
  onRemove: (id: string) => void
}

function NotificationItem({ notification, onRemove }: NotificationItemProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Delay to allow animation
    const timer = setTimeout(() => {
      setIsVisible(true)
    }, 10)

    return () => clearTimeout(timer)
  }, [])

  const getIcon = () => {
    switch (notification.type) {
      case "success":
        return <CheckCircle className="h-5 w-5" />
      case "warning":
        return <AlertTriangle className="h-5 w-5" />
      case "error":
        return <XCircle className="h-5 w-5" />
      default:
        return null
    }
  }

  const getBackgroundColor = () => {
    switch (notification.type) {
      case "success":
        return "bg-green-500"
      case "warning":
        return "bg-amber-500"
      case "error":
        return "bg-red-500"
      default:
        return "bg-gray-800"
    }
  }

  return (
    <div
      className={`${getBackgroundColor()} text-white p-4 rounded-lg shadow-lg flex items-center gap-3 cursor-pointer transition-all duration-300 transform ${
        isVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-full"
      }`}
      onClick={() => onRemove(notification.id)}
    >
      {getIcon()}
      <span>{notification.message}</span>
      <button
        className="ml-auto text-white/80 hover:text-white"
        onClick={(e) => {
          e.stopPropagation()
          onRemove(notification.id)
        }}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
