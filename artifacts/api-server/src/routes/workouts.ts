import { Router } from "express";
import { getSingleValue } from "../lib/getSingleValue";
import { requireAuth, getAuthUser } from "../lib/auth";
import { sendServerError } from "../lib/http-error";
import { db, workoutsTable, workoutExercisesTable, workoutSetsTable, exercisesTable } from "@workspace/db";
import { eq, and, count, sql } from "drizzle-orm";
import { exerciseListVisibilityFilter } from "../lib/exercises";

const router = Router();

async function formatWorkoutDetail(workout: typeof workoutsTable.$inferSelect) {
  const exRows = await db
    .select({ we: workoutExercisesTable, ex: exercisesTable })
    .from(workoutExercisesTable)
    .innerJoin(exercisesTable, eq(workoutExercisesTable.exerciseId, exercisesTable.id))
    .where(eq(workoutExercisesTable.workoutId, workout.id))
    .orderBy(workoutExercisesTable.order);

  const exercises = await Promise.all(
    exRows.map(async (row) => {
      const sets = await db.select().from(workoutSetsTable).where(eq(workoutSetsTable.workoutExerciseId, row.we.id)).orderBy(workoutSetsTable.setNumber);
      const prevSets = await db
        .select({ weight: workoutSetsTable.weight, reps: workoutSetsTable.reps })
        .from(workoutSetsTable)
        .innerJoin(workoutExercisesTable, eq(workoutSetsTable.workoutExerciseId, workoutExercisesTable.id))
        .innerJoin(workoutsTable, eq(workoutExercisesTable.workoutId, workoutsTable.id))
        .where(and(
          eq(workoutExercisesTable.exerciseId, row.we.exerciseId),
          eq(workoutsTable.userId, workout.userId),
          eq(workoutSetsTable.completed, true),
          sql`${workoutsTable.id} != ${workout.id}`,
        ))
        .orderBy(sql`${workoutsTable.startedAt} desc`)
        .limit(20);

      return {
        id: row.we.id,
        exerciseId: row.we.exerciseId,
        exerciseName: row.ex.name,
        order: row.we.order,
        notes: row.we.notes,
        sets: sets.map((s, idx) => ({
          ...s,
          weight: s.weight ? parseFloat(s.weight) : null,
          previousWeight: prevSets[idx] ? parseFloat(prevSets[idx].weight ?? "0") : null,
          previousReps: prevSets[idx] ? prevSets[idx].reps : null,
        })),
      };
    })
  );

  const totalSets = exercises.reduce((acc, e) => acc + e.sets.filter((s) => s.completed).length, 0);
  const totalVolume = exercises.reduce((acc, e) => acc + e.sets.filter((s) => s.completed && s.weight && s.reps).reduce((a, s) => a + (s.weight! * s.reps!), 0), 0);
  const duration = workout.finishedAt ? Math.round((new Date(workout.finishedAt).getTime() - new Date(workout.startedAt).getTime()) / 60000) : null;

  return {
    ...workout,
    durationMinutes: duration,
    totalVolume,
    totalSets,
    exerciseCount: exercises.length,
    exercises,
  };
}

function formatWorkoutSummary(workout: typeof workoutsTable.$inferSelect) {
  const duration = workout.finishedAt ? Math.round((new Date(workout.finishedAt).getTime() - new Date(workout.startedAt).getTime()) / 60000) : null;
  return { ...workout, durationMinutes: duration, totalVolume: null, totalSets: null, exerciseCount: null };
}

router.get("/workouts/summary", requireAuth, async (req, res) => {
  try {
    const user = await getAuthUser(req);
    const [total] = await db.select({ c: count() }).from(workoutsTable).where(and(eq(workoutsTable.userId, user.id), eq(workoutsTable.isFinished, true)));
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const [week] = await db.select({ c: count() }).from(workoutsTable).where(and(eq(workoutsTable.userId, user.id), eq(workoutsTable.isFinished, true), sql`${workoutsTable.startedAt} > ${weekAgo}`));
    const [month] = await db.select({ c: count() }).from(workoutsTable).where(and(eq(workoutsTable.userId, user.id), eq(workoutsTable.isFinished, true), sql`${workoutsTable.startedAt} > ${monthAgo}`));
    const recent = await db.select().from(workoutsTable).where(and(eq(workoutsTable.userId, user.id), eq(workoutsTable.isFinished, true))).orderBy(sql`${workoutsTable.startedAt} desc`).limit(5);
    res.json({
      totalWorkouts: Number(total.c),
      thisWeek: Number(week.c),
      thisMonth: Number(month.c),
      totalVolume: 0,
      streakDays: 0,
      recentWorkouts: recent.map(formatWorkoutSummary),
    });
  } catch (e) {
    sendServerError(req, res, e);
  }
});

