import { useState, useEffect } from "react";
import {
  useUpdateWorkout,
  useAddWorkoutExercise,
  useRemoveWorkoutExercise,
  useAddSet,
  useUpdateSet,
  useDeleteSet,
  useListExercises,
  type WorkoutDetail,
  type WorkoutSet,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Check, Plus, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useInvalidateWorkoutQueries } from "@/hooks/use-workout-cache";

interface WorkoutEditorProps {
  workoutId: number;
  workout: WorkoutDetail;
  showPreviousColumn?: boolean;
  allowDurationEdit?: boolean;
}

export function WorkoutEditor({
  workoutId,
  workout,
  showPreviousColumn = true,
  allowDurationEdit = false,
}: WorkoutEditorProps) {
  const invalidate = useInvalidateWorkoutQueries();
  const updateWorkout = useUpdateWorkout();
  const addExercise = useAddWorkoutExercise();
  const removeExercise = useRemoveWorkoutExercise();
  const addSet = useAddSet();
  const updateSet = useUpdateSet();
  const deleteSet = useDeleteSet();

  const [showExerciseDialog, setShowExerciseDialog] = useState(false);
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [notes, setNotes] = useState(workout.notes ?? "");
  const [durationMinutes, setDurationMinutes] = useState(
    workout.durationMinutes?.toString() ?? "",
  );

  const { data: exercises } = useListExercises({ q: exerciseSearch || undefined });

  useEffect(() => {
    setNotes(workout.notes ?? "");
  }, [workout.notes]);

  useEffect(() => {
    setDurationMinutes(workout.durationMinutes?.toString() ?? "");
  }, [workout.durationMinutes]);

  const onSuccess = () => invalidate(workoutId);

  const handleSaveNotes = () => {
    const trimmed = notes.trim();
    if (trimmed === (workout.notes ?? "")) return;
    updateWorkout.mutate(
      { workoutId, data: { notes: trimmed || undefined } },
      { onSuccess },
    );
  };

  const handleSaveDuration = () => {
    if (!workout.isFinished || !workout.startedAt) return;
    const mins = parseInt(durationMinutes, 10);
    if (isNaN(mins) || mins < 0) return;
    const started = new Date(workout.startedAt).getTime();
    const newFinished = new Date(started + mins * 60_000).toISOString();
    if (workout.finishedAt && new Date(workout.finishedAt).getTime() === new Date(newFinished).getTime()) return;
    updateWorkout.mutate(
      { workoutId, data: { finishedAt: newFinished } },
      { onSuccess },
    );
  };

  const handleAddExercise = (exerciseId: number) => {
    addExercise.mutate(
      { workoutId, data: { exerciseId } },
      { onSuccess: () => { onSuccess(); setShowExerciseDialog(false); } },
    );
  };

  const handleAddSet = (weId: number) => {
    const ex = workout.exercises?.find((e) => e.id === weId);
    const nextNum = (ex?.sets?.length ?? 0) + 1;
    addSet.mutate(
      { workoutId, workoutExerciseId: weId, data: { setNumber: nextNum, completed: false } },
      { onSuccess },
    );
  };

  const handleToggleComplete = (
    weId: number,
    setId: number,
    completed: boolean,
    weight?: number | null,
    reps?: number | null,
  ) => {
    updateSet.mutate(
      {
        workoutId,
        workoutExerciseId: weId,
        setId,
        data: { completed: !completed, weight: weight ?? undefined, reps: reps ?? undefined },
      },
      { onSuccess },
    );
  };

  const handleUpdateSet = (weId: number, setId: number, field: "weight" | "reps", value: string) => {
    if (value.trim() === "") return;
    const num = parseFloat(value);
    if (isNaN(num)) return;
    updateSet.mutate(
      { workoutId, workoutExerciseId: weId, setId, data: field === "weight" ? { weight: num } : { reps: num } },
      { onSuccess },
    );
  };

  const handleDeleteSet = (weId: number, setId: number) => {
    deleteSet.mutate({ workoutId, workoutExerciseId: weId, setId }, { onSuccess });
  };

  const gridCols = showPreviousColumn
    ? "grid-cols-[32px_1fr_80px_64px_40px_32px]"
    : "grid-cols-[32px_80px_64px_40px_32px]";

  return (
    <div className="space-y-4">
      <Card className="bg-card border-card-border">
        <CardContent className="pt-4 pb-3 space-y-3">
          <div>
            <label className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
              Notes
            </label>
            <Textarea
              className="mt-1 bg-secondary border-0 resize-none"
              placeholder="Add workout notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={handleSaveNotes}
              rows={2}
              data-testid="input-workout-notes"
            />
          </div>
          {allowDurationEdit && workout.isFinished && (
            <div>
              <label className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                Duration (minutes)
              </label>
              <Input
                className="mt-1 bg-secondary border-0"
                type="number"
                min={0}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                onBlur={handleSaveDuration}
                data-testid="input-workout-duration"
              />
            </div>
          )}
        </CardContent>
      </Card>

      <AnimatePresence>
        {workout.exercises?.map((we) => (
          <motion.div
            key={we.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <Card className="bg-card border-card-border overflow-hidden">
              <div className="flex items-center justify-between px-4 pt-4 pb-2">
                <h3 className="font-bold text-primary">{we.exerciseName}</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground w-8 h-8"
                  onClick={() =>
                    removeExercise.mutate(
                      { workoutId, workoutExerciseId: we.id },
                      { onSuccess },
                    )
                  }
                  data-testid={`button-remove-exercise-${we.id}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              <CardContent className="px-4 pb-4 pt-0">
                <div
                  className={cn(
                    "grid gap-2 mb-2 text-[10px] text-muted-foreground font-semibold uppercase tracking-wider",
                    gridCols,
                  )}
                >
                  <span>SET</span>
                  {showPreviousColumn && <span>PREV</span>}
                  <span className="text-center">KG</span>
                  <span className="text-center">REPS</span>
                  <span></span>
                  <span></span>
                </div>
                {we.sets?.map((s) => (
                  <SetRow
                    key={s.id}
                    s={s}
                    weId={we.id}
                    showPreviousColumn={showPreviousColumn}
                    onToggle={handleToggleComplete}
                    onUpdate={handleUpdateSet}
                    onDelete={handleDeleteSet}
                  />
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full mt-2 text-muted-foreground hover:text-foreground border border-dashed border-border"
                  onClick={() => handleAddSet(we.id)}
                  data-testid={`button-add-set-${we.id}`}
                >
                  <Plus className="w-4 h-4 mr-2" /> Add Set
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>

      <Button
        variant="outline"
        className="w-full border-dashed"
        onClick={() => setShowExerciseDialog(true)}
        data-testid="button-add-exercise"
      >
        <Plus className="w-4 h-4 mr-2" /> Add Exercise
      </Button>

      <Dialog open={showExerciseDialog} onOpenChange={setShowExerciseDialog}>
        <DialogContent className="bg-card border-card-border max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Add Exercise</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Search exercises..."
            value={exerciseSearch}
            onChange={(e) => setExerciseSearch(e.target.value)}
            data-testid="input-exercise-search"
            className="mb-2"
          />
          <div className="overflow-y-auto max-h-96 space-y-1">
            {(Array.isArray(exercises) ? exercises : []).map((ex) => (
              <button
                key={ex.id}
                className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-secondary transition-colors"
                onClick={() => handleAddExercise(ex.id)}
                data-testid={`button-exercise-${ex.id}`}
              >
                <div className="font-medium text-sm">{ex.name}</div>
                <div className="text-xs text-muted-foreground">
                  {ex.category} · {ex.muscleGroups?.join(", ")}
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface SetRowProps {
  s: WorkoutSet;
  weId: number;
  showPreviousColumn?: boolean;
  onToggle: (
    weId: number,
    setId: number,
    completed: boolean,
    weight?: number | null,
    reps?: number | null,
  ) => void;
  onUpdate: (weId: number, setId: number, field: "weight" | "reps", value: string) => void;
  onDelete: (weId: number, setId: number) => void;
}

function SetRow({ s, weId, showPreviousColumn, onToggle, onUpdate, onDelete }: SetRowProps) {
  const [weight, setWeight] = useState(s.weight?.toString() ?? "");
  const [reps, setReps] = useState(s.reps?.toString() ?? "");
  const prev =
    s.previousWeight != null ? `${s.previousWeight}kg × ${s.previousReps ?? "?"}` : "—";

  useEffect(() => {
    setWeight(s.weight?.toString() ?? "");
    setReps(s.reps?.toString() ?? "");
  }, [s.weight, s.reps]);

  const gridCols = showPreviousColumn
    ? "grid-cols-[32px_1fr_80px_64px_40px_32px]"
    : "grid-cols-[32px_80px_64px_40px_32px]";

  return (
    <motion.div
      className={cn(
        "grid gap-2 items-center py-1.5 px-1 rounded-lg mb-1 transition-colors",
        gridCols,
        s.completed ? "bg-primary/10" : "bg-transparent",
      )}
      animate={{ backgroundColor: s.completed ? "hsl(15 100% 55% / 0.12)" : "transparent" }}
    >
      <span
        className={cn(
          "text-sm font-bold text-center",
          s.setType === "warmup" ? "text-amber-400" : "text-muted-foreground",
        )}
      >
        {s.setType === "warmup" ? "W" : s.setNumber}
      </span>
      {showPreviousColumn && <span className="text-xs text-muted-foreground">{prev}</span>}
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
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all",
          s.completed ? "bg-primary border-primary text-white" : "border-border text-muted-foreground",
        )}
        onClick={() =>
          onToggle(weId, s.id, s.completed, parseFloat(weight) || null, parseInt(reps, 10) || null)
        }
        data-testid={`button-complete-set-${s.id}`}
      >
        {s.completed && <Check className="w-4 h-4" />}
      </button>
      <button
        className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
        onClick={() => onDelete(weId, s.id)}
        data-testid={`button-delete-set-${s.id}`}
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  );
}

export function computeWorkoutStats(workout: WorkoutDetail) {
  const totalSets =
    workout.exercises?.reduce(
      (acc, e) => acc + (e.sets?.filter((s) => s.completed).length ?? 0),
      0,
    ) ?? 0;
  const totalVol =
    workout.exercises?.reduce(
      (acc, e) =>
        acc +
        (e.sets
          ?.filter((s) => s.completed && s.weight && s.reps)
          .reduce((a, s) => a + s.weight! * s.reps!, 0) ?? 0),
      0,
    ) ?? 0;
  return { totalSets, totalVol };
}
