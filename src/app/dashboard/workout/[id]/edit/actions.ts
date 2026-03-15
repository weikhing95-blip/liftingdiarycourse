"use server";

import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { updateWorkoutDetails } from "@/data/workouts";

const updateWorkoutSchema = z
  .object({
    id: z.number().int().positive(),
    name: z.string().min(1, "Name is required").max(100),
    startedAt: z.date(),
    completedAt: z.date().nullable(),
  })
  .refine(
    (data) => data.completedAt === null || data.completedAt >= data.startedAt,
    { message: "End date must be on or after the start date", path: ["completedAt"] }
  );

export async function updateWorkoutAction(input: {
  id: number;
  name: string;
  startedAt: Date;
  completedAt: Date | null;
}) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const { id, name, startedAt, completedAt } = updateWorkoutSchema.parse(input);

  await updateWorkoutDetails(id, { name, startedAt, completedAt }, userId);

  redirect("/dashboard");
}
