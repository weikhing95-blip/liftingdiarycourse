"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { Pencil, Trash2, Check } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  updateWorkoutNameAction,
  updateSetAction,
  deleteSetAction,
} from "./actions"

type Set = {
  id: number
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
  const [editing, setEditing] = useState(false)
  const [workoutName, setWorkoutName] = useState(workout?.name ?? "")
  const [isPending, startTransition] = useTransition()

  // Reset local state when workout changes
  const [lastWorkoutId, setLastWorkoutId] = useState(workout?.id)
  if (workout?.id !== lastWorkoutId) {
    setLastWorkoutId(workout?.id)
    setWorkoutName(workout?.name ?? "")
    setEditing(false)
  }

  function handleDone() {
    if (!workout) return
    startTransition(async () => {
      const trimmed = workoutName.trim()
      if (trimmed && trimmed !== (workout.name ?? "")) {
        await updateWorkoutNameAction({ workoutId: workout.id, name: trimmed })
      }
      setEditing(false)
    })
  }

  return (
    <Sheet
      open={workout !== null}
      onOpenChange={(open) => {
        if (!open) {
          setEditing(false)
          router.push(`/dashboard?date=${dateParam}`)
        }
      }}
    >
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        {workout && (
          <>
            <SheetHeader className="mb-4">
              <div className="flex items-start justify-between gap-2">
                {editing ? (
                  <Input
                    value={workoutName}
                    onChange={(e) => setWorkoutName(e.target.value)}
                    className="text-lg font-semibold h-auto py-1"
                    autoFocus
                  />
                ) : (
                  <SheetTitle>{workout.name ?? "Untitled Workout"}</SheetTitle>
                )}
                {editing ? (
                  <Button
                    size="sm"
                    onClick={handleDone}
                    disabled={isPending}
                    className="shrink-0"
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Done
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditing(true)}
                    className="shrink-0"
                  >
                    <Pencil className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                )}
              </div>
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
                        {editing && <TableHead className="w-10" />}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {exercise.sets.map((s) => (
                        <EditableSetRow
                          key={s.id}
                          set={s}
                          showDuration={exercise.sets.some((s) => s.durationSeconds)}
                          editing={editing}
                        />
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

function EditableSetRow({
  set,
  showDuration,
  editing,
}: {
  set: Set
  showDuration: boolean
  editing: boolean
}) {
  const [weightLbs, setWeightLbs] = useState(set.weightLbs ?? "")
  const [reps, setReps] = useState(set.reps?.toString() ?? "")
  const [duration, setDuration] = useState(set.durationSeconds?.toString() ?? "")
  const [isPending, startTransition] = useTransition()

  function saveField(field: "weightLbs" | "reps" | "durationSeconds") {
    startTransition(async () => {
      const data: { setId: number; weightLbs?: string | null; reps?: number | null; durationSeconds?: number | null } = {
        setId: set.id,
      }
      if (field === "weightLbs") data.weightLbs = weightLbs.trim() || null
      if (field === "reps") data.reps = reps.trim() ? parseInt(reps, 10) : null
      if (field === "durationSeconds") data.durationSeconds = duration.trim() ? parseInt(duration, 10) : null
      await updateSetAction(data)
    })
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteSetAction(set.id)
    })
  }

  return (
    <TableRow className={!set.completed ? "opacity-50" : ""}>
      <TableCell>{set.setNumber}</TableCell>
      <TableCell>
        {editing ? (
          <Input
            value={weightLbs}
            onChange={(e) => setWeightLbs(e.target.value)}
            onBlur={() => saveField("weightLbs")}
            placeholder="—"
            className="h-7 w-20 px-2 text-sm"
            disabled={isPending}
          />
        ) : (
          set.weightLbs ? `${set.weightLbs} lbs` : "—"
        )}
      </TableCell>
      <TableCell>
        {editing ? (
          <Input
            value={reps}
            onChange={(e) => setReps(e.target.value)}
            onBlur={() => saveField("reps")}
            placeholder="—"
            className="h-7 w-16 px-2 text-sm"
            type="number"
            min={0}
            disabled={isPending}
          />
        ) : (
          set.reps ?? "—"
        )}
      </TableCell>
      {showDuration && (
        <TableCell>
          {editing ? (
            <Input
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              onBlur={() => saveField("durationSeconds")}
              placeholder="—"
              className="h-7 w-16 px-2 text-sm"
              type="number"
              min={0}
              disabled={isPending}
            />
          ) : (
            set.durationSeconds ? `${set.durationSeconds}s` : "—"
          )}
        </TableCell>
      )}
      {editing && (
        <TableCell>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={handleDelete}
            disabled={isPending}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </TableCell>
      )}
    </TableRow>
  )
}
