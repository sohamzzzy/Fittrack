import { getSingleValue } from "../lib/getSingleValue";
import { Router } from "express";
import { requireAuth, getAuthUser } from "../lib/auth";
import { db, exercisesTable, workoutSetsTable, workoutExercisesTable, workoutsTable } from "@workspace/db";
import { eq, and, or, isNull, sql } from "drizzle-orm";

const router = Router();

router.get("/exercises", requireAuth, async (req, res) => {
  try {
    const user = await getAuthUser(req);
    const q = getSingleValue(req.query.q);
    const muscleGroup = getSingleValue(req.query.muscleGroup);
    const category = getSingleValue(req.query.category);
    let query = db.select().from(exercisesTable).where(
      or(isNull(exercisesTable.userId), eq(exercisesTable.userId, user.id))
    );
    const exercises = await query;
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
    const [ex] = await db.insert(exercisesTable).values({
      name, category, muscleGroups: muscleGroups || [], description, isCustom: true, userId: user.id,
    }).returning();
    res.status(201).json({ ...ex, personalRecord: null });
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/exercises/:exerciseId", requireAuth, async (req, res) => {
  try {
    const exerciseIdParam = getSingleValue(req.params.exerciseId);
    if (!exerciseIdParam) {
      res.status(400).json({ error: "Missing exercise id" });
      return;
    }
    const exerciseId = parseInt(exerciseIdParam);
    const ex = await db.query.exercisesTable.findFirst({ where: eq(exercisesTable.id, exerciseId) });
    if (!ex) { res.status(404).json({ error: "Not found" }); return; }
    res.json({ ...ex, personalRecord: null });
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
      .where(and(
        eq(workoutExercisesTable.exerciseId, exerciseId),
        eq(workoutsTable.userId, user.id),
        eq(workoutSetsTable.completed, true),
      ))
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

    const weight: any[] = [];
    const oneRepMax: any[] = [];
    const volume: any[] = [];
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
