import { Router } from "express";
import { getSingleValue } from "../lib/getSingleValue";
import { requireAuth, getAuthUser } from "../lib/auth";
import { db, routinesTable, routineExercisesTable, exercisesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

async function formatRoutine(r: typeof routinesTable.$inferSelect) {
  const exRows = await db
    .select({ re: routineExercisesTable, ex: exercisesTable })
    .from(routineExercisesTable)
    .innerJoin(exercisesTable, eq(routineExercisesTable.exerciseId, exercisesTable.id))
    .where(eq(routineExercisesTable.routineId, r.id))
    .orderBy(routineExercisesTable.order);
  return {
    ...r,
    exerciseCount: exRows.length,
    exercises: exRows.map((row) => ({
      id: row.re.id,
      exerciseId: row.re.exerciseId,
      exerciseName: row.ex.name,
      order: row.re.order,
      defaultSets: row.re.defaultSets,
      defaultReps: row.re.defaultReps,
    })),
  };
}

router.get("/routines", requireAuth, async (req, res) => {
  try {
    const user = await getAuthUser(req);
    const routines = await db.select().from(routinesTable).where(eq(routinesTable.userId, user.id)).orderBy(routinesTable.createdAt);
    const result = await Promise.all(routines.map(formatRoutine));
    res.json(result);
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/routines", requireAuth, async (req, res) => {
  try {
    const user = await getAuthUser(req);
    const { name, description, exercises } = req.body;
    const [routine] = await db.insert(routinesTable).values({ userId: user.id, name, description }).returning();
    if (exercises && exercises.length > 0) {
      await db.insert(routineExercisesTable).values(
        exercises.map((e: any) => ({ routineId: routine.id, exerciseId: e.exerciseId, order: e.order, defaultSets: e.defaultSets, defaultReps: e.defaultReps }))
      );
    }
    res.status(201).json(await formatRoutine(routine));
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/routines/:routineId", requireAuth, async (req, res) => {
  try {
    const routineIdParam = getSingleValue(req.params.routineId);
    if (!routineIdParam) {
      res.status(400).json({ error: "Missing routine id" });
      return;
    }
    const routineId = parseInt(routineIdParam);
    const routine = await db.query.routinesTable.findFirst({ where: eq(routinesTable.id, routineId) });
    if (!routine) { res.status(404).json({ error: "Not found" }); return; }
    res.json(await formatRoutine(routine));
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/routines/:routineId", requireAuth, async (req, res) => {
  try {
    const user = await getAuthUser(req);
    const routineIdParam = getSingleValue(req.params.routineId);
    if (!routineIdParam) {
      res.status(400).json({ error: "Missing routine id" });
      return;
    }
    const routineId = parseInt(routineIdParam);
    const { name, description, exercises } = req.body;
    const [updated] = await db.update(routinesTable).set({ name, description }).where(and(eq(routinesTable.id, routineId), eq(routinesTable.userId, user.id))).returning();
    if (!updated) { res.status(404).json({ error: "Not found" }); return; }
    if (exercises) {
      await db.delete(routineExercisesTable).where(eq(routineExercisesTable.routineId, routineId));
      if (exercises.length > 0) {
        await db.insert(routineExercisesTable).values(
          exercises.map((e: any) => ({ routineId, exerciseId: e.exerciseId, order: e.order, defaultSets: e.defaultSets, defaultReps: e.defaultReps }))
        );
      }
    }
    res.json(await formatRoutine(updated));
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/routines/:routineId", requireAuth, async (req, res) => {
  try {
    const user = await getAuthUser(req);
    const routineIdParam = getSingleValue(req.params.routineId);
    if (!routineIdParam) {
      res.status(400).json({ error: "Missing routine id" });
      return;
    }
    const routineId = parseInt(routineIdParam);
    await db.delete(routinesTable).where(and(eq(routinesTable.id, routineId), eq(routinesTable.userId, user.id)));
    res.status(204).send();
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
