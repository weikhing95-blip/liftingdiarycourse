"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { format, startOfMonth, endOfMonth, addDays, isSameDay } from "date-fns"
import { CalendarIcon } from "lucide-react"
import { Calendar, CalendarDayButton } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { getWorkoutDatesForMonthAction } from "./actions"

export function DatePicker({ date }: { date: Date }) {
  const [open, setOpen] = useState(false)
  const [workoutDates, setWorkoutDates] = useState<Date[]>([])
  const [currentMonth, setCurrentMonth] = useState(date)
  const router = useRouter()

  const fetchWorkoutDates = async (monthDate: Date) => {
    const start = startOfMonth(monthDate)
    const end = endOfMonth(monthDate)
    const extendedStart = addDays(start, -7) // Include previous week days that might be visible
    const extendedEnd = addDays(end, 14) // Include next week days that might be visible
    
    try {
      const dates = await getWorkoutDatesForMonthAction({ 
        startDate: extendedStart, 
        endDate: extendedEnd 
      })
      setWorkoutDates(dates)
    } catch (error) {
      console.error('Failed to fetch workout dates:', error)
      setWorkoutDates([])
    }
  }

  useEffect(() => {
    if (open) {
      fetchWorkoutDates(currentMonth)
    }
  }, [open, currentMonth])

  const hasWorkout = (checkDate: Date) => {
    return workoutDates.some(workoutDate => isSameDay(workoutDate, checkDate))
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="gap-2">
          <CalendarIcon className="h-4 w-4" />
          {format(date, "do MMM yyyy")}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="center">
        <Calendar
          mode="single"
          selected={date}
          month={currentMonth}
          onMonthChange={setCurrentMonth}
          onSelect={(d) => {
            if (d) {
              router.push(`/dashboard?date=${format(d, "yyyy-MM-dd")}`)
              setOpen(false)
            }
          }}
          components={{
            DayButton: ({ day, modifiers, ...props }) => {
              const dayHasWorkout = hasWorkout(day.date)
              
              return (
                <div className="relative w-full">
                  <CalendarDayButton
                    day={day}
                    modifiers={modifiers}
                    {...props}
                  />
                  {dayHasWorkout && (
                    <div className="absolute -bottom-0.5 left-1/2 transform -translate-x-1/2">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                    </div>
                  )}
                </div>
              )
            }
          }}
          initialFocus
        />
        <div className="px-3 pb-3 pt-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
              <span>Has workouts</span>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
