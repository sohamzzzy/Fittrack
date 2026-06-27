import { useState, useEffect } from "react";
import {
  useCreateRoutine,
  useUpdateRoutine,
  useListExercises,
  type Routine,
  type RoutineInput,
  type RoutineUpdate,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, ChevronUp, ChevronDown, Dumbbell } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useInvalidateRoutines } from "@/hooks/use-routine-cache";
import { CreateExerciseDialog } from "@/components/exercises/create-exercise-dialog";
import { apiErrorMessage } from "@/lib/api-errors";

export interface RoutineExerciseDraft {
  exerciseId: number;
  exerciseName: string;
  order: number;
  defaultSets: number;
  defaultReps: number;
  defaultWeight?: number;
  restSeconds?: number;
}

interface RoutineFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  routine?: Routine | null;
  onSaved?: () => void;
}

function routineToDrafts(routine?: Routine | null): RoutineExerciseDraft[] {
  if (!routine?.exercises?.length) return [];
  return routine.exercises.map((e) => ({
    exerciseId: e.exerciseId,
    exerciseName: e.exerciseName,
    order: e.order,
    defaultSets: e.defaultSets ?? 3,
    defaultReps: e.defaultReps ?? 10,
    defaultWeight: e.defaultWeight ?? undefined,
    restSeconds: e.restSeconds ?? undefined,
  }));
}

