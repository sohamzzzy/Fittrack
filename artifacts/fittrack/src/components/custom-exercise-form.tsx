import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EXERCISE_CATEGORIES, MUSCLE_GROUPS } from "@/lib/exercise-constants";

export type CustomExerciseFormValues = {
  name: string;
  category: string;
  muscleGroups: string[];
};

type CustomExerciseFormProps = {
  initialName?: string;
  initialCategory?: string;
  onSubmit: (values: CustomExerciseFormValues) => void;
  submitLabel?: string;
  isSubmitting?: boolean;
  errorMessage?: string | null;
  idPrefix?: string;
  formId?: string;
};

export function CustomExerciseForm({
  initialName = "",
  initialCategory = "Barbell",
  onSubmit,
  submitLabel = "Create",
  isSubmitting = false,
  errorMessage,
  idPrefix = "custom-exercise",
  formId,
}: CustomExerciseFormProps) {
  const [name, setName] = useState(initialName);
  const [category, setCategory] = useState(initialCategory);
  const [muscleGroups, setMuscleGroups] = useState<string[]>([]);

  const toggleMuscle = (m: string) =>
    setMuscleGroups((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onSubmit({ name: trimmed, category, muscleGroups });
  };

  return (
    <form id={formId} onSubmit={handleSubmit} className="space-y-3">
      <Input
        placeholder="Exercise name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        data-testid={`${idPrefix}-name`}
        autoFocus
      />
      <Select value={category} onValueChange={setCategory}>
        <SelectTrigger data-testid={`${idPrefix}-category`}>
          <SelectValue />
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
              data-testid={`${idPrefix}-muscle-${m}`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>
      {errorMessage && (
        <p className="text-sm text-destructive" role="alert" data-testid={`${idPrefix}-error`}>
          {errorMessage}
        </p>
      )}
      <button type="submit" className="sr-only" disabled={!name.trim() || isSubmitting}>
        {submitLabel}
      </button>
    </form>
  );
}
