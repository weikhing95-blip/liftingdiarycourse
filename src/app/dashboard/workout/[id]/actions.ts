"use server";

import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import {
  addExerciseToWorkout,
  removeExerciseFromWorkout,
  addSet,
  toggleSetCompleted,
  completeWorkout,
} from "@/data/workouts";

const addExerciseSchema = z.object({
  workoutId: z.number().int().positive(),
  exerciseId: z.number().int().positive(),
});

export async function addExerciseAction(input: { workoutId: number; exerciseId: number }) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const { workoutId, exerciseId } = addExerciseSchema.parse(input);
  return addExerciseToWorkout(workoutId, exerciseId, userId);
}

export async function removeExerciseAction(workoutExerciseId: number) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const id = z.number().int().positive().parse(workoutExerciseId);
  return removeExerciseFromWorkout(id, userId);
}

const addSetSchema = z.object({
  workoutExerciseId: z.number().int().positive(),
  weightLbs: z.string().nullable().optional(),
  reps: z.number().int().positive().nullable().optional(),
  durationSeconds: z.number().int().positive().nullable().optional(),
});

export async function addSetAction(input: {
  workoutExerciseId: number;
  weightLbs?: string | null;
  reps?: number | null;
  durationSeconds?: number | null;
}) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const { workoutExerciseId, weightLbs, reps, durationSeconds } = addSetSchema.parse(input);
  return addSet(workoutExerciseId, { weightLbs, reps, durationSeconds }, userId);
}

export async function toggleSetAction(input: { setId: number; completed: boolean }) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const { setId, completed } = z
    .object({ setId: z.number().int().positive(), completed: z.boolean() })
    .parse(input);
  return toggleSetCompleted(setId, completed, userId);
}

export async function completeWorkoutAction(workoutId: number) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const id = z.number().int().positive().parse(workoutId);
  await completeWorkout(id, userId);
  redirect("/dashboard");
}
