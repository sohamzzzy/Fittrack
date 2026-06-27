import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useSearch } from "wouter";
import { useAuth } from "@clerk/react";
import {
  useCreateWorkout,
  useGetWorkout,
  useGetRoutine,
  useUpdateWorkout,
  getGetWorkoutQueryKey,
  getGetRoutineQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, Weight, Dumbbell } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { WorkoutEditor, computeWorkoutStats } from "@/components/workout/workout-editor";
import { useInvalidateWorkoutQueries } from "@/hooks/use-workout-cache";
import { apiErrorMessage } from "@/lib/api-errors";

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
  const params = new URLSearchParams(search);
  const resumeId = parseInt(params.get("id") ?? "", 10);
  const routineId = parseInt(params.get("routineId") ?? "", 10);
  const isNewEmpty = params.get("new") === "1";

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

  const { data: routine, isLoading: routineLoading } = useGetRoutine(routineId, {
    query: {
      enabled: Number.isFinite(routineId) && routineId > 0,
      queryKey: getGetRoutineQueryKey(routineId),
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

  const handleCreateSuccess = useCallback(
    (w: { id?: number }) => {
      if (typeof w?.id === "number") {
        setWorkoutId(w.id);
        invalidate(w.id);
      } else {
        startRequestedRef.current = false;
        toast({
          variant: "destructive",
          title: "Could not start workout",
          description: "The server response did not include a workout id. Try again.",
        });
      }
    },
    [invalidate, toast],
  );

  const handleCreateError = useCallback(
    (err: unknown) => {
      startRequestedRef.current = false;
      toast({
        variant: "destructive",
        title: "Could not start workout",
        description: apiErrorMessage(err),
      });
    },
    [toast],
  );

  const startEmptyWorkout = useCallback(() => {
    createWorkout.mutate(
      { data: { name: workoutName } },
      { onSuccess: handleCreateSuccess, onError: handleCreateError },
    );
  }, [createWorkout, workoutName, handleCreateSuccess, handleCreateError]);

  const startRoutineWorkout = useCallback(() => {
    if (!routine) return;
    createWorkout.mutate(
      { data: { name: routine.name, routineId: routine.id } },
      { onSuccess: handleCreateSuccess, onError: handleCreateError },
    );
  }, [createWorkout, routine, handleCreateSuccess, handleCreateError]);

  useEffect(() => {
    if (!authLoaded || !isSignedIn || workoutId != null) return;
    if (startRequestedRef.current || createWorkout.isPending) return;

    if (Number.isFinite(resumeId) && resumeId > 0) {
      setWorkoutId(resumeId);
      return;
    }

    if (Number.isFinite(routineId) && routineId > 0) {
      if (routineLoading || !routine) return;
      startRequestedRef.current = true;
      startRoutineWorkout();
      return;
    }

    if (isNewEmpty) {
      startRequestedRef.current = true;
      startEmptyWorkout();
    }
  }, [
    authLoaded,
    isSignedIn,
    workoutId,
    createWorkout.isPending,
    resumeId,
    routineId,
    routine,
    routineLoading,
    isNewEmpty,
    startEmptyWorkout,
    startRoutineWorkout,
  ]);

  const handleFinish = () => {
    if (createWorkout.isError && workoutId == null) {
      startRequestedRef.current = true;
      if (routine) startRoutineWorkout();
      else startEmptyWorkout();
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
          toast({
            variant: "destructive",
            title: "Failed to finish workout",
            description: apiErrorMessage(err),
          });
        },
        onSettled: () => {
          setFinishing(false);
        },
      },
    );
  };

  const { totalSets, totalVol } = workout ? computeWorkoutStats(workout) : { totalSets: 0, totalVol: 0 };
  const isStarting =
    createWorkout.isPending ||
    (Number.isFinite(routineId) && routineId > 0 && routineLoading && workoutId == null);

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
            isStarting ||
            (workoutId == null && !createWorkout.isError)
          }
          data-testid="button-finish-workout"
        >
          {isStarting || (workoutId == null && !createWorkout.isError)
            ? "Starting…"
            : createWorkout.isError && workoutId == null
              ? "Retry"
              : finishing
                ? "Saving…"
                : "Finish"}
        </Button>
      </div>

      {!authLoaded || isStarting || (workoutId != null && (isLoading || !workout)) ? (
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
