/** Shared with API validation — keep in sync with server EXERCISE_CATEGORIES. */
export const EXERCISE_CATEGORIES = [
  "Barbell",
  "Dumbbell",
  "Machine",
  "Cable",
  "Bodyweight",
  "Cardio",
  "Other",
] as const;

export type ExerciseCategory = (typeof EXERCISE_CATEGORIES)[number];

export const MUSCLE_GROUPS = [
  "Chest",
  "Back",
  "Shoulders",
  "Biceps",
  "Triceps",
  "Legs",
  "Glutes",
  "Core",
  "Calves",
] as const;

export const CATEGORY_COLORS: Record<string, string> = {
  Barbell: "text-primary border-primary/20 bg-primary/10",
  Dumbbell: "text-amber-400 border-amber-400/20 bg-amber-400/10",
  Machine: "text-blue-400 border-blue-400/20 bg-blue-400/10",
  Cable: "text-purple-400 border-purple-400/20 bg-purple-400/10",
  Bodyweight: "text-green-400 border-green-400/20 bg-green-400/10",
  Cardio: "text-red-400 border-red-400/20 bg-red-400/10",
  Other: "text-muted-foreground border-border bg-secondary",
};

/** Case-insensitive trimmed name for duplicate checks in the UI. */
export function normalizeExerciseName(name: string): string {
  return name.trim().toLowerCase();
}
