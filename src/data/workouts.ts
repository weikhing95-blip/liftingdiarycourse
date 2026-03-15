import { db } from "@/db";
import { workouts, workoutExercises, exercises, sets } from "@/db/schema";
import { eq, and, gte, lt, count, inArray, asc } from "drizzle-orm";
import { startOfDay, addDays } from "date-fns";

export async function createWorkout(userId: string, name: string, startedAt?: Date, completedAt?: Date) {
  const [workout] = await db
    .insert(workouts)
    .values({ userId, name, startedAt, completedAt })
    .returning();
  return workout;
}

export async function addExerciseToWorkout(workoutId: number, exerciseId: number, userId: string) {
  const [workout] = await db
    .select({ id: workouts.id })
    .from(workouts)
    .where(and(eq(workouts.id, workoutId), eq(workouts.userId, userId)));
  if (!workout) throw new Error("Workout not found");

  const [result] = await db
    .select({ total: count(workoutExercises.id) })
    .from(workoutExercises)
    .where(eq(workoutExercises.workoutId, workoutId));
  const order = Number(result?.total ?? 0) + 1;

  const [we] = await db
    .insert(workoutExercises)
    .values({ workoutId, exerciseId, order })
    .returning();
  return we;
}

export async function removeExerciseFromWorkout(workoutExerciseId: number, userId: string) {
  const [we] = await db
    .select({ id: workoutExercises.id })
    .from(workoutExercises)
    .innerJoin(workouts, eq(workoutExercises.workoutId, workouts.id))
    .where(and(eq(workoutExercises.id, workoutExerciseId), eq(workouts.userId, userId)));
  if (!we) throw new Error("Not found");

  await db.delete(workoutExercises).where(eq(workoutExercises.id, workoutExerciseId));
}

export async function addSet(
  workoutExerciseId: number,
  data: { weightLbs?: string | null; reps?: number | null; durationSeconds?: number | null },
  userId: string
) {
  const [we] = await db
    .select({ id: workoutExercises.id })
    .from(workoutExercises)
    .innerJoin(workouts, eq(workoutExercises.workoutId, workouts.id))
    .where(and(eq(workoutExercises.id, workoutExerciseId), eq(workouts.userId, userId)));
  if (!we) throw new Error("Not found");

  const [countResult] = await db
    .select({ total: count(sets.id) })
    .from(sets)
    .where(eq(sets.workoutExerciseId, workoutExerciseId));
  const setNumber = Number(countResult?.total ?? 0) + 1;

  const [newSet] = await db
    .insert(sets)
    .values({ workoutExerciseId, setNumber, ...data, completed: false })
    .returning();
  return newSet;
}

export async function toggleSetCompleted(setId: number, completed: boolean, userId: string) {
  const [found] = await db
    .select({ id: sets.id })
    .from(sets)
    .innerJoin(workoutExercises, eq(sets.workoutExerciseId, workoutExercises.id))
    .innerJoin(workouts, eq(workoutExercises.workoutId, workouts.id))
    .where(and(eq(sets.id, setId), eq(workouts.userId, userId)));
  if (!found) throw new Error("Not found");

  await db.update(sets).set({ completed }).where(eq(sets.id, setId));
}

export async function completeWorkout(workoutId: number, userId: string) {
  const [workout] = await db
    .update(workouts)
    .set({ completedAt: new Date() })
    .where(and(eq(workouts.id, workoutId), eq(workouts.userId, userId)))
    .returning();
  return workout;
}

export async function updateWorkoutName(workoutId: number, name: string, userId: string) {
  const [workout] = await db
    .update(workouts)
    .set({ name })
    .where(and(eq(workouts.id, workoutId), eq(workouts.userId, userId)))
    .returning();
  return workout;
}

export async function updateSet(
  setId: number,
  data: { weightLbs?: string | null; reps?: number | null; durationSeconds?: number | null },
  userId: string
) {
  const [found] = await db
    .select({ id: sets.id })
    .from(sets)
    .innerJoin(workoutExercises, eq(sets.workoutExerciseId, workoutExercises.id))
    .innerJoin(workouts, eq(workoutExercises.workoutId, workouts.id))
    .where(and(eq(sets.id, setId), eq(workouts.userId, userId)));
  if (!found) throw new Error("Not found");

  const [updated] = await db.update(sets).set(data).where(eq(sets.id, setId)).returning();
  return updated;
}

export async function deleteSet(setId: number, userId: string) {
  const [found] = await db
    .select({ id: sets.id })
    .from(sets)
    .innerJoin(workoutExercises, eq(sets.workoutExerciseId, workoutExercises.id))
    .innerJoin(workouts, eq(workoutExercises.workoutId, workouts.id))
    .where(and(eq(sets.id, setId), eq(workouts.userId, userId)));
  if (!found) throw new Error("Not found");

  await db.delete(sets).where(eq(sets.id, setId));
}

export async function getWorkoutById(workoutId: number, userId: string) {
  const [workout] = await db
    .select()
    .from(workouts)
    .where(and(eq(workouts.id, workoutId), eq(workouts.userId, userId)));
  return workout ?? null;
}

export async function updateWorkoutDetails(
  workoutId: number,
  data: { name: string; startedAt: Date; completedAt: Date | null },
  userId: string
) {
  const [workout] = await db
    .update(workouts)
    .set({ name: data.name, startedAt: data.startedAt, completedAt: data.completedAt })
    .where(and(eq(workouts.id, workoutId), eq(workouts.userId, userId)))
    .returning();
  return workout;
}

export async function getWorkoutsForDate(userId: string, date: Date) {
  const start = startOfDay(date);
  const end = startOfDay(addDays(date, 1));

  const userWorkouts = await db
    .select()
    .from(workouts)
    .where(
      and(
        eq(workouts.userId, userId),
        gte(workouts.startedAt, start),
        lt(workouts.startedAt, end)
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
        id: s.id,
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

export async function getWorkoutDatesForMonth(userId: string, startDate: Date, endDate: Date) {
  const start = startOfDay(startDate);
  const end = startOfDay(endDate);

  const workoutDates = await db
    .select({
      date: workouts.startedAt,
    })
    .from(workouts)
    .where(
      and(
        eq(workouts.userId, userId),
        gte(workouts.startedAt, start),
        lt(workouts.startedAt, end)
      )
    );

  return workoutDates
    .filter(w => w.date !== null)
    .map(w => startOfDay(w.date!));
}
