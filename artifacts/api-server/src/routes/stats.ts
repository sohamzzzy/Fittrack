import { Router } from "express";
import { getSingleValue } from "../lib/getSingleValue";
import { requireAuth, getAuthUser } from "../lib/auth";
import { sendServerError } from "../lib/http-error";
import { 
  db, workoutsTable, workoutExercisesTable, workoutSetsTable, exercisesTable,
  foodLogsTable, waterIntakeTable, supplementLogsTable, userSupplementsTable
} from "@workspace/db";
import { eq, and, desc, gte, sql, inArray } from "drizzle-orm";

const router = Router();

router.get("/stats/overview", requireAuth, async (req, res) => {
  try {
    const user = await getAuthUser(req);
    
    // Total workouts, time, and streak
    const workouts = await db.select({
      id: workoutsTable.id,
      startedAt: workoutsTable.startedAt,
      finishedAt: workoutsTable.finishedAt
    }).from(workoutsTable).where(eq(workoutsTable.userId, user.id)).orderBy(desc(workoutsTable.startedAt));

    let totalWorkoutTime = 0;
    let daysActiveSet = new Set<string>();
    
    for (const w of workouts) {
      if (w.finishedAt && w.startedAt) {
        totalWorkoutTime += Math.round((new Date(w.finishedAt).getTime() - new Date(w.startedAt).getTime()) / 60000);
      }
      daysActiveSet.add(new Date(w.startedAt).toISOString().split('T')[0]);
    }
    
    const daysActive = daysActiveSet.size;
    const totalWorkouts = workouts.length;
    const averageWorkoutDuration = totalWorkouts > 0 ? Math.round(totalWorkoutTime / totalWorkouts) : 0;
    
    // Calculate streak
    let currentWorkoutStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    let lastDate: Date | null = null;
    
    const sortedDays = Array.from(daysActiveSet).sort().map(d => new Date(d));
    for (let i = 0; i < sortedDays.length; i++) {
      if (!lastDate) {
        tempStreak = 1;
      } else {
        const diff = Math.round((sortedDays[i].getTime() - lastDate.getTime()) / (1000 * 3600 * 24));
        if (diff === 1) {
          tempStreak++;
        } else {
          tempStreak = 1;
        }
      }
      if (tempStreak > longestStreak) longestStreak = tempStreak;
      lastDate = sortedDays[i];
    }
    
    // Check if current streak is active (workout today or yesterday)
    const today = new Date();
    today.setHours(0,0,0,0);
    if (lastDate) {
      const diff = Math.round((today.getTime() - lastDate.getTime()) / (1000 * 3600 * 24));
      if (diff <= 1) {
        currentWorkoutStreak = tempStreak;
      } else {
        currentWorkoutStreak = 0;
      }
    }

    // Exercises, Sets, Reps, Volume
    const [{ totalExercisesCompleted }] = await db.select({ totalExercisesCompleted: sql<number>`count(${workoutExercisesTable.id})::int` })
      .from(workoutExercisesTable)
      .innerJoin(workoutsTable, eq(workoutExercisesTable.workoutId, workoutsTable.id))
      .where(eq(workoutsTable.userId, user.id));

    const [{ totalSetsCompleted, totalRepsCompleted, totalWeightLifted }] = await db.select({
      totalSetsCompleted: sql<number>`count(${workoutSetsTable.id})::int`,
      totalRepsCompleted: sql<number>`sum(${workoutSetsTable.reps})::int`,
      totalWeightLifted: sql<number>`sum(${workoutSetsTable.reps} * ${workoutSetsTable.weight})`
    }).from(workoutSetsTable)
      .innerJoin(workoutExercisesTable, eq(workoutSetsTable.workoutExerciseId, workoutExercisesTable.id))
      .innerJoin(workoutsTable, eq(workoutExercisesTable.workoutId, workoutsTable.id))
      .where(and(eq(workoutsTable.userId, user.id), eq(workoutSetsTable.completed, true)));

    // Perfect Days (Intersect unique dates)
    const [foodDates, waterDates, suppDates] = await Promise.all([
      db.select({ date: foodLogsTable.date }).from(foodLogsTable).where(eq(foodLogsTable.userId, user.id)).groupBy(foodLogsTable.date),
      db.select({ date: waterIntakeTable.date }).from(waterIntakeTable).where(eq(waterIntakeTable.userId, user.id)).groupBy(waterIntakeTable.date),
      db.select({ date: supplementLogsTable.date }).from(supplementLogsTable).where(eq(supplementLogsTable.userId, user.id)).groupBy(supplementLogsTable.date),
    ]);
    
    const foodSet = new Set(foodDates.map(f => f.date));
    const waterSet = new Set(waterDates.map(w => w.date));
    const suppSet = new Set(suppDates.map(s => s.date));
    
    let perfectDays = 0;
    for (const d of Array.from(daysActiveSet)) {
      if (foodSet.has(d) && waterSet.has(d) && suppSet.has(d)) perfectDays++;
    }

    const accountAge = Math.round((new Date().getTime() - new Date(user.createdAt).getTime()) / (1000 * 3600 * 24));

    return res.json({
      totalWorkouts,
      currentWorkoutStreak,
      longestStreak,
      totalWorkoutTime,
      totalExercisesCompleted: totalExercisesCompleted || 0,
      totalSetsCompleted: totalSetsCompleted || 0,
      totalRepsCompleted: totalRepsCompleted || 0,
      totalWeightLifted: totalWeightLifted ? totalWeightLifted.toString() : "0",
      averageWorkoutDuration,
      daysActive,
      accountAge,
      perfectDays
    });

  } catch (e) {
    sendServerError(req, res, e);
    return;
  }
});

