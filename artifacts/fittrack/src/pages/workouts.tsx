import { Link } from "wouter";
import {
  useListWorkouts,
  useDeleteWorkout,
  getListWorkoutsQueryKey,
  getGetWorkoutSummaryQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Dumbbell, Clock, Weight, Trash2, ChevronRight, Plus } from "lucide-react";
import { motion } from "framer-motion";
import { format, formatDistanceToNow } from "date-fns";

export default function Workouts() {
  const { data: workouts, isLoading } = useListWorkouts();
  const deleteWorkout = useDeleteWorkout();
  const queryClient = useQueryClient();

  const handleDelete = (id: number) => {
    deleteWorkout.mutate(
      { workoutId: id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListWorkoutsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetWorkoutSummaryQueryKey() });
        },
      },
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black tracking-tight">Workouts</h1>
        <Link href="/workout">
          <Button size="sm" className="font-bold" data-testid="button-new-workout">
            <Plus className="w-4 h-4 mr-1" /> Start
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : Array.isArray(workouts) && workouts.length > 0 ? (
        <div className="space-y-3">
          {workouts.map((w, i) => {
            const href = w.isFinished ? `/workouts/${w.id}` : `/workout?id=${w.id}`;
            return (
              <motion.div
                key={w.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="bg-card border-card-border hover:border-primary/30 transition-colors">
                  <CardContent className="pt-4 pb-3">
                    <Link href={href}>
                      <div className="cursor-pointer" data-testid={`card-workout-${w.id}`}>
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-bold text-base">{w.name}</h3>
                          <div className="flex items-center gap-2">
                            {w.isFinished ? (
                              <Badge
                                variant="secondary"
                                className="text-xs font-semibold text-primary border-primary/20 bg-primary/10"
                              >
                                Done
                              </Badge>
                            ) : (
                              <Badge
                                variant="secondary"
                                className="text-xs text-amber-400 border-amber-400/20 bg-amber-400/10"
                              >
                                Active
                              </Badge>
                            )}
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mb-3">
                          {formatDistanceToNow(new Date(w.startedAt), { addSuffix: true })} ·{" "}
                          {format(new Date(w.startedAt), "MMM d, yyyy")}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          {w.durationMinutes && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              {w.durationMinutes}min
                            </span>
                          )}
                          {w.totalVolume != null && (
                            <span className="flex items-center gap-1">
                              <Weight className="w-3.5 h-3.5" />
                              {Math.round(w.totalVolume as number)}kg
                            </span>
                          )}
                          {w.totalSets != null && (
                            <span className="flex items-center gap-1">
                              <Dumbbell className="w-3.5 h-3.5" />
                              {w.totalSets} sets
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                    <div className="flex justify-end mt-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground w-7 h-7 hover:text-destructive"
                        onClick={() => handleDelete(w.id)}
                        data-testid={`button-delete-workout-${w.id}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <Card className="bg-card border-card-border">
          <CardContent className="py-16 flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Dumbbell className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-lg mb-1">No workouts yet</h3>
              <p className="text-sm text-muted-foreground">Start your first session to see it here.</p>
            </div>
            <Link href="/workout">
              <Button className="font-bold">Start Workout</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
