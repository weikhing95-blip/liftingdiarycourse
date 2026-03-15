"use server";

import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { createWorkout } from "@/data/workouts";

const createWorkoutSchema = z
  .object({
    name: z.string().min(1, "Name is required").max(100),
    startedAt: z.date(),
    completedAt: z.date().nullable(),
  })
  .refine(
    (data) => data.completedAt === null || data.completedAt >= data.startedAt,
    { message: "End date must be on or after the start date", path: ["completedAt"] }
  );

export async function createWorkoutAction(input: {
  name: string;
  startedAt: Date;
  completedAt: Date | null;
}) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const { name, startedAt, completedAt } = createWorkoutSchema.parse(input);

  const workout = await createWorkout(userId, name, startedAt, completedAt ?? undefined);

  redirect(`/dashboard/workout/${workout.id}`);
}