export function RoutineFormDialog({ open, onOpenChange, routine, onSaved }: RoutineFormDialogProps) {
  const isEdit = routine != null;
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [exercises, setExercises] = useState<RoutineExerciseDraft[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [createExerciseOpen, setCreateExerciseOpen] = useState(false);
  const [exerciseSearch, setExerciseSearch] = useState("");
  const { toast } = useToast();
  const invalidate = useInvalidateRoutines();
  const createRoutine = useCreateRoutine();
  const updateRoutine = useUpdateRoutine();
  const { data: exerciseList } = useListExercises({ q: exerciseSearch || undefined });

  useEffect(() => {
    if (!open) return;
    setName(routine?.name ?? "");
    setDescription(routine?.description ?? "");
    setExercises(routineToDrafts(routine));
    setExerciseSearch("");
  }, [open, routine]);

  const reindex = (items: RoutineExerciseDraft[]) =>
    items.map((item, index) => ({ ...item, order: index }));

  const addExercise = (exerciseId: number, exerciseName: string) => {
    setExercises((prev) =>
      reindex([
        ...prev,
        {
          exerciseId,
          exerciseName,
          order: prev.length,
          defaultSets: 3,
          defaultReps: 10,
        },
      ]),
    );
    setPickerOpen(false);
  };

  const moveExercise = (index: number, direction: -1 | 1) => {
    const next = [...exercises];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setExercises(reindex(next));
  };

  const updateExercise = (index: number, patch: Partial<RoutineExerciseDraft>) => {
    setExercises((prev) => prev.map((e, i) => (i === index ? { ...e, ...patch } : e)));
  };

  const removeExercise = (index: number) => {
    setExercises((prev) => reindex(prev.filter((_, i) => i !== index)));
  };

  const handleSave = () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast({ variant: "destructive", title: "Name required", description: "Enter a routine name." });
      return;
    }
    if (exercises.length === 0) {
      toast({
        variant: "destructive",
        title: "Add exercises",
        description: "A routine needs at least one exercise.",
      });
      return;
    }

    const payloadExercises = exercises.map((e, index) => ({
      exerciseId: e.exerciseId,
      order: index,
      defaultSets: e.defaultSets,
      defaultReps: e.defaultReps,
      defaultWeight: e.defaultWeight,
      restSeconds: e.restSeconds,
    }));

    const onSuccess = () => {
      invalidate(routine?.id);
      onOpenChange(false);
      toast({ title: isEdit ? "Routine updated" : "Routine created" });
      onSaved?.();
    };

    if (isEdit && routine) {
      const data: RoutineUpdate = {
        name: trimmedName,
        description: description.trim() || undefined,
        exercises: payloadExercises,
      };
      updateRoutine.mutate(
        { routineId: routine.id, data },
        {
          onSuccess,
          onError: (err) =>
            toast({
              variant: "destructive",
              title: "Could not save routine",
              description: apiErrorMessage(err),
            }),
        },
      );
    } else {
      const data: RoutineInput = {
        name: trimmedName,
        description: description.trim() || undefined,
        exercises: payloadExercises,
      };
      createRoutine.mutate(
        { data },
        {
          onSuccess,
          onError: (err) =>
            toast({
              variant: "destructive",
              title: "Could not save routine",
              description: apiErrorMessage(err),
            }),
        },
      );
    }
  };

  const isPending = createRoutine.isPending || updateRoutine.isPending;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-card border-card-border max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit Routine" : "New Routine"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Routine name (e.g. Push Day) *"
              value={name}
              onChange={(e) => setName(e.target.value)}
              data-testid="input-routine-name"
            />
            <Textarea
              placeholder="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="resize-none bg-secondary border-0"
              data-testid="input-routine-description"
            />

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Exercises
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPickerOpen(true)}
                  data-testid="button-add-routine-exercise"
                >
                  <Plus className="w-4 h-4 mr-1" /> Add
                </Button>
              </div>

              {exercises.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6 border border-dashed border-border rounded-lg">
                  Add exercises to build your routine template.
                </p>
              ) : (
                exercises.map((ex, index) => (
                  <div
                    key={`${ex.exerciseId}-${index}`}
                    className="rounded-lg border border-border bg-secondary/30 p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-sm truncate">{ex.exerciseName}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="w-7 h-7"
                          onClick={() => moveExercise(index, -1)}
                          disabled={index === 0}
                        >
                          <ChevronUp className="w-4 h-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="w-7 h-7"
                          onClick={() => moveExercise(index, 1)}
                          disabled={index === exercises.length - 1}
                        >
                          <ChevronDown className="w-4 h-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="w-7 h-7 text-muted-foreground hover:text-destructive"
                          onClick={() => removeExercise(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div>
                        <label className="text-[10px] text-muted-foreground uppercase">Sets</label>
                        <Input
                          type="number"
                          min={1}
                          className="h-8 mt-0.5 bg-secondary border-0"
                          value={ex.defaultSets}
                          onChange={(e) =>
                            updateExercise(index, {
                              defaultSets: Math.max(1, parseInt(e.target.value, 10) || 1),
                            })
                          }
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground uppercase">Reps</label>
                        <Input
                          type="number"
                          min={1}
                          className="h-8 mt-0.5 bg-secondary border-0"
                          value={ex.defaultReps}
                          onChange={(e) =>
                            updateExercise(index, {
                              defaultReps: Math.max(1, parseInt(e.target.value, 10) || 1),
                            })
                          }
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground uppercase">Weight (kg)</label>
                        <Input
                          type="number"
                          min={0}
                          className="h-8 mt-0.5 bg-secondary border-0"
                          placeholder="—"
                          value={ex.defaultWeight ?? ""}
                          onChange={(e) =>
                            updateExercise(index, {
                              defaultWeight: e.target.value ? parseFloat(e.target.value) : undefined,
                            })
                          }
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground uppercase">Rest (sec)</label>
                        <Input
                          type="number"
                          min={0}
                          className="h-8 mt-0.5 bg-secondary border-0"
                          placeholder="—"
                          value={ex.restSeconds ?? ""}
                          onChange={(e) =>
                            updateExercise(index, {
                              restSeconds: e.target.value ? parseInt(e.target.value, 10) : undefined,
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isPending || !name.trim() || exercises.length === 0}
              className="font-bold"
              data-testid="button-save-routine"
            >
              {isPending ? "Saving..." : isEdit ? "Save Changes" : "Create Routine"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="bg-card border-card-border max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Add Exercise</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Search exercises..."
            value={exerciseSearch}
            onChange={(e) => setExerciseSearch(e.target.value)}
            className="mb-2"
          />
          <Button
            variant="outline"
            size="sm"
            className="w-full mb-2 border-dashed"
            onClick={() => {
              setPickerOpen(false);
              setCreateExerciseOpen(true);
            }}
          >
            <Dumbbell className="w-4 h-4 mr-2" /> Create Custom Exercise
          </Button>
          <div className="overflow-y-auto max-h-80 space-y-1">
            {(Array.isArray(exerciseList) ? exerciseList : []).map((item) => (
              <button
                key={item.id}
                type="button"
                className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-secondary transition-colors"
                onClick={() => addExercise(item.id, item.name)}
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{item.name}</span>
                  {item.isCustom && (
                    <Badge variant="outline" className="text-[10px] px-1 py-0 text-muted-foreground">
                      Custom
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {item.category} · {item.muscleGroups?.join(", ")}
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <CreateExerciseDialog
        open={createExerciseOpen}
        onOpenChange={setCreateExerciseOpen}
        onCreated={(exercise) => {
          addExercise(exercise.id, exercise.name);
        }}
      />
    </>
  );
}
