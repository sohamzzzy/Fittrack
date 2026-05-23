import { getSingleValue } from "../lib/getSingleValue";
import { Router } from "express";
import { requireAuth, getAuthUser } from "../lib/auth";
import {
  db,
  exercisesTable,
  workoutSetsTable,
  workoutExercisesTable,
  workoutsTable,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { CreateExerciseBody, UpdateExerciseBody } from "@workspace/api-zod";
import {
  exerciseListVisibilityFilter,
  findActiveExerciseForUser,
  findDuplicateCustomExercise,
  findExerciseForUser,
  formatExerciseForApi,
  isValidExerciseCategory,
  normalizeExerciseName,
} from "../lib/exercises";

const router = Router();

router.get("/exercises", requireAuth, async (req, res) => {
  try {
    const user = await getAuthUser(req);
    const q = getSingleValue(req.query.q);
    const muscleGroup = getSingleValue(req.query.muscleGroup);
    const category = getSingleValue(req.query.category);

    const exercises = await db
      .select()
      .from(exercisesTable)
      .where(exerciseListVisibilityFilter(user.id));

    const filtered = exercises.filter((e) => {
      if (q && !e.name.toLowerCase().includes(q.toLowerCase())) return false;
      if (muscleGroup && !e.muscleGroups.includes(muscleGroup)) return false;
      if (category && e.category !== category) return false;
      return true;
    });

    res.json(filtered.map((e) => formatExerciseForApi(e, null)));
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/exercises", requireAuth, async (req, res) => {
  try {
    const user = await getAuthUser(req);
    const parsed = CreateExerciseBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request body", details: parsed.error.flatten() });
      return;
    }

    const name = normalizeExerciseName(parsed.data.name);
    if (!name) {
      res.status(400).json({ error: "Exercise name is required" });
      return;
    }
    if (!isValidExerciseCategory(parsed.data.category)) {
      res.status(400).json({ error: "Invalid category" });
      return;
    }

    const duplicate = await findDuplicateCustomExercise(user.id, name);
    if (duplicate) {
      res.status(409).json({
        error: "You already have a custom exercise with this name",
        existingExerciseId: duplicate.id,
      });
      return;
    }

    const muscleGroups = parsed.data.muscleGroups ?? [];
    const [ex] = await db
      .insert(exercisesTable)
      .values({
        name,
        category: parsed.data.category,
        muscleGroups,
        description: parsed.data.description ?? null,
        isCustom: true,
        userId: user.id,
      })
      .returning();

    res.status(201).json(formatExerciseForApi(ex, null));
  } catch (e: unknown) {
    // Unique index race on concurrent creates
    if (e && typeof e === "object" && "code" in e && (e as { code: string }).code === "23505") {
      res.status(409).json({ error: "You already have a custom exercise with this name" });
      return;
    }
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
    const exerciseId = parseInt(exerciseIdParam, 10);
    const ex = await findActiveExerciseForUser(exerciseId, user.id);
    if (!ex) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(formatExerciseForApi(ex, null));
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/exercises/:exerciseId", requireAuth, async (req, res) => {
  try {
    const user = await getAuthUser(req);
    const exerciseIdParam = getSingleValue(req.params.exerciseId);
    if (!exerciseIdParam) {
      res.status(400).json({ error: "Missing exercise id" });
      return;
    }
    const exerciseId = parseInt(exerciseIdParam, 10);

    const parsed = UpdateExerciseBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request body", details: parsed.error.flatten() });
      return;
    }

    const existing = await db.query.exercisesTable.findFirst({
      where: and(
        eq(exercisesTable.id, exerciseId),
        eq(exercisesTable.userId, user.id),
        eq(exercisesTable.isCustom, true),
      ),
    });
    if (!existing || existing.archivedAt) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    const updateData: Partial<typeof exercisesTable.$inferInsert> = {};
    if (parsed.data.name !== undefined) {
      const name = normalizeExerciseName(parsed.data.name);
      if (!name) {
        res.status(400).json({ error: "Exercise name is required" });
        return;
      }
      const duplicate = await findDuplicateCustomExercise(user.id, name);
      if (duplicate && duplicate.id !== exerciseId) {
        res.status(409).json({ error: "You already have a custom exercise with this name" });
        return;
      }
      updateData.name = name;
    }
    if (parsed.data.category !== undefined) {
      if (!isValidExerciseCategory(parsed.data.category)) {
        res.status(400).json({ error: "Invalid category" });
        return;
      }
      updateData.category = parsed.data.category;
    }
    if (parsed.data.muscleGroups !== undefined) updateData.muscleGroups = parsed.data.muscleGroups;
    if (parsed.data.description !== undefined) updateData.description = parsed.data.description;

    const [updated] = await db
      .update(exercisesTable)
      .set(updateData)
      .where(and(eq(exercisesTable.id, exerciseId), eq(exercisesTable.userId, user.id)))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(formatExerciseForApi(updated, null));
  } catch (e: unknown) {
    if (e && typeof e === "object" && "code" in e && (e as { code: string }).code === "23505") {
      res.status(409).json({ error: "You already have a custom exercise with this name" });
      return;
    }
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

/** Soft-delete custom exercise; global catalog and workout history rows are preserved. */
router.delete("/exercises/:exerciseId", requireAuth, async (req, res) => {
  try {
    const user = await getAuthUser(req);
    const exerciseIdParam = getSingleValue(req.params.exerciseId);
    if (!exerciseIdParam) {
      res.status(400).json({ error: "Missing exercise id" });
      return;
    }
    const exerciseId = parseInt(exerciseIdParam, 10);

    const [archived] = await db
      .update(exercisesTable)
      .set({ archivedAt: new Date() })
      .where(
        and(
          eq(exercisesTable.id, exerciseId),
          eq(exercisesTable.userId, user.id),
          eq(exercisesTable.isCustom, true),
        ),
      )
      .returning();

    if (!archived) {
      res.status(404).json({ error: "Not found" });
      return;
    }
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
    const exerciseId = parseInt(exerciseIdParam, 10);

    const ex = await findExerciseForUser(exerciseId, user.id);
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
