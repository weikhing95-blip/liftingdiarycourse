"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  addExerciseAction,
  removeExerciseAction,
  addSetAction,
  toggleSetAction,
  completeWorkoutAction,
} from "./actions";

type SetData = {
  id: number;
  setNumber: number;
  weightLbs: string | null;
  reps: number | null;
  durationSeconds: number | null;
  completed: boolean;
};

type ExerciseData = {
  workoutExerciseId: number;
  name: string;
  category: string | null;
  sets: SetData[];
};

type WorkoutData = {
  id: number;
  name: string | null;
  startedAt: Date | null;
  duration: string | null;
  exercises: ExerciseData[];
};

type ExerciseOption = {
  id: number;
  name: string;
  category: string | null;
};

const emptySetForm = { weight: "", reps: "", duration: "" };

export function WorkoutActiveClient({
  workout,
  allExercises,
}: {
  workout: WorkoutData;
  allExercises: ExerciseOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [activeSetFormId, setActiveSetFormId] = useState<number | null>(null);
  const [setFormValues, setSetFormValues] = useState(emptySetForm);

  const filteredExercises = allExercises.filter((e) =>
    e.name.toLowerCase().includes(exerciseSearch.toLowerCase())
  );

  function handleAddExercise(exerciseId: number) {
    startTransition(async () => {
      await addExerciseAction({ workoutId: workout.id, exerciseId });
      router.refresh();
      setDialogOpen(false);
      setExerciseSearch("");
    });
  }

  function handleRemoveExercise(workoutExerciseId: number) {
    startTransition(async () => {
      await removeExerciseAction(workoutExerciseId);
      router.refresh();
    });
  }

  function handleAddSet(workoutExerciseId: number) {
    const weightLbs = setFormValues.weight.trim() || null;
    const reps = setFormValues.reps ? parseInt(setFormValues.reps) : null;
    const durationSeconds = setFormValues.duration ? parseInt(setFormValues.duration) : null;

    startTransition(async () => {
      await addSetAction({ workoutExerciseId, weightLbs, reps, durationSeconds });
      router.refresh();
      setActiveSetFormId(null);
      setSetFormValues(emptySetForm);
    });
  }

  function handleToggleSet(setId: number, completed: boolean) {
    startTransition(async () => {
      await toggleSetAction({ setId, completed: !completed });
      router.refresh();
    });
  }

  function handleCompleteWorkout() {
    startTransition(async () => {
      await completeWorkoutAction(workout.id);
    });
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{workout.name ?? "Untitled Workout"}</h1>
          {workout.startedAt && (
            <p className="text-sm text-muted-foreground mt-1">
              Started {format(workout.startedAt, "do MMM yyyy")}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="outline">In Progress</Badge>
          <Button onClick={handleCompleteWorkout} disabled={isPending}>
            Finish Workout
          </Button>
        </div>
      </div>

      <Separator />

      {/* Exercise List */}
      <div className="space-y-4">
        {workout.exercises.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No exercises yet. Add one below to get started.
          </p>
        )}

        {workout.exercises.map((exercise) => {
          const hasDuration = exercise.sets.some((s) => s.durationSeconds);
          const isFormOpen = activeSetFormId === exercise.workoutExerciseId;

          return (
            <Card key={exercise.workoutExerciseId}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{exercise.name}</CardTitle>
                    {exercise.category && (
                      <p className="text-xs text-muted-foreground">{exercise.category}</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleRemoveExercise(exercise.workoutExerciseId)}
                    disabled={isPending}
                  >
                    Remove
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                {exercise.sets.length > 0 && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">Set</TableHead>
                        <TableHead>Weight</TableHead>
                        <TableHead>Reps</TableHead>
                        {hasDuration && <TableHead>Duration</TableHead>}
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {exercise.sets.map((s) => (
                        <TableRow key={s.id} className={!s.completed ? "opacity-60" : ""}>
                          <TableCell>{s.setNumber}</TableCell>
                          <TableCell>{s.weightLbs ? `${s.weightLbs} lbs` : "—"}</TableCell>
                          <TableCell>{s.reps ?? "—"}</TableCell>
                          {hasDuration && (
                            <TableCell>
                              {s.durationSeconds ? `${s.durationSeconds}s` : "—"}
                            </TableCell>
                          )}
                          <TableCell>
                            <Button
                              variant={s.completed ? "default" : "outline"}
                              size="sm"
                              onClick={() => handleToggleSet(s.id, s.completed)}
                              disabled={isPending}
                            >
                              {s.completed ? "Done" : "Mark Done"}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}

                {isFormOpen ? (
                  <div className="flex flex-wrap gap-2 items-end pt-1">
                    <div className="space-y-1">
                      <Label className="text-xs">Weight (lbs)</Label>
                      <Input
                        className="w-28"
                        placeholder="e.g. 135"
                        value={setFormValues.weight}
                        onChange={(e) =>
                          setSetFormValues((v) => ({ ...v, weight: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Reps</Label>
                      <Input
                        className="w-20"
                        type="number"
                        placeholder="e.g. 8"
                        value={setFormValues.reps}
                        onChange={(e) =>
                          setSetFormValues((v) => ({ ...v, reps: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Duration (sec)</Label>
                      <Input
                        className="w-28"
                        type="number"
                        placeholder="optional"
                        value={setFormValues.duration}
                        onChange={(e) =>
                          setSetFormValues((v) => ({ ...v, duration: e.target.value }))
                        }
                      />
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleAddSet(exercise.workoutExerciseId)}
                      disabled={isPending}
                    >
                      Save Set
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setActiveSetFormId(null);
                        setSetFormValues(emptySetForm);
                      }}
                      disabled={isPending}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setActiveSetFormId(exercise.workoutExerciseId);
                      setSetFormValues(emptySetForm);
                    }}
                    disabled={isPending}
                  >
                    + Add Set
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Add Exercise */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="w-full">
            + Add Exercise
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Exercise</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Search exercises..."
              value={exerciseSearch}
              onChange={(e) => setExerciseSearch(e.target.value)}
              autoFocus
            />
            <div className="max-h-80 overflow-y-auto space-y-1">
              {filteredExercises.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No exercises found.
                </p>
              ) : (
                filteredExercises.map((e) => (
                  <Button
                    key={e.id}
                    variant="ghost"
                    className="w-full justify-start h-auto py-2"
                    onClick={() => handleAddExercise(e.id)}
                    disabled={isPending}
                  >
                    <div className="text-left">
                      <p className="font-medium">{e.name}</p>
                      {e.category && (
                        <p className="text-xs text-muted-foreground">{e.category}</p>
                      )}
                    </div>
                  </Button>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
