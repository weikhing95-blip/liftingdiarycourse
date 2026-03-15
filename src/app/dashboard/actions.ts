"use server";

import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { updateWorkoutName, updateSet, deleteSet } from "@/data/workouts";

const updateWorkoutNameSchema = z.object({
  workoutId: z.number().int().positive(),
  name: z.string().min(1).max(100),
});

export async function updateWorkoutNameAction(input: { workoutId: number; name: string }) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const { workoutId, name } = updateWorkoutNameSchema.parse(input);
  await updateWorkoutName(workoutId, name, userId);
  revalidatePath("/dashboard");
}

const updateSetSchema = z.object({
  setId: z.number().int().positive(),
  weightLbs: z.string().nullable().optional(),
  reps: z.number().int().nonnegative().nullable().optional(),
  durationSeconds: z.number().int().nonnegative().nullable().optional(),
});

export async function updateSetAction(input: {
  setId: number;
  weightLbs?: string | null;
  reps?: number | null;
  durationSeconds?: number | null;
}) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const { setId, ...data } = updateSetSchema.parse(input);
  await updateSet(setId, data, userId);
  revalidatePath("/dashboard");
}

const deleteSetSchema = z.object({
  setId: z.number().int().positive(),
});

export async function deleteSetAction(setId: number) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const { setId: id } = deleteSetSchema.parse({ setId });
  await deleteSet(id, userId);
  revalidatePath("/dashboard");
}
