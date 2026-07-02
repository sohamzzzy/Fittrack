import { Router } from "express";
import { requireAuth, getAuthUser } from "../lib/auth";
import { db, goalsTable, workoutSetsTable, workoutExercisesTable, workoutsTable, waterIntakeTable } from "@workspace/db";
import { eq, and, gte, lte, sum, sql, desc, max } from "drizzle-orm";

const router = Router();

router.get("/goals", requireAuth, async (req, res) => {
  const user = await getAuthUser(req);
  const userId = user.id;

  const allGoals = await db
    .select()
    .from(goalsTable)
    .where(eq(goalsTable.userId, userId))
    .orderBy(desc(goalsTable.createdAt));

  // Dynamic progress evaluation
  for (const goal of allGoals) {
    if (goal.status === "ACTIVE" && goal.smartGoalType) {
      let calculatedProgress = goal.currentValue;

      // Calculate progress dynamically based on smartGoalType
      const sd = goal.startDate || new Date(0);
      const ed = goal.deadline || new Date(2100, 0, 1);

      if (goal.smartGoalType === "TOTAL_VOLUME") {
        const result = await db.select({ total: sum(sql`${workoutSetsTable.weight} * ${workoutSetsTable.reps}`) })
          .from(workoutSetsTable)
          .innerJoin(workoutExercisesTable, eq(workoutSetsTable.workoutExerciseId, workoutExercisesTable.id))
          .innerJoin(workoutsTable, eq(workoutExercisesTable.workoutId, workoutsTable.id))
          .where(and(
            eq(workoutsTable.userId, userId),
            gte(workoutsTable.createdAt, sd),
            lte(workoutsTable.createdAt, ed)
          ));
        calculatedProgress = Number(result[0]?.total || 0);
      } else if (goal.smartGoalType === "EXERCISE_WEIGHT" && goal.smartExerciseId) {
        const result = await db.select({ best: max(workoutSetsTable.weight) })
          .from(workoutSetsTable)
          .innerJoin(workoutExercisesTable, eq(workoutSetsTable.workoutExerciseId, workoutExercisesTable.id))
          .innerJoin(workoutsTable, eq(workoutExercisesTable.workoutId, workoutsTable.id))
          .where(and(
            eq(workoutsTable.userId, userId),
            eq(workoutExercisesTable.exerciseId, goal.smartExerciseId),
            gte(workoutsTable.createdAt, sd),
            lte(workoutsTable.createdAt, ed)
          ));
        calculatedProgress = Number(result[0]?.best || 0);
      } else if (goal.smartGoalType === "WATER_STREAK") {
        const result = await db.select({ total: sum(waterIntakeTable.amountMl) }).from(waterIntakeTable)
          .where(and(
            eq(waterIntakeTable.userId, userId),
            gte(waterIntakeTable.loggedAt, sd),
            lte(waterIntakeTable.loggedAt, ed)
          ));
        calculatedProgress = Number(result[0]?.total || 0);
      }

      if (calculatedProgress !== goal.currentValue) {
        goal.currentValue = calculatedProgress;
        let newStatus = goal.status;
        let completedAt = goal.completedAt;

        if (goal.currentValue >= goal.targetValue) {
          newStatus = "COMPLETED";
          completedAt = new Date();
        }

        await db.update(goalsTable)
          .set({ currentValue: goal.currentValue, status: newStatus, completedAt })
          .where(eq(goalsTable.id, goal.id));
          
        goal.status = newStatus;
        goal.completedAt = completedAt;
      }
    }
  }

  res.json(allGoals);
});

router.post("/goals", requireAuth, async (req, res) => {
  const user = await getAuthUser(req);
  const userId = user.id;

  const payload = req.body;
  const insertData = {
    userId,
    title: payload.title,
    description: payload.description,
    category: payload.category,
    metric: payload.metric,
    targetValue: payload.targetValue,
    smartGoalType: payload.smartGoalType,
    smartExerciseId: payload.smartExerciseId,
    startDate: payload.startDate ? new Date(payload.startDate) : undefined,
    deadline: payload.deadline ? new Date(payload.deadline) : undefined,
  };

  const [newGoal] = await db.insert(goalsTable).values(insertData).returning();
  res.status(201).json(newGoal);
});

router.put("/goals/:id", requireAuth, async (req, res) => {
  const user = await getAuthUser(req);
  const userId = user.id;
  const goalId = parseInt(req.params.id as string);
  if (!userId || isNaN(goalId)) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  const payload = req.body;
  const updateData: any = {};
  if (payload.title !== undefined) updateData.title = payload.title;
  if (payload.description !== undefined) updateData.description = payload.description;
  if (payload.targetValue !== undefined) updateData.targetValue = payload.targetValue;
  if (payload.currentValue !== undefined) updateData.currentValue = payload.currentValue;
  if (payload.status !== undefined) {
    updateData.status = payload.status;
    if (payload.status === "COMPLETED") updateData.completedAt = new Date();
  }
  if (payload.deadline !== undefined) updateData.deadline = payload.deadline ? new Date(payload.deadline) : null;

  const [updatedGoal] = await db.update(goalsTable)
    .set(updateData)
    .where(and(eq(goalsTable.id, goalId), eq(goalsTable.userId, userId)))
    .returning();

  if (!updatedGoal) {
    res.status(404).json({ error: "Goal not found" });
    return;
  }
  res.json(updatedGoal);
});

router.delete("/goals/:id", requireAuth, async (req, res) => {
  const user = await getAuthUser(req);
  const userId = user.id;
  const goalId = parseInt(req.params.id as string);
  if (!userId || isNaN(goalId)) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  await db.delete(goalsTable).where(and(eq(goalsTable.id, goalId), eq(goalsTable.userId, userId)));
  res.status(204).send();
});

export default router;
