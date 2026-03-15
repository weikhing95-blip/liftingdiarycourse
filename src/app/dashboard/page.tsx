import { auth } from "@clerk/nextjs/server"
import Link from "next/link"
import { format, parseISO } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DatePicker } from "./date-picker"
import { WorkoutDetailSheet } from "./workout-detail-sheet"
import { getWorkoutsForDate, getWorkoutDetail } from "@/data/workouts"

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; workout?: string }>
}) {
  const { userId } = await auth()

  const { date: dateParam, workout: workoutParam } = await searchParams
  const dateStr = dateParam ?? format(new Date(), "yyyy-MM-dd")
  const date = dateParam ? parseISO(dateParam) : new Date()

  const workouts = await getWorkoutsForDate(userId, date)

  const workoutDetail = workoutParam
    ? await getWorkoutDetail(Number(workoutParam), userId)
    : null

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Workout Log</h1>
        <DatePicker date={date} />
      </div>

      <div className="space-y-4">
        {workouts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No workouts logged for {format(date, "do MMM yyyy")}.
            </CardContent>
          </Card>
        ) : (
          workouts.map((workout) => (
            <Link
              key={workout.id}
              href={`/dashboard?date=${dateStr}&workout=${workout.id}`}
              className="block"
            >
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-medium">
                      {workout.name ?? "Untitled Workout"}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{workout.sets} sets</Badge>
                      {workout.duration && (
                        <Badge variant="outline">{workout.duration}</Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {workout.exercises.join(" · ")}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>

      <WorkoutDetailSheet
        workout={workoutDetail}
        date={date}
        dateParam={dateStr}
      />
    </div>
  )
}