router.get("/workouts", requireAuth, async (req, res) => {
  try {
    const user = await getAuthUser(req);
    const limit = parseInt(getSingleValue(req.query.limit) ?? "") || 20;
    const offset = parseInt(getSingleValue(req.query.offset) ?? "") || 0;
    const workouts = await db.select().from(workoutsTable).where(eq(workoutsTable.userId, user.id)).orderBy(sql`${workoutsTable.startedAt} desc`).limit(limit).offset(offset);
    res.json(workouts.map(formatWorkoutSummary));
  } catch (e) {
    sendServerError(req, res, e);
  }
});

router.post("/workouts", requireAuth, async (req, res) => {
  try {
    const user = await getAuthUser(req);
    const { name, routineId, notes } = req.body;
    if (!name || typeof name !== "string") {
      res.status(400).json({ error: "Workout name is required" });
      return;
    }
    const [w] = await db
      .insert(workoutsTable)
      .values({ userId: user.id, name, routineId, notes, startedAt: new Date() })
      .returning();
    if (!w) {
      res.status(500).json({ error: "Failed to create workout" });
      return;
    }
    res.status(201).json(formatWorkoutSummary(w));
  } catch (e) {
    sendServerError(req, res, e);
  }
});

router.get("/workouts/:workoutId", requireAuth, async (req, res) => {
  try {
    const user = await getAuthUser(req);
    const workoutIdParam = getSingleValue(req.params.workoutId);
    if (!workoutIdParam) {
      res.status(400).json({ error: "Missing workout id" });
      return;
    }
    const workoutId = parseInt(workoutIdParam);
    const [w] = await db
      .select()
      .from(workoutsTable)
      .where(and(eq(workoutsTable.id, workoutId), eq(workoutsTable.userId, user.id)))
      .limit(1);
    if (!w) { res.status(404).json({ error: "Not found" }); return; }
    res.json(await formatWorkoutDetail(w));
  } catch (e) {
    sendServerError(req, res, e);
  }
});

router.patch("/workouts/:workoutId", requireAuth, async (req, res) => {
  try {
    const user = await getAuthUser(req);
    const workoutIdParam = getSingleValue(req.params.workoutId);
    if (!workoutIdParam) {
      res.status(400).json({ error: "Missing workout id" });
      return;
    }
    const workoutId = parseInt(workoutIdParam);
    const { name, notes, isFinished, finishedAt } = req.body;
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (notes !== undefined) updateData.notes = notes;
    if (isFinished !== undefined) updateData.isFinished = isFinished;
    if (finishedAt !== undefined) updateData.finishedAt = new Date(finishedAt);
    else if (isFinished) updateData.finishedAt = new Date();
    const [updated] = await db.update(workoutsTable).set(updateData).where(and(eq(workoutsTable.id, workoutId), eq(workoutsTable.userId, user.id))).returning();
    if (!updated) { res.status(404).json({ error: "Not found" }); return; }
    res.json(formatWorkoutSummary(updated));
  } catch (e) {
    sendServerError(req, res, e);
  }
});

router.delete("/workouts/:workoutId", requireAuth, async (req, res) => {
  try {
    const user = await getAuthUser(req);
    const workoutIdParam = getSingleValue(req.params.workoutId);
    if (!workoutIdParam) {
      res.status(400).json({ error: "Missing workout id" });
      return;
    }
    const workoutId = parseInt(workoutIdParam);
    await db.delete(workoutsTable).where(and(eq(workoutsTable.id, workoutId), eq(workoutsTable.userId, user.id)));
    res.status(204).send();
  } catch (e) {
    sendServerError(req, res, e);
  }
});

