import { Router } from "express";
import { getSingleValue } from "../lib/getSingleValue";
import { requireAuth, getAuthUser } from "../lib/auth";
import { sendServerError } from "../lib/http-error";
import { 
  db, 
  workoutsTable, workoutExercisesTable, workoutSetsTable,
  foodLogsTable, foodItemsTable, waterIntakeTable, nutritionGoalsTable, 
  userSupplementsTable, supplementLogsTable, supplementsTable
} from "@workspace/db";
import { eq, and, inArray, gte, lte } from "drizzle-orm";

const router = Router();

router.get("/calendar/summary", requireAuth, async (req, res) => {
  try {
    const user = await getAuthUser(req);
    const startDateStr = getSingleValue(req.query.startDate);
    const endDateStr = getSingleValue(req.query.endDate);
    
    if (!startDateStr || !endDateStr) {
      return res.status(400).json({ error: "Missing startDate or endDate" });
    }

    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);
    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];
    
    const nextDay = new Date(endDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const [workouts, foods, waters, suppLogs, userSupps, [goals]] = await Promise.all([
      db.select({ id: workoutsTable.id, startedAt: workoutsTable.startedAt }).from(workoutsTable)
        .where(and(eq(workoutsTable.userId, user.id), gte(workoutsTable.startedAt, startDate), lte(workoutsTable.startedAt, nextDay))),
      db.select({ date: foodLogsTable.date }).from(foodLogsTable)
        .where(and(eq(foodLogsTable.userId, user.id), gte(foodLogsTable.date, startStr), lte(foodLogsTable.date, endStr))),
      db.select({ date: waterIntakeTable.date, amountMl: waterIntakeTable.amountMl }).from(waterIntakeTable)
        .where(and(eq(waterIntakeTable.userId, user.id), gte(waterIntakeTable.date, startStr), lte(waterIntakeTable.date, endStr))),
      db.select({ date: supplementLogsTable.date, supplementId: supplementLogsTable.supplementId }).from(supplementLogsTable)
        .where(and(eq(supplementLogsTable.userId, user.id), gte(supplementLogsTable.date, startStr), lte(supplementLogsTable.date, endStr))),
      db.select().from(userSupplementsTable).where(eq(userSupplementsTable.userId, user.id)),
      db.select().from(nutritionGoalsTable).where(eq(nutritionGoalsTable.userId, user.id)).limit(1)
    ]);

    const reqWaterMl = goals ? goals.waterMl : 3000;
    const requiredSuppsCount = userSupps.length;
    const daysMap = new Map<string, any>();
    
    let cur = new Date(startDate);
    while (cur <= endDate) {
      const dStr = cur.toISOString().split('T')[0];
      daysMap.set(dStr, {
        date: dStr,
        hasWorkout: false,
        hasFood: false,
        waterGoalReached: false,
        supplementsCompleted: false,
        perfectDay: false,
        _waterConsumed: 0,
        _suppsTaken: new Set<string>(),
      });
      cur.setDate(cur.getDate() + 1);
    }

    for (const w of workouts) {
      const dStr = w.startedAt.toISOString().split('T')[0];
      const entry = daysMap.get(dStr);
      if (entry) entry.hasWorkout = true;
    }
    for (const f of foods) {
      const entry = daysMap.get(f.date);
      if (entry) entry.hasFood = true;
    }
    for (const w of waters) {
      const entry = daysMap.get(w.date);
      if (entry) entry._waterConsumed += w.amountMl;
    }
    for (const s of suppLogs) {
      const entry = daysMap.get(s.date);
      if (entry) entry._suppsTaken.add(s.date + "-" + s.supplementId);
    }

    const result = Array.from(daysMap.values()).map(entry => {
      entry.waterGoalReached = entry._waterConsumed >= reqWaterMl;
      entry.supplementsCompleted = requiredSuppsCount === 0 ? false : entry._suppsTaken.size >= requiredSuppsCount;
      entry.perfectDay = entry.hasWorkout && entry.hasFood && entry.waterGoalReached && entry.supplementsCompleted;
      
      delete entry._waterConsumed;
      delete entry._suppsTaken;
      return entry;
    });

    return res.json(result);
  } catch (e) {
    sendServerError(req, res, e);
    return;
  }
});

