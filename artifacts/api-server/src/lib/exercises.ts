import { db, exercisesTable, type Exercise } from "@workspace/db";
import { and, eq, inArray, isNull, or, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

/** Keep in sync with fittrack exercise-constants.ts */
export const EXERCISE_CATEGORIES = [
  "Barbell",
  "Dumbbell",
  "Machine",
  "Cable",
  "Bodyweight",
  "Cardio",
  "Other",
] as const;

export function normalizeExerciseName(name: string): string {
  return name.trim();
}

/**
 * Exercises visible in library/search: global catalog OR owned by user, excluding archived custom rows.
 */
export function exerciseListVisibilityFilter(userId: number): SQL {
  return and(
    or(isNull(exercisesTable.userId), eq(exercisesTable.userId, userId)),
    isNull(exercisesTable.archivedAt),
  )!;
}

/** Global catalog or user's own exercise (includes archived — for workout history joins). */
export function exerciseAccessFilter(userId: number): SQL {
  return or(isNull(exercisesTable.userId), eq(exercisesTable.userId, userId))!;
}

export function formatExerciseForApi(ex: Exercise, personalRecord: number | null = null) {
  return {
    id: ex.id,
    name: ex.name,
    category: ex.category,
    muscleGroups: ex.muscleGroups,
    description: ex.description,
    isCustom: ex.isCustom,
    personalRecord,
  };
}

export async function findExerciseForUser(exerciseId: number, userId: number): Promise<Exercise | undefined> {
  const [ex] = await db
    .select()
    .from(exercisesTable)
    .where(and(eq(exercisesTable.id, exerciseId), exerciseAccessFilter(userId)))
    .limit(1);
  return ex;
}

/** Active (non-archived) exercise for library/detail. */
export async function findActiveExerciseForUser(exerciseId: number, userId: number): Promise<Exercise | undefined> {
  const [ex] = await db
    .select()
    .from(exercisesTable)
    .where(and(eq(exercisesTable.id, exerciseId), exerciseListVisibilityFilter(userId)))
    .limit(1);
  return ex;
}

export async function findDuplicateCustomExercise(userId: number, name: string): Promise<Exercise | undefined> {
  const normalized = normalizeExerciseName(name);
  if (!normalized) return undefined;
  const [existing] = await db
    .select()
    .from(exercisesTable)
    .where(
      and(
        eq(exercisesTable.userId, userId),
        isNull(exercisesTable.archivedAt),
        sql`lower(trim(${exercisesTable.name})) = lower(trim(${normalized}))`,
      ),
    )
    .limit(1);
  return existing;
}

export async function assertExercisesVisibleToUser(
  exerciseIds: number[],
  userId: number,
): Promise<{ ok: true } | { ok: false; missingId: number }> {
  if (exerciseIds.length === 0) return { ok: true };
  const unique = [...new Set(exerciseIds)];
  const rows = await db
    .select({ id: exercisesTable.id })
    .from(exercisesTable)
    .where(and(inArray(exercisesTable.id, unique), exerciseListVisibilityFilter(userId)));
  const found = new Set(rows.map((r) => r.id));
  for (const id of unique) {
    if (!found.has(id)) return { ok: false, missingId: id };
  }
  return { ok: true };
}

export function isValidExerciseCategory(category: string): boolean {
  return (EXERCISE_CATEGORIES as readonly string[]).includes(category);
}
