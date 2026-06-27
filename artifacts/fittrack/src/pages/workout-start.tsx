import { Link, useLocation } from "wouter";
import { useListRoutines, useListWorkouts } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Dumbbell, Play, Plus, ListOrdered, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

export default function WorkoutStart() {
  const [, setLocation] = useLocation();
  const { data: routines, isLoading: routinesLoading } = useListRoutines();
  const { data: workouts, isLoading: workoutsLoading } = useListWorkouts();

  const activeWorkout = Array.isArray(workouts) ? workouts.find((w) => !w.isFinished) : undefined;
  const isLoading = routinesLoading || workoutsLoading;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-black tracking-tight">Start Workout</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Pick a saved routine or start with a blank session.
        </p>
      </div>

      {activeWorkout && (
        <Card className="bg-amber-400/10 border-amber-400/30">
          <CardContent className="py-3 px-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-0.5">
                Active Workout
              </p>
              <p className="font-bold text-sm truncate">{activeWorkout.name}</p>
            </div>
            <Button
              size="sm"
              className="font-bold shrink-0"
              onClick={() => setLocation(`/workout?id=${activeWorkout.id}`)}
              data-testid="button-resume-workout"
            >
              Resume
            </Button>
          </CardContent>
        </Card>
      )}

      <Card className="bg-card border-card-border hover:border-primary/30 transition-colors">
        <CardContent className="py-4 px-4">
          <button
            type="button"
            className="w-full flex items-center justify-between text-left"
            onClick={() => setLocation("/workout?new=1")}
            disabled={!!activeWorkout}
            data-testid="button-start-empty-workout"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Plus className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-bold">Empty Workout</p>
                <p className="text-xs text-muted-foreground">Add exercises as you go</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          My Routines
        </h2>
        <Link href="/routines">
          <Button variant="ghost" size="sm" className="text-xs font-semibold h-8">
            <ListOrdered className="w-3.5 h-3.5 mr-1" /> Manage
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : routines && routines.length > 0 ? (
        <div className="space-y-3">
          {routines.map((routine, i) => (
            <motion.div
              key={routine.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="bg-card border-card-border hover:border-primary/30 transition-colors">
                <CardContent className="py-4 px-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-base truncate">{routine.name}</h3>
                        <Badge variant="secondary" className="text-[10px] shrink-0">
                          {routine.exerciseCount ?? routine.exercises?.length ?? 0} exercises
                        </Badge>
                      </div>
                      {routine.description && (
                        <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                          {routine.description}
                        </p>
                      )}
                      {routine.exercises && routine.exercises.length > 0 && (
                        <p className="text-xs text-muted-foreground truncate">
                          {routine.exercises.map((e) => e.exerciseName).join(" · ")}
                        </p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      className="font-bold shrink-0"
                      disabled={!!activeWorkout}
                      onClick={() => setLocation(`/workout?routineId=${routine.id}`)}
                      data-testid={`button-start-routine-${routine.id}`}
                    >
                      <Play className="w-4 h-4 mr-1" /> Start
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        <Card className="bg-card border-card-border">
          <CardContent className="py-12 flex flex-col items-center text-center gap-3">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <Dumbbell className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h3 className="font-bold mb-1">No routines yet</h3>
              <p className="text-sm text-muted-foreground">
                Create a template to start workouts with one tap.
              </p>
            </div>
            <Link href="/routines">
              <Button className="font-bold">Create Routine</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
