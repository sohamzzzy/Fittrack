import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@clerk/react";
import {
  useCreateWorkout, useGetWorkout, useUpdateWorkout, useAddWorkoutExercise,
  useRemoveWorkoutExercise, useAddSet, useUpdateSet, useDeleteSet,
  getGetWorkoutQueryKey,
} from "@workspace/api-client-react";
import { ExerciseSearchPicker } from "@/components/exercise-search-picker";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Check, Plus, Trash2, ChevronDown, Clock, Weight, Dumbbell } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

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
  const [workoutId, setWorkoutId] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [startTime] = useState(Date.now());
  const [showExerciseDialog, setShowExerciseDialog] = useState(false);
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [finishing, setFinishing] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isLoaded: authLoaded, isSignedIn } = useAuth();
  const startRequestedRef = useRef(false);

  const createWorkout = useCreateWorkout();
  const updateWorkout = useUpdateWorkout();
  const addExercise = useAddWorkoutExercise();
  const removeExercise = useRemoveWorkoutExercise();
  const addSet = useAddSet();
  const updateSet = useUpdateSet();
  const deleteSet = useDeleteSet();

  const safeWorkoutId = workoutId ?? 0;
  const { data: workout, isLoading } = useGetWorkout(safeWorkoutId, {
    query: {
      enabled: workoutId != null && workoutId > 0,
      queryKey: workoutId != null && workoutId > 0 ? getGetWorkoutQueryKey(workoutId) : (["/api/workouts", "pending"] as const),
      refetchInterval: false,
    },
  });
  useEffect(() => {
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [startTime]);

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
    startRequestedRef.current = true;
    startWorkout();
  }, [authLoaded, isSignedIn, workoutId, createWorkout.isPending, startWorkout]);

  const invalidate = () => {
    if (workoutId) queryClient.invalidateQueries({ queryKey: getGetWorkoutQueryKey(workoutId) });
  };

  const handleAddExercise = (exerciseId: number) => {
    if (!workoutId) return;
    addExercise.mutate(
      { workoutId, data: { exerciseId } },
      {
        onSuccess: () => {
          invalidate();
          setShowExerciseDialog(false);
          setExerciseSearch("");
        },
        onError: (err) => {
          toast({
            variant: "destructive",
            title: "Could not add exercise",
            description: apiErrorMessage(err),
          });
        },
      },
    );
  };

  const handleAddSet = (weId: number) => {
    if (!workoutId) return;
    const ex = workout?.exercises?.find((e) => e.id === weId);
    const nextNum = (ex?.sets?.length ?? 0) + 1;
    addSet.mutate({ workoutId, workoutExerciseId: weId, data: { setNumber: nextNum, completed: false } }, { onSuccess: invalidate });
  };

  const handleToggleComplete = (weId: number, setId: number, completed: boolean, weight?: number | null, reps?: number | null) => {
    if (!workoutId) return;
    updateSet.mutate({ workoutId, workoutExerciseId: weId, setId, data: { completed: !completed, weight: weight ?? undefined, reps: reps ?? undefined } }, {
      onSuccess: () => invalidate(),
    });
  };

  const handleUpdateSet = (weId: number, setId: number, field: "weight" | "reps", value: string) => {
    if (!workoutId) return;
    const num = parseFloat(value);
    if (isNaN(num)) return;
    updateSet.mutate({ workoutId, workoutExerciseId: weId, setId, data: field === "weight" ? { weight: num } : { reps: num } }, { onSuccess: invalidate });
  };

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

  const totalSets = workout?.exercises?.reduce((acc, e) => acc + (e.sets?.filter((s) => s.completed).length ?? 0), 0) ?? 0;
  const totalVol = workout?.exercises?.reduce((acc, e) => acc + (e.sets?.filter((s) => s.completed && s.weight && s.reps).reduce((a, s) => a + (s.weight! * s.reps!), 0) ?? 0), 0) ?? 0;

  return (
    <div className="space-y-4">
      {/* Header */}
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
        <div className="space-y-4">{[0,1].map(i => <Skeleton key={i} className="h-40" />)}</div>
      ) : (
        <AnimatePresence>
          {workout?.exercises?.map((we) => (
            <motion.div key={we.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}>
              <Card className="bg-card border-card-border overflow-hidden">
                <div className="flex items-center justify-between px-4 pt-4 pb-2">
                  <h3 className="font-bold text-primary">{we.exerciseName}</h3>
                  <Button variant="ghost" size="icon" className="text-muted-foreground w-8 h-8" onClick={() => { removeExercise.mutate({ workoutId: workoutId!, workoutExerciseId: we.id }, { onSuccess: invalidate }); }}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <CardContent className="px-4 pb-4 pt-0">
                  <div className="grid grid-cols-[32px_1fr_80px_64px_40px] gap-2 mb-2 text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                    <span>SET</span>
                    <span>PREV</span>
                    <span className="text-center">KG</span>
                    <span className="text-center">REPS</span>
                    <span></span>
                  </div>
                  {we.sets?.map((s) => (
                    <SetRow key={s.id} s={s} weId={we.id} onToggle={handleToggleComplete} onUpdate={handleUpdateSet} />
                  ))}
                  <Button variant="ghost" size="sm" className="w-full mt-2 text-muted-foreground hover:text-foreground border border-dashed border-border" onClick={() => handleAddSet(we.id)} data-testid={`button-add-set-${we.id}`}>
                    <Plus className="w-4 h-4 mr-2" /> Add Set
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      )}

      <Button variant="outline" className="w-full border-dashed" onClick={() => setShowExerciseDialog(true)} data-testid="button-add-exercise">
        <Plus className="w-4 h-4 mr-2" /> Add Exercise
      </Button>

      <Dialog open={showExerciseDialog} onOpenChange={(open) => { setShowExerciseDialog(open); if (!open) setExerciseSearch(""); }}>
        <DialogContent className="bg-card border-card-border max-h-[80vh]">
          <DialogHeader><DialogTitle>Add Exercise</DialogTitle></DialogHeader>
          <ExerciseSearchPicker
            search={exerciseSearch}
            onSearchChange={setExerciseSearch}
            onSelect={(ex) => handleAddExercise(ex.id)}
            allowCreateFromSearch
            idPrefix="workout-active"
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SetRow({ s, weId, onToggle, onUpdate }: any) {
  const [weight, setWeight] = useState(s.weight?.toString() ?? "");
  const [reps, setReps] = useState(s.reps?.toString() ?? "");
  const prev = s.previousWeight != null ? `${s.previousWeight}kg × ${s.previousReps ?? "?"}` : "—";
  return (
    <motion.div
      className={cn("grid grid-cols-[32px_1fr_80px_64px_40px] gap-2 items-center py-1.5 px-1 rounded-lg mb-1 transition-colors", s.completed ? "bg-primary/10" : "bg-transparent")}
      animate={{ backgroundColor: s.completed ? "hsl(15 100% 55% / 0.12)" : "transparent" }}
    >
      <span className={cn("text-sm font-bold text-center", s.setType === "warmup" ? "text-amber-400" : "text-muted-foreground")}>
        {s.setType === "warmup" ? "W" : s.setNumber}
      </span>
      <span className="text-xs text-muted-foreground">{prev}</span>
      <Input
        className="h-8 text-center font-bold text-sm px-1 bg-secondary border-0"
        value={weight}
        onChange={(e) => setWeight(e.target.value)}
        onBlur={() => onUpdate(weId, s.id, "weight", weight)}
        type="number"
        data-testid={`input-weight-${s.id}`}
      />
      <Input
        className="h-8 text-center font-bold text-sm px-1 bg-secondary border-0"
        value={reps}
        onChange={(e) => setReps(e.target.value)}
        onBlur={() => onUpdate(weId, s.id, "reps", reps)}
        type="number"
        data-testid={`input-reps-${s.id}`}
      />
      <button
        className={cn("w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all", s.completed ? "bg-primary border-primary text-white" : "border-border text-muted-foreground")}
        onClick={() => onToggle(weId, s.id, s.completed, parseFloat(weight) || null, parseInt(reps) || null)}
        data-testid={`button-complete-set-${s.id}`}
      >
        {s.completed && <Check className="w-4 h-4" />}
      </button>
    </motion.div>
  );
}
