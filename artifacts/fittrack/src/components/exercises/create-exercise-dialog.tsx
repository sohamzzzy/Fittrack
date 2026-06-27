import { useState } from "react";
import {
  useCreateExercise,
  type Exercise,
  type ExerciseInput,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EXERCISE_CATEGORIES, MUSCLE_GROUPS } from "@/lib/exercise-constants";
import { useInvalidateExercises } from "@/hooks/use-exercise-cache";
import { useToast } from "@/hooks/use-toast";
import { apiErrorMessage } from "@/lib/api-errors";

interface CreateExerciseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (exercise: Exercise) => void;
}

export function CreateExerciseDialog({ open, onOpenChange, onCreated }: CreateExerciseDialogProps) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>("Barbell");
  const [muscleGroups, setMuscleGroups] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const { toast } = useToast();
  const invalidate = useInvalidateExercises();
  const createExercise = useCreateExercise();

  const reset = () => {
    setName("");
    setCategory("Barbell");
    setMuscleGroups([]);
    setDescription("");
  };

  const toggleMuscle = (m: string) =>
    setMuscleGroups((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));

  const handleCreate = () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast({ variant: "destructive", title: "Name required", description: "Enter an exercise name." });
      return;
    }
    if (!category) {
      toast({ variant: "destructive", title: "Category required", description: "Select a category." });
      return;
    }

    const data: ExerciseInput = {
      name: trimmedName,
      category,
      muscleGroups,
      description: description.trim() || undefined,
    };

    createExercise.mutate(
      { data },
      {
        onSuccess: (exercise) => {
          invalidate();
          reset();
          onOpenChange(false);
          toast({ title: "Exercise created" });
          onCreated?.(exercise);
        },
        onError: (err) => {
          toast({
            variant: "destructive",
            title: "Could not create exercise",
            description: apiErrorMessage(err),
          });
        },
      },
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="bg-card border-card-border">
        <DialogHeader>
          <DialogTitle>New Exercise</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Input
              placeholder="Exercise name *"
              value={name}
              onChange={(e) => setName(e.target.value)}
              data-testid="input-exercise-name"
            />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger data-testid="select-exercise-category">
              <SelectValue placeholder="Category *" />
            </SelectTrigger>
            <SelectContent>
              {EXERCISE_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div>
            <p className="text-xs text-muted-foreground mb-2 font-medium">Muscle Groups</p>
            <div className="flex flex-wrap gap-1.5">
              {MUSCLE_GROUPS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => toggleMuscle(m)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                    muscleGroups.includes(m)
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground"
                  }`}
                  data-testid={`button-muscle-${m}`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
          <Textarea
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="resize-none bg-secondary border-0"
            data-testid="input-exercise-description"
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!name.trim() || !category || createExercise.isPending}
            className="font-bold"
            data-testid="button-save-exercise"
          >
            {createExercise.isPending ? "Creating..." : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
