import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { getWorkoutDetail } from "@/data/workouts";
import { getAllExercises } from "@/data/exercises";
import { WorkoutActiveClient } from "./workout-active-client";

export default async function WorkoutActivePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { id } = await params;
  const workoutId = parseInt(id);
  if (isNaN(workoutId)) notFound();

  const [workout, allExercises] = await Promise.all([
    getWorkoutDetail(workoutId, userId),
    getAllExercises(),
  ]);

  if (!workout) notFound();

  return <WorkoutActiveClient workout={workout} allExercises={allExercises} />;
}