router.get("/stats/personal-records", requireAuth, async (req, res) => {
  try {
    const user = await getAuthUser(req);
    
    const records = await db.execute(sql`
      SELECT DISTINCT ON (e.id)
        e.id as "exerciseId",
        e.name as "exerciseName",
        ws.weight as "maxWeight",
        ws.reps as "maxReps",
        ws.created_at as "dateAchieved"
      FROM workout_sets ws
      INNER JOIN workout_exercises we ON ws.workout_exercise_id = we.id
      INNER JOIN workouts w ON we.workout_id = w.id
      INNER JOIN exercises e ON we.exercise_id = e.id
      WHERE w.user_id = ${user.id} AND ws.completed = true AND ws.weight IS NOT NULL
      ORDER BY e.id, ws.weight DESC, ws.created_at DESC
    `);
    
    const mapped = records.rows.map((r: any) => ({
      exerciseId: r.exerciseId,
      exerciseName: r.exerciseName,
      maxWeight: r.maxWeight.toString(),
      maxReps: r.maxReps,
      dateAchieved: new Date(r.dateAchieved).toISOString().split('T')[0]
    }));

    return res.json(mapped);
  } catch (e) {
    sendServerError(req, res, e);
    return;
  }
});

router.get("/stats/analytics", requireAuth, async (req, res) => {
  try {
    const user = await getAuthUser(req);
    const timeRangeStr = getSingleValue(req.query.timeRange) || "30";
    
    let startDate = new Date();
    if (timeRangeStr !== "all_time") {
      startDate.setDate(startDate.getDate() - parseInt(timeRangeStr));
    } else {
      startDate = new Date(2000, 0, 1);
    }
    
    // Volume & Frequency
    const workouts = await db.select({
      id: workoutsTable.id,
      startedAt: workoutsTable.startedAt
    }).from(workoutsTable)
      .where(and(eq(workoutsTable.userId, user.id), gte(workoutsTable.startedAt, startDate)));
      
    const wIds = workouts.map(w => w.id);
    let volumeMap = new Map<string, number>();
    let freqMap = new Map<string, number>();
    
    for (const w of workouts) {
      const d = new Date(w.startedAt).toISOString().split('T')[0];
      freqMap.set(d, (freqMap.get(d) || 0) + 1);
      volumeMap.set(d, volumeMap.get(d) || 0); // initialize
    }

    if (wIds.length > 0) {
      const sets = await db.select({
        workoutId: workoutExercisesTable.workoutId,
        weight: workoutSetsTable.weight,
        reps: workoutSetsTable.reps
      }).from(workoutSetsTable)
        .innerJoin(workoutExercisesTable, eq(workoutSetsTable.workoutExerciseId, workoutExercisesTable.id))
        .where(and(inArray(workoutExercisesTable.workoutId, wIds), eq(workoutSetsTable.completed, true)));
        
      const workoutToDate = new Map(workouts.map(w => [w.id, new Date(w.startedAt).toISOString().split('T')[0]]));
      
      for (const s of sets) {
        if (s.weight && s.reps) {
          const d = workoutToDate.get(s.workoutId);
          if (d) {
            volumeMap.set(d, (volumeMap.get(d) || 0) + (parseFloat(s.weight) * s.reps));
          }
        }
      }
    }
    
    const volumeChartData = Array.from(volumeMap.entries()).map(([date, volume]) => ({ date, volume: Math.round(volume) })).sort((a,b) => a.date.localeCompare(b.date));
    const frequencyChartData = Array.from(freqMap.entries()).map(([date, count]) => ({ date, count })).sort((a,b) => a.date.localeCompare(b.date));

    // Exercises & Muscle Groups
    const exRows = await db.execute(sql`
      SELECT e.name, e.muscle_groups as "muscleGroups", COUNT(we.id)::int as count
      FROM workout_exercises we
      INNER JOIN workouts w ON we.workout_id = w.id
      INNER JOIN exercises e ON we.exercise_id = e.id
      WHERE w.user_id = ${user.id} AND w.started_at >= ${startDate.toISOString()}
      GROUP BY e.name, e.muscle_groups
      ORDER BY count DESC
    `);

    const topExercises = exRows.rows.slice(0, 10).map((r: any) => ({ name: r.name, count: r.count }));
    
    const mgMap = new Map<string, number>();
    for (const row of (exRows.rows as any[])) {
      const mgs = row.muscleGroups || [];
      for (const mg of mgs) {
        mgMap.set(mg, (mgMap.get(mg) || 0) + row.count);
      }
    }
    
    const muscleGroupDistribution = Array.from(mgMap.entries()).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);

    return res.json({
      volumeChartData,
      frequencyChartData,
      muscleGroupDistribution,
      topExercises
    });

  } catch (e) {
    sendServerError(req, res, e);
    return;
  }
});

export default router;
