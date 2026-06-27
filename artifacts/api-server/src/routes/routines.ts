import { Router } from "express";
import { getSingleValue } from "../lib/getSingleValue";
import { requireAuth, getAuthUser } from "../lib/auth";
import { db, routinesTable, routineExercisesTable, exercisesTable } from "@workspace/db";
import { eq, and, or, isNull, inArray } from "drizzle-orm";

const router = Router();

type RoutineExerciseInput = {
  exerciseId: number;
  order: number;
  defaultSets?: number;
  defaultReps?: number;
  defaultWeight?: number;
  restSeconds?: number;
};

async function assertExercisesAccessible(userId: number, exerciseIds: number[]) {
  if (exerciseIds.length === 0) return;
  const uniqueIds = [...new Set(exerciseIds)];
  const rows = await db
    .select({ id: exercisesTable.id })
    .from(exercisesTable)
    .where(
      and(
        or(isNull(exercisesTable.userId), eq(exercisesTable.userId, userId)),
        inArray(exercisesTable.id, uniqueIds),
      ),
    );
  if (rows.length !== uniqueIds.length) {
    const err = new Error("One or more exercises are not available");
    (err as Error & { status: number }).status = 400;
    throw err;
  }
}

function mapRoutineExerciseInput(e: RoutineExerciseInput, routineId: number) {
  return {
    routineId,
    exerciseId: e.exerciseId,
    order: e.order,
    defaultSets: e.defaultSets ?? null,
    defaultReps: e.defaultReps ?? null,
    defaultWeight: e.defaultWeight != null ? e.defaultWeight.toString() : null,
    restSeconds: e.restSeconds ?? null,
  };
}

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
      defaultWeight: row.re.defaultWeight ? parseFloat(row.re.defaultWeight) : null,
      restSeconds: row.re.restSeconds,
    })),
  };
}

router.get("/routines", requireAuth, async (req, res) => {
  try {
    const user = await getAuthUser(req);
    const routines = await db
      .select()
      .from(routinesTable)
      .where(eq(routinesTable.userId, user.id))
      .orderBy(routinesTable.createdAt);
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

    const trimmedName = typeof name === "string" ? name.trim() : "";
    if (!trimmedName) {
      res.status(400).json({ error: "Routine name is required" });
      return;
    }

    const exerciseList: RoutineExerciseInput[] = Array.isArray(exercises) ? exercises : [];
    await assertExercisesAccessible(
      user.id,
      exerciseList.map((e) => e.exerciseId),
    );

    const [routine] = await db
      .insert(routinesTable)
      .values({ userId: user.id, name: trimmedName, description: description?.trim() || null })
      .returning();

    if (exerciseList.length > 0) {
      await db
        .insert(routineExercisesTable)
        .values(exerciseList.map((e) => mapRoutineExerciseInput(e, routine.id)));
    }

    res.status(201).json(await formatRoutine(routine));
  } catch (e) {
    const status = (e as Error & { status?: number }).status;
    if (status === 400) {
      res.status(400).json({ error: (e as Error).message });
      return;
    }
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/routines/:routineId", requireAuth, async (req, res) => {
  try {
    const user = await getAuthUser(req);
    const routineIdParam = getSingleValue(req.params.routineId);
    if (!routineIdParam) {
      res.status(400).json({ error: "Missing routine id" });
      return;
    }
    const routineId = parseInt(routineIdParam);
    const [routine] = await db
      .select()
      .from(routinesTable)
      .where(and(eq(routinesTable.id, routineId), eq(routinesTable.userId, user.id)))
      .limit(1);
    if (!routine) {
      res.status(404).json({ error: "Not found" });
      return;
    }
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

    const updateData: { name?: string; description?: string | null } = {};
    if (name !== undefined) {
      const trimmedName = typeof name === "string" ? name.trim() : "";
      if (!trimmedName) {
        res.status(400).json({ error: "Routine name is required" });
        return;
      }
      updateData.name = trimmedName;
    }
    if (description !== undefined) {
      updateData.description = typeof description === "string" ? description.trim() || null : null;
    }

    const [updated] = await db
      .update(routinesTable)
      .set(updateData)
      .where(and(eq(routinesTable.id, routineId), eq(routinesTable.userId, user.id)))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    if (exercises !== undefined) {
      const exerciseList: RoutineExerciseInput[] = Array.isArray(exercises) ? exercises : [];
      await assertExercisesAccessible(
        user.id,
        exerciseList.map((e) => e.exerciseId),
      );
      await db.delete(routineExercisesTable).where(eq(routineExercisesTable.routineId, routineId));
      if (exerciseList.length > 0) {
        await db
          .insert(routineExercisesTable)
          .values(exerciseList.map((e) => mapRoutineExerciseInput(e, routineId)));
      }
    }

    res.json(await formatRoutine(updated));
  } catch (e) {
    const status = (e as Error & { status?: number }).status;
    if (status === 400) {
      res.status(400).json({ error: (e as Error).message });
      return;
    }
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
    const deleted = await db
      .delete(routinesTable)
      .where(and(eq(routinesTable.id, routineId), eq(routinesTable.userId, user.id)))
      .returning({ id: routinesTable.id });
    if (deleted.length === 0) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.status(204).send();
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
