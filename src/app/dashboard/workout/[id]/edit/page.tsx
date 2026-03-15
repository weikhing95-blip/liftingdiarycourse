import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { getWorkoutById } from "@/data/workouts";
import { EditWorkoutClient } from "./edit-workout-client";

export default async function EditWorkoutPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { id: workoutId } = await params;
  const id = parseInt(workoutId);
  if (isNaN(id)) notFound();

  const workout = await getWorkoutById(id, userId);
  if (!workout) notFound();

  return (
    <EditWorkoutClient
      workout={{
        id: workout.id,
        name: workout.name ?? "",
        startedAt: workout.startedAt ?? new Date(),
        completedAt: workout.completedAt ?? null,
      }}
    />
  );
}
