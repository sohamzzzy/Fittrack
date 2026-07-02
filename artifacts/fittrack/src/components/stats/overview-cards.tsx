import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Dumbbell, Clock, CalendarDays, Zap, Star } from "lucide-react";
import { StatsOverview } from "@workspace/api-client-react";

export function OverviewCards({ data }: { data: StatsOverview }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Workouts</CardTitle>
          <Dumbbell className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.totalWorkouts}</div>
          <p className="text-xs text-muted-foreground">Lifetime workouts logged</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
          <Zap className="h-4 w-4 text-orange-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.currentWorkoutStreak} days</div>
          <p className="text-xs text-muted-foreground">Longest: {data.longestStreak} days</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Volume</CardTitle>
          <Activity className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{parseInt(data.totalWeightLifted || "0").toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">kg lifted all-time</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Time</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {Math.floor(data.totalWorkoutTime / 60)}h {data.totalWorkoutTime % 60}m
          </div>
          <p className="text-xs text-muted-foreground">Avg: {data.averageWorkoutDuration} min/workout</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Perfect Days</CardTitle>
          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.perfectDays}</div>
          <p className="text-xs text-muted-foreground">All goals met</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Sets & Reps</CardTitle>
          <Dumbbell className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.totalSetsCompleted} sets</div>
          <p className="text-xs text-muted-foreground">{data.totalRepsCompleted.toLocaleString()} total reps</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Days Active</CardTitle>
          <CalendarDays className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.daysActive} days</div>
          <p className="text-xs text-muted-foreground">Out of {data.accountAge} days</p>
        </CardContent>
      </Card>
    </div>
  );
}
