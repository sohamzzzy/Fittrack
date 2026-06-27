import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useSearch } from "wouter";
import { useAuth } from "@clerk/react";
import {
  useCreateWorkout,
  useGetWorkout,
  useUpdateWorkout,
  useListWorkouts,
  getGetWorkoutQueryKey,
  getListWorkoutsQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, Weight, Dumbbell } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { WorkoutEditor, computeWorkoutStats } from "@/components/workout/workout-editor";
import { useInvalidateWorkoutQueries } from "@/hooks/use-workout-cache";

function apiErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return "Could not reach the server. Set VITE_API_URL to your Railway API origin (https://….up.railway.app).";
}

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

export default function ActiveWorkout() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const resumeId = parseInt(new URLSearchParams(search).get("id") ?? "", 10);

  const [workoutId, setWorkoutId] = useState<number | null>(
    Number.isFinite(resumeId) && resumeId > 0 ? resumeId : null,
  );
  const [elapsed, setElapsed] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const { toast } = useToast();
  const invalidate = useInvalidateWorkoutQueries();
  const { isLoaded: authLoaded, isSignedIn } = useAuth();
  const startRequestedRef = useRef(false);

  const createWorkout = useCreateWorkout();
  const updateWorkout = useUpdateWorkout();
  const { data: workoutsList } = useListWorkouts(undefined, {
    query: {
      enabled: authLoaded && isSignedIn && workoutId == null,
      queryKey: getListWorkoutsQueryKey(),
    },
  });

  const safeWorkoutId = workoutId ?? 0;
  const { data: workout, isLoading } = useGetWorkout(safeWorkoutId, {
    query: {
      enabled: workoutId != null && workoutId > 0,
      queryKey:
        workoutId != null && workoutId > 0
          ? getGetWorkoutQueryKey(workoutId)
          : (["/api/workouts", "pending"] as const),
      refetchInterval: false,
    },
  });

  useEffect(() => {
    if (workout?.isFinished) {
      setLocation(`/workouts/${workout.id}`);
    }
  }, [workout?.isFinished, workout?.id, setLocation]);

  useEffect(() => {
    if (!workout?.startedAt || workout.isFinished) return;
    const started = new Date(workout.startedAt).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - started) / 1000));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [workout?.startedAt, workout?.isFinished]);

  const workoutName = `Workout — ${new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}`;

  const startWorkout = useCallback(() => {
    createWorkout.mutate(
      { data: { name: workoutName } },
      {
        onSuccess: (w) => {
          if (typeof w?.id === "number") {
            setWorkoutId(w.id);
          } else {
            startRequestedRef.current = false;
            toast({
              variant: "destructive",
              title: "Could not start workout",
              description: "The server response did not include a workout id. Try again.",
            });
          }
        },
        onError: (err) => {
          startRequestedRef.current = false;
          toast({
            variant: "destructive",
            title: "Could not start workout",
            description: apiErrorMessage(err),
          });
        },
      },
    );
  }, [createWorkout, toast, workoutName]);

  useEffect(() => {
    if (!authLoaded || !isSignedIn || workoutId != null) return;
    if (startRequestedRef.current || createWorkout.isPending) return;

    const activeWorkout = Array.isArray(workoutsList)
      ? workoutsList.find((w) => !w.isFinished)
      : undefined;

    if (activeWorkout) {
      setWorkoutId(activeWorkout.id);
      return;
    }

    startRequestedRef.current = true;
    startWorkout();
  }, [authLoaded, isSignedIn, workoutId, createWorkout.isPending, workoutsList, startWorkout]);

  const handleFinish = () => {
    if (createWorkout.isError && workoutId == null) {
      startRequestedRef.current = true;
      startWorkout();
      return;
    }

    if (workoutId == null) {
      toast({
        variant: "destructive",
        title: "Workout not ready yet",
        description: "Wait for the session to finish loading, or reload if it never appears.",
      });
      return;
    }
    setFinishing(true);
    updateWorkout.mutate(
      { workoutId, data: { isFinished: true } },
      {
        onSuccess: () => {
          invalidate(workoutId);
          toast({ title: "Workout complete!", description: `Duration: ${formatDuration(elapsed)}` });
          setLocation("/workouts");
        },
        onError: (err) => {
          const message = err instanceof Error ? err.message : "Could not save. Try again.";
          toast({ variant: "destructive", title: "Failed to finish workout", description: message });
        },
        onSettled: () => {
          setFinishing(false);
        },
      },
    );
  };

  const { totalSets, totalVol } = workout ? computeWorkoutStats(workout) : { totalSets: 0, totalVol: 0 };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between sticky top-0 z-10 bg-background/80 backdrop-blur-md py-2 -mx-4 px-4 border-b border-border">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 text-muted-foreground text-sm">
            <Clock className="w-4 h-4" />
            <span className="font-mono font-semibold">{formatDuration(elapsed)}</span>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground text-sm">
            <Weight className="w-4 h-4" />
            <span className="font-semibold">{Math.round(totalVol)}kg</span>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground text-sm">
            <Dumbbell className="w-4 h-4" />
            <span className="font-semibold">{totalSets} sets</span>
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          className="font-bold bg-primary"
          onClick={handleFinish}
          disabled={
            finishing ||
            !authLoaded ||
            createWorkout.isPending ||
            (workoutId == null && !createWorkout.isError)
          }
          data-testid="button-finish-workout"
        >
          {createWorkout.isPending || (workoutId == null && !createWorkout.isError)
            ? "Starting…"
            : createWorkout.isError && workoutId == null
              ? "Retry"
              : finishing
                ? "Saving…"
                : "Finish"}
        </Button>
      </div>

      {!authLoaded || createWorkout.isPending || (workoutId != null && (isLoading || !workout)) ? (
        <div className="space-y-4">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : workout && workoutId ? (
        <WorkoutEditor workoutId={workoutId} workout={workout} showPreviousColumn />
      ) : null}
    </div>
  );
}
