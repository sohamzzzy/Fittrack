import { useParams, Link } from "wouter";
import { useGetWorkout } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Clock, Weight, Dumbbell, Check } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

export default function WorkoutDetail() {
  const params = useParams<{ id: string }>();
  const workoutId = parseInt(params.id);
  const { data: workout, isLoading } = useGetWorkout(workoutId, { query: { enabled: !!workoutId, queryKey: ["/api/workouts", workoutId] } });

  if (isLoading) return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-24" />
      {[0,1,2].map(i => <Skeleton key={i} className="h-40" />)}
    </div>
  );
  if (!workout) return <div className="text-center text-muted-foreground py-16">Workout not found.</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/workouts">
          <Button variant="ghost" size="icon" className="text-muted-foreground" data-testid="button-back">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-black">{workout.name}</h1>
          <p className="text-xs text-muted-foreground">{format(new Date(workout.startedAt), "EEEE, MMM d yyyy · h:mm a")}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {workout.durationMinutes && (
          <Card className="bg-card border-card-border">
            <CardContent className="pt-3 pb-3 flex flex-col items-center">
              <Clock className="w-4 h-4 text-primary mb-1" />
              <span className="text-lg font-black">{workout.durationMinutes}m</span>
              <span className="text-[10px] text-muted-foreground">Duration</span>
            </CardContent>
          </Card>
        )}
        {workout.totalVolume != null && (
          <Card className="bg-card border-card-border">
            <CardContent className="pt-3 pb-3 flex flex-col items-center">
              <Weight className="w-4 h-4 text-primary mb-1" />
              <span className="text-lg font-black">{Math.round(workout.totalVolume as number)}kg</span>
              <span className="text-[10px] text-muted-foreground">Volume</span>
            </CardContent>
          </Card>
        )}
        <Card className="bg-card border-card-border">
          <CardContent className="pt-3 pb-3 flex flex-col items-center">
            <Dumbbell className="w-4 h-4 text-primary mb-1" />
            <span className="text-lg font-black">{workout.totalSets ?? 0}</span>
            <span className="text-[10px] text-muted-foreground">Sets</span>
          </CardContent>
        </Card>
      </div>

      {workout.notes && (
        <Card className="bg-card border-card-border">
          <CardContent className="pt-4 pb-3">
            <p className="text-sm text-muted-foreground italic">"{workout.notes}"</p>
          </CardContent>
        </Card>
      )}

      {workout.exercises?.map((we) => (
        <Card key={we.id} className="bg-card border-card-border">
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-primary text-base font-bold">{we.exerciseName}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 pb-4">
            <div className="grid grid-cols-[32px_80px_64px_40px] gap-2 mb-2 text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
              <span>SET</span><span className="text-center">KG</span><span className="text-center">REPS</span><span className="text-center">DONE</span>
            </div>
            {we.sets?.map((s) => (
              <div key={s.id} className={cn("grid grid-cols-[32px_80px_64px_40px] gap-2 items-center py-1.5 rounded-lg px-1", s.completed ? "bg-primary/10" : "opacity-50")}>
                <span className="text-sm font-bold text-center text-muted-foreground">{s.setNumber}</span>
                <span className="text-sm font-bold text-center">{s.weight != null ? `${s.weight}kg` : "—"}</span>
                <span className="text-sm font-bold text-center">{s.reps ?? "—"}</span>
                <div className="flex justify-center">
                  <div className={cn("w-6 h-6 rounded-full flex items-center justify-center", s.completed ? "bg-primary" : "bg-secondary")}>
                    {s.completed && <Check className="w-3.5 h-3.5 text-white" />}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