router.post("/workouts/:workoutId/exercises", requireAuth, async (req, res) => {
  try {
    const user = await getAuthUser(req);
    const workoutIdParam = getSingleValue(req.params.workoutId);
    if (!workoutIdParam) {
      res.status(400).json({ error: "Missing workout id" });
      return;
    }
    const workoutId = parseInt(workoutIdParam);
    const { exerciseId, order, notes } = req.body;

    const [workout] = await db
      .select()
      .from(workoutsTable)
      .where(and(eq(workoutsTable.id, workoutId), eq(workoutsTable.userId, user.id)))
      .limit(1);
    if (!workout) {
      res.status(404).json({ error: "Workout not found" });
      return;
    }

    const [ex] = await db
      .select()
      .from(exercisesTable)
      .where(and(eq(exercisesTable.id, exerciseId), exerciseListVisibilityFilter(user.id)))
      .limit(1);
    if (!ex) {
      res.status(404).json({ error: "Exercise not found" });
      return;
    }
    const existing = await db.select().from(workoutExercisesTable).where(eq(workoutExercisesTable.workoutId, workoutId));
    const [we] = await db.insert(workoutExercisesTable).values({ workoutId, exerciseId, order: order ?? existing.length, notes }).returning();
    res.status(201).json({ id: we.id, exerciseId: we.exerciseId, exerciseName: ex.name, order: we.order, notes: we.notes, sets: [] });
  } catch (e) {
    sendServerError(req, res, e);
  }
});

router.delete("/workouts/:workoutId/exercises/:workoutExerciseId", requireAuth, async (req, res) => {
  try {
    const workoutExerciseIdParam = getSingleValue(req.params.workoutExerciseId);
    if (!workoutExerciseIdParam) {
      res.status(400).json({ error: "Missing workout exercise id" });
      return;
    }
    const workoutExerciseId = parseInt(workoutExerciseIdParam);
    await db.delete(workoutExercisesTable).where(eq(workoutExercisesTable.id, workoutExerciseId));
    res.status(204).send();
  } catch (e) {
    sendServerError(req, res, e);
  }
});

router.post("/workouts/:workoutId/exercises/:workoutExerciseId/sets", requireAuth, async (req, res) => {
  try {
    const workoutExerciseIdParam = getSingleValue(req.params.workoutExerciseId);
    if (!workoutExerciseIdParam) {
      res.status(400).json({ error: "Missing workout exercise id" });
      return;
    }
    const workoutExerciseId = parseInt(workoutExerciseIdParam);
    const { setNumber, weight, reps, completed, setType } = req.body;
    const [s] = await db.insert(workoutSetsTable).values({ workoutExerciseId, setNumber, weight: weight?.toString(), reps, completed: completed ?? false, setType: setType ?? "normal" }).returning();
    res.status(201).json({ ...s, weight: s.weight ? parseFloat(s.weight) : null, previousWeight: null, previousReps: null });
  } catch (e) {
    sendServerError(req, res, e);
  }
});

router.patch("/workouts/:workoutId/exercises/:workoutExerciseId/sets/:setId", requireAuth, async (req, res) => {
  try {
    const setIdParam = getSingleValue(req.params.setId);
    if (!setIdParam) {
      res.status(400).json({ error: "Missing set id" });
      return;
    }
    const setId = parseInt(setIdParam);
    const { weight, reps, completed, setType } = req.body;
    const updateData: any = {};
    if (weight !== undefined) updateData.weight = weight.toString();
    if (reps !== undefined) updateData.reps = reps;
    if (completed !== undefined) updateData.completed = completed;
    if (setType !== undefined) updateData.setType = setType;
    const [s] = await db.update(workoutSetsTable).set(updateData).where(eq(workoutSetsTable.id, setId)).returning();
    res.json({ ...s, weight: s.weight ? parseFloat(s.weight) : null, previousWeight: null, previousReps: null });
  } catch (e) {
    sendServerError(req, res, e);
  }
});

router.delete("/workouts/:workoutId/exercises/:workoutExerciseId/sets/:setId", requireAuth, async (req, res) => {
  try {
    const setIdParam = getSingleValue(req.params.setId);
    if (!setIdParam) {
      res.status(400).json({ error: "Missing set id" });
      return;
    }
    const setId = parseInt(setIdParam);
    await db.delete(workoutSetsTable).where(eq(workoutSetsTable.id, setId));
    res.status(204).send();
  } catch (e) {
    sendServerError(req, res, e);
  }
});

export default router;
