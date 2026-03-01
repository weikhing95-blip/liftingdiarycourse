"use client"

import { useState } from "react"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const mockWorkouts = [
  {
    id: 1,
    name: "Morning Strength",
    exercises: ["Squat", "Bench Press", "Deadlift"],
    sets: 12,
    duration: "45 min",
  },
  {
    id: 2,
    name: "Upper Body Push",
    exercises: ["Overhead Press", "Dips", "Tricep Pushdown"],
    sets: 9,
    duration: "30 min",
  },
]

export default function DashboardPage() {
  const [date, setDate] = useState<Date>(new Date())
  const [open, setOpen] = useState(false)

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Workout Log</h1>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              <CalendarIcon className="h-4 w-4" />
              {format(date, "do MMM yyyy")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(d) => {
                if (d) {
                  setDate(d)
                  setOpen(false)
                }
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-4">
        {mockWorkouts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No workouts logged for {format(date, "do MMM yyyy")}.
            </CardContent>
          </Card>
        ) : (
          mockWorkouts.map((workout) => (
            <Card key={workout.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-medium">{workout.name}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{workout.sets} sets</Badge>
                    <Badge variant="outline">{workout.duration}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {workout.exercises.join(" · ")}
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
