import { getSingleValue } from "../lib/getSingleValue";
import { Router } from "express";
import { requireAuth, getAuthUser } from "../lib/auth";
import {
  db,
  exercisesTable,
  workoutSetsTable,
  workoutExercisesTable,
  workoutsTable,
  routineExercisesTable,
} from "@workspace/db";
import { eq, and, or, isNull, sql, count } from "drizzle-orm";

const router = Router();

const VALID_CATEGORIES = [
  "Barbell",
  "Dumbbell",
  "Machine",
  "Cable",
  "Bodyweight",
  "Cardio",
  "Other",
] as const;

function exerciseVisibleToUser(exerciseId: number, userId: number) {
  return and(
    eq(exercisesTable.id, exerciseId),
    or(isNull(exercisesTable.userId), eq(exercisesTable.userId, userId)),
  );
}

router.get("/exercises", requireAuth, async (req, res) => {
  try {
    const user = await getAuthUser(req);
    const q = getSingleValue(req.query.q);
    const muscleGroup = getSingleValue(req.query.muscleGroup);
    const category = getSingleValue(req.query.category);
    const exercises = await db
      .select()
      .from(exercisesTable)
      .where(or(isNull(exercisesTable.userId), eq(exercisesTable.userId, user.id)));
    const filtered = exercises.filter((e) => {
      if (q && !e.name.toLowerCase().includes(q.toLowerCase())) return false;
      if (muscleGroup && !e.muscleGroups.includes(muscleGroup)) return false;
      if (category && e.category !== category) return false;
      return true;
    });
    res.json(filtered.map((e) => ({ ...e, personalRecord: null })));
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/exercises", requireAuth, async (req, res) => {
  try {
    const user = await getAuthUser(req);
    const { name, category, muscleGroups, description } = req.body;

    const trimmedName = typeof name === "string" ? name.trim() : "";
    if (!trimmedName) {
      res.status(400).json({ error: "Exercise name is required" });
      return;
    }

    const trimmedCategory = typeof category === "string" ? category.trim() : "";
    if (!trimmedCategory) {
      res.status(400).json({ error: "Category is required" });
      return;
    }
    if (!VALID_CATEGORIES.includes(trimmedCategory as (typeof VALID_CATEGORIES)[number])) {
      res.status(400).json({ error: "Invalid category" });
      return;
    }

    const groups = Array.isArray(muscleGroups)
      ? muscleGroups.filter((g): g is string => typeof g === "string" && g.trim().length > 0)
      : [];

    const [existing] = await db
      .select({ id: exercisesTable.id })
      .from(exercisesTable)
      .where(
        and(
          eq(exercisesTable.userId, user.id),
          eq(exercisesTable.isCustom, true),
          sql`lower(trim(${exercisesTable.name})) = lower(${trimmedName})`,
        ),
      )
      .limit(1);

    if (existing) {
      res.status(409).json({ error: "You already have a custom exercise with this name" });
      return;
    }

    const [ex] = await db
      .insert(exercisesTable)
      .values({
        name: trimmedName,
        category: trimmedCategory,
        muscleGroups: groups,
        description: typeof description === "string" ? description.trim() || null : null,
        isCustom: true,
        userId: user.id,
      })
      .returning();

    res.status(201).json({ ...ex, personalRecord: null });
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/exercises/:exerciseId", requireAuth, async (req, res) => {
  try {
    const user = await getAuthUser(req);
    const exerciseIdParam = getSingleValue(req.params.exerciseId);
    if (!exerciseIdParam) {
      res.status(400).json({ error: "Missing exercise id" });
      return;
    }
    const exerciseId = parseInt(exerciseIdParam);
    const [ex] = await db
      .select()
      .from(exercisesTable)
      .where(exerciseVisibleToUser(exerciseId, user.id))
      .limit(1);
    if (!ex) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json({ ...ex, personalRecord: null });
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/exercises/:exerciseId", requireAuth, async (req, res) => {
  try {
    const user = await getAuthUser(req);
    const exerciseIdParam = getSingleValue(req.params.exerciseId);
    if (!exerciseIdParam) {
      res.status(400).json({ error: "Missing exercise id" });
      return;
    }
    const exerciseId = parseInt(exerciseIdParam);

    const [ex] = await db
      .select()
      .from(exercisesTable)
      .where(
        and(
          eq(exercisesTable.id, exerciseId),
          eq(exercisesTable.userId, user.id),
          eq(exercisesTable.isCustom, true),
        ),
      )
      .limit(1);

    if (!ex) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    const [workoutUsage] = await db
      .select({ c: count() })
      .from(workoutExercisesTable)
      .where(eq(workoutExercisesTable.exerciseId, exerciseId));

    const [routineUsage] = await db
      .select({ c: count() })
      .from(routineExercisesTable)
      .where(eq(routineExercisesTable.exerciseId, exerciseId));

    if (Number(workoutUsage.c) > 0 || Number(routineUsage.c) > 0) {
      res.status(409).json({
        error: "This exercise is used in workouts or routines and cannot be deleted.",
      });
      return;
    }

    await db.delete(exercisesTable).where(eq(exercisesTable.id, exerciseId));
    res.status(204).send();
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/exercises/:exerciseId/history", requireAuth, async (req, res) => {
  try {
    const user = await getAuthUser(req);
    const exerciseIdParam = getSingleValue(req.params.exerciseId);
    if (!exerciseIdParam) {
      res.status(400).json({ error: "Missing exercise id" });
      return;
    }
    const exerciseId = parseInt(exerciseIdParam);

    const [ex] = await db
      .select({ id: exercisesTable.id })
      .from(exercisesTable)
      .where(exerciseVisibleToUser(exerciseId, user.id))
      .limit(1);
    if (!ex) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    const sets = await db
      .select({
        weight: workoutSetsTable.weight,
        reps: workoutSetsTable.reps,
        startedAt: workoutsTable.startedAt,
        workoutId: workoutsTable.id,
      })
      .from(workoutSetsTable)
      .innerJoin(workoutExercisesTable, eq(workoutSetsTable.workoutExerciseId, workoutExercisesTable.id))
      .innerJoin(workoutsTable, eq(workoutExercisesTable.workoutId, workoutsTable.id))
      .where(
        and(
          eq(workoutExercisesTable.exerciseId, exerciseId),
          eq(workoutsTable.userId, user.id),
          eq(workoutSetsTable.completed, true),
        ),
      )
      .orderBy(workoutsTable.startedAt);

    const byDate = new Map<string, { maxWeight: number; maxOneRM: number; totalVolume: number; workoutId: number }>();
    for (const s of sets) {
      if (!s.weight || !s.reps) continue;
      const w = parseFloat(s.weight);
      const r = s.reps;
      const dateStr = new Date(s.startedAt).toISOString().slice(0, 10);
      const existing = byDate.get(dateStr) || { maxWeight: 0, maxOneRM: 0, totalVolume: 0, workoutId: s.workoutId };
      existing.maxWeight = Math.max(existing.maxWeight, w);
      existing.maxOneRM = Math.max(existing.maxOneRM, w * (1 + r / 30));
      existing.totalVolume += w * r;
      existing.workoutId = s.workoutId;
      byDate.set(dateStr, existing);
    }

    const weight: { date: string; value: number; workoutId: number }[] = [];
    const oneRepMax: { date: string; value: number; workoutId: number }[] = [];
    const volume: { date: string; value: number; workoutId: number }[] = [];
    let pr: number | null = null;

    for (const [date, v] of byDate.entries()) {
      weight.push({ date, value: v.maxWeight, workoutId: v.workoutId });
      oneRepMax.push({ date, value: Math.round(v.maxOneRM * 10) / 10, workoutId: v.workoutId });
      volume.push({ date, value: Math.round(v.totalVolume), workoutId: v.workoutId });
      if (!pr || v.maxWeight > pr) pr = v.maxWeight;
    }

    res.json({ weight, oneRepMax, volume, personalRecord: pr });
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
