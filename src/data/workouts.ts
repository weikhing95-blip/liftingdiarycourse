import { db } from "@/db";
import { workouts, workoutExercises, exercises, sets } from "@/db/schema";
import { eq, and, gte, lt, count, inArray, asc } from "drizzle-orm";
import { startOfDay, addDays } from "date-fns";

export async function getWorkoutsForDate(userId: string, date: Date) {
  const start = startOfDay(date);
  const end = startOfDay(addDays(date, 1));

  const userWorkouts = await db
    .select()
    .from(workouts)
    .where(
      and(
        eq(workouts.userId, userId),
        gte(workouts.createdAt, start),
        lt(workouts.createdAt, end)
      )
    );

  if (userWorkouts.length === 0) return [];

  const workoutIds = userWorkouts.map((w) => w.id);

  const exerciseNames = await db
    .select({
      workoutId: workoutExercises.workoutId,
      name: exercises.name,
    })
    .from(workoutExercises)
    .innerJoin(exercises, eq(workoutExercises.exerciseId, exercises.id))
    .where(inArray(workoutExercises.workoutId, workoutIds));

  const setCounts = await db
    .select({
      workoutId: workoutExercises.workoutId,
      total: count(sets.id),
    })
    .from(sets)
    .innerJoin(workoutExercises, eq(sets.workoutExerciseId, workoutExercises.id))
    .where(inArray(workoutExercises.workoutId, workoutIds))
    .groupBy(workoutExercises.workoutId);

  return userWorkouts.map((workout) => {
    const exercises = exerciseNames
      .filter((e) => e.workoutId === workout.id)
      .map((e) => e.name);

    const setCountEntry = setCounts.find((sc) => sc.workoutId === workout.id);
    const setCount = setCountEntry ? Number(setCountEntry.total) : 0;

    let duration: string | null = null;
    if (workout.startedAt && workout.completedAt) {
      const minutes = Math.round(
        (workout.completedAt.getTime() - workout.startedAt.getTime()) / 60000
      );
      duration = `${minutes} min`;
    }

    return {
      id: workout.id,
      name: workout.name,
      exercises,
      sets: setCount,
      duration,
    };
  });
}

export async function getWorkoutDetail(workoutId: number, userId: string) {
  const [workout] = await db
    .select()
    .from(workouts)
    .where(and(eq(workouts.id, workoutId), eq(workouts.userId, userId)));

  if (!workout) return null;

  const workoutExerciseRows = await db
    .select({
      workoutExerciseId: workoutExercises.id,
      order: workoutExercises.order,
      exerciseName: exercises.name,
      exerciseCategory: exercises.category,
    })
    .from(workoutExercises)
    .innerJoin(exercises, eq(workoutExercises.exerciseId, exercises.id))
    .where(eq(workoutExercises.workoutId, workoutId))
    .orderBy(asc(workoutExercises.order));

  const workoutExerciseIds = workoutExerciseRows.map((r) => r.workoutExerciseId);

  const setRows =
    workoutExerciseIds.length > 0
      ? await db
          .select()
          .from(sets)
          .where(inArray(sets.workoutExerciseId, workoutExerciseIds))
          .orderBy(asc(sets.workoutExerciseId), asc(sets.setNumber))
      : [];

  const exerciseDetails = workoutExerciseRows.map((ex) => ({
    workoutExerciseId: ex.workoutExerciseId,
    name: ex.exerciseName,
    category: ex.exerciseCategory,
    sets: setRows
      .filter((s) => s.workoutExerciseId === ex.workoutExerciseId)
      .map((s) => ({
        setNumber: s.setNumber,
        weightLbs: s.weightLbs,
        reps: s.reps,
        durationSeconds: s.durationSeconds,
        completed: s.completed,
      })),
  }));

  let duration: string | null = null;
  if (workout.startedAt && workout.completedAt) {
    const minutes = Math.round(
      (workout.completedAt.getTime() - workout.startedAt.getTime()) / 60000
    );
    duration = `${minutes} min`;
  }

  return {
    id: workout.id,
    name: workout.name,
    startedAt: workout.startedAt,
    duration,
    exercises: exerciseDetails,
  };
}
