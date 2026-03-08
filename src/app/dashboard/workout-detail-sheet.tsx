"use client"

import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type Set = {
  setNumber: number
  weightLbs: string | null
  reps: number | null
  durationSeconds: number | null
  completed: boolean
}

type Exercise = {
  workoutExerciseId: number
  name: string
  category: string | null
  sets: Set[]
}

type WorkoutDetail = {
  id: number
  name: string | null
  startedAt: Date | null
  duration: string | null
  exercises: Exercise[]
}

export function WorkoutDetailSheet({
  workout,
  date,
  dateParam,
}: {
  workout: WorkoutDetail | null
  date: Date
  dateParam: string
}) {
  const router = useRouter()

  return (
    <Sheet
      open={workout !== null}
      onOpenChange={(open) => {
        if (!open) router.push(`/dashboard?date=${dateParam}`)
      }}
    >
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        {workout && (
          <>
            <SheetHeader className="mb-4">
              <SheetTitle>{workout.name ?? "Untitled Workout"}</SheetTitle>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{format(date, "do MMM yyyy")}</span>
                {workout.duration && (
                  <>
                    <span>·</span>
                    <Badge variant="outline">{workout.duration}</Badge>
                  </>
                )}
              </div>
            </SheetHeader>

            <div className="space-y-6">
              {workout.exercises.map((exercise, i) => (
                <div key={exercise.workoutExerciseId}>
                  {i > 0 && <Separator className="mb-6" />}
                  <div className="mb-3">
                    <p className="font-medium">{exercise.name}</p>
                    {exercise.category && (
                      <p className="text-xs text-muted-foreground">{exercise.category}</p>
                    )}
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">Set</TableHead>
                        <TableHead>Weight</TableHead>
                        <TableHead>Reps</TableHead>
                        {exercise.sets.some((s) => s.durationSeconds) && (
                          <TableHead>Duration</TableHead>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {exercise.sets.map((s) => (
                        <TableRow key={s.setNumber} className={!s.completed ? "opacity-50" : ""}>
                          <TableCell>{s.setNumber}</TableCell>
                          <TableCell>
                            {s.weightLbs ? `${s.weightLbs} lbs` : "—"}
                          </TableCell>
                          <TableCell>{s.reps ?? "—"}</TableCell>
                          {exercise.sets.some((s) => s.durationSeconds) && (
                            <TableCell>
                              {s.durationSeconds ? `${s.durationSeconds}s` : "—"}
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ))}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