router.get("/calendar/detail", requireAuth, async (req, res) => {
  try {
    const user = await getAuthUser(req);
    const dateStr = getSingleValue(req.query.date);
    if (!dateStr) return res.status(400).json({ error: "Missing date" });

    const startDate = new Date(dateStr);
    const nextDay = new Date(startDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const [workouts, foods, waters, suppLogs, userSupps, [goals]] = await Promise.all([
      db.select().from(workoutsTable)
        .where(and(eq(workoutsTable.userId, user.id), gte(workoutsTable.startedAt, startDate), lte(workoutsTable.startedAt, nextDay))),
      db.select({ log: foodLogsTable, item: foodItemsTable })
        .from(foodLogsTable)
        .innerJoin(foodItemsTable, eq(foodLogsTable.foodItemId, foodItemsTable.id))
        .where(and(eq(foodLogsTable.userId, user.id), eq(foodLogsTable.date, dateStr))),
      db.select().from(waterIntakeTable)
        .where(and(eq(waterIntakeTable.userId, user.id), eq(waterIntakeTable.date, dateStr))),
      db.select().from(supplementLogsTable)
        .where(and(eq(supplementLogsTable.userId, user.id), eq(supplementLogsTable.date, dateStr))),
      db.select({ us: userSupplementsTable, s: supplementsTable })
        .from(userSupplementsTable)
        .innerJoin(supplementsTable, eq(userSupplementsTable.supplementId, supplementsTable.id))
        .where(eq(userSupplementsTable.userId, user.id)),
      db.select().from(nutritionGoalsTable).where(eq(nutritionGoalsTable.userId, user.id)).limit(1)
    ]);

    const formattedWorkouts = [];
    for (const w of workouts) {
      let durationMinutes = null;
      if (w.finishedAt) {
        durationMinutes = Math.round((new Date(w.finishedAt).getTime() - new Date(w.startedAt).getTime()) / 60000);
      }
      
      const exRows = await db.select({ id: workoutExercisesTable.id }).from(workoutExercisesTable).where(eq(workoutExercisesTable.workoutId, w.id));
      const exercisesCount = exRows.length;
      
      let totalVolume = 0;
      if (exercisesCount > 0) {
        const weIds = exRows.map(r => r.id);
        const sets = await db.select().from(workoutSetsTable).where(inArray(workoutSetsTable.workoutExerciseId, weIds));
        for (const s of sets) {
          if (s.completed && s.weight != null && s.reps != null) {
            totalVolume += parseFloat(s.weight) * s.reps;
          }
        }
      }
      
      formattedWorkouts.push({
        id: w.id,
        name: w.name,
        durationMinutes,
        exercisesCount,
        totalVolume: exercisesCount > 0 ? totalVolume.toFixed(2) : null
      });
    }

    let totalCals = 0;
    let totalPro = 0;
    let totalCarbs = 0;
    let totalFats = 0;
    const formattedFoods = foods.map(f => {
      const q = parseFloat(f.log.quantity || "1");
      const cals = parseFloat(f.log.customCalories || f.item.calories || "0") * q;
      totalCals += cals;
      totalPro += parseFloat(f.log.customProtein || f.item.protein || "0") * q;
      totalCarbs += parseFloat(f.log.customCarbs || f.item.carbs || "0") * q;
      totalFats += parseFloat(f.log.customFats || f.item.fats || "0") * q;
      return { name: f.item.name, calories: cals.toFixed(0) };
    });

    const consumedMl = waters.reduce((acc, w) => acc + w.amountMl, 0);
    const goalMl = goals ? goals.waterMl : 3000;

    const loggedSuppIds = new Set(suppLogs.map(s => s.supplementId));
    const formattedSupps = userSupps.map(us => ({
      id: us.s.id,
      name: us.s.name,
      isTaken: loggedSuppIds.has(us.s.id)
    }));
    const completedCount = formattedSupps.filter(s => s.isTaken).length;

    return res.json({
      date: dateStr,
      workout: {
        completed: workouts.length > 0,
        workouts: formattedWorkouts
      },
      nutrition: {
        logged: foods.length > 0,
        calories: totalCals.toFixed(0),
        protein: totalPro.toFixed(0),
        carbs: totalCarbs.toFixed(0),
        fats: totalFats.toFixed(0),
        foods: formattedFoods
      },
      hydration: {
        consumedMl,
        goalMl
      },
      supplements: {
        completedCount,
        totalCount: formattedSupps.length,
        items: formattedSupps
      }
    });

  } catch (e) {
    sendServerError(req, res, e);
    return;
  }
});

export default router;
