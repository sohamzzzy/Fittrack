import { Router } from "express";
import { getSingleValue } from "../lib/getSingleValue";
import { requireAuth, getAuthUser } from "../lib/auth";
import { db, foodItemsTable, foodLogsTable, nutritionGoalsTable } from "@workspace/db";
import { eq, and, or, isNull, count, sql } from "drizzle-orm";

const router = Router();

function computeEffective(log: typeof foodLogsTable.$inferSelect, food: typeof foodItemsTable.$inferSelect) {
  const qty = parseFloat(log.quantity);
  const cal = log.customCalories ? parseFloat(log.customCalories) : parseFloat(food.calories) * qty;
  const prot = log.customProtein ? parseFloat(log.customProtein) : parseFloat(food.protein) * qty;
  const carbs = log.customCarbs ? parseFloat(log.customCarbs) : parseFloat(food.carbs) * qty;
  const fats = log.customFats ? parseFloat(log.customFats) : parseFloat(food.fats) * qty;
  return { effectiveCalories: cal, effectiveProtein: prot, effectiveCarbs: carbs, effectiveFats: fats };
}

function formatFoodItem(f: typeof foodItemsTable.$inferSelect) {
  return {
    ...f,
    calories: parseFloat(f.calories),
    protein: parseFloat(f.protein),
    carbs: parseFloat(f.carbs),
    fats: parseFloat(f.fats),
    healthScore: f.healthScore ? parseFloat(f.healthScore) : null,
    servingSize: f.servingSize ? parseFloat(f.servingSize) : null,
    usageCount: 0,
  };
}

function formatFoodLog(log: typeof foodLogsTable.$inferSelect, food: typeof foodItemsTable.$inferSelect) {
  const eff = computeEffective(log, food);
  return {
    ...log,
    quantity: parseFloat(log.quantity),
    customCalories: log.customCalories ? parseFloat(log.customCalories) : null,
    customProtein: log.customProtein ? parseFloat(log.customProtein) : null,
    customCarbs: log.customCarbs ? parseFloat(log.customCarbs) : null,
    customFats: log.customFats ? parseFloat(log.customFats) : null,
    foodItem: formatFoodItem(food),
    ...eff,
  };
}

router.get("/nutrition/foods", requireAuth, async (req, res) => {
  try {
    const user = await getAuthUser(req);
    const q = getSingleValue(req.query.q);
    const recentOnly = getSingleValue(req.query.recentOnly) === "true";
    let items: (typeof foodItemsTable.$inferSelect)[] = [];
    if (recentOnly) {
      const recentLogs = await db
        .select({ foodItemId: foodLogsTable.foodItemId })
        .from(foodLogsTable)
        .where(eq(foodLogsTable.userId, user.id))
        .groupBy(foodLogsTable.foodItemId)
        .orderBy(sql`max(${foodLogsTable.loggedAt}) desc`)
        .limit(20);
      const ids = recentLogs.map((r) => r.foodItemId);
      if (ids.length > 0) {
        items = await db.select().from(foodItemsTable).where(sql`${foodItemsTable.id} = ANY(ARRAY[${sql.join(ids.map(id => sql`${id}`), sql`, `)}]::int[])`);
      }
    } else {
      items = await db.select().from(foodItemsTable).where(
        or(isNull(foodItemsTable.userId), eq(foodItemsTable.userId, user.id))
      );
      if (q) {
        items = items.filter((f) => f.name.toLowerCase().includes(q.toLowerCase()));
      }
    }
    const usageCounts = await db.select({ foodItemId: foodLogsTable.foodItemId, c: count() }).from(foodLogsTable).where(eq(foodLogsTable.userId, user.id)).groupBy(foodLogsTable.foodItemId);
    const usageMap = new Map(usageCounts.map((r) => [r.foodItemId, Number(r.c)]));
    res.json(items.map((f) => ({ ...formatFoodItem(f), usageCount: usageMap.get(f.id) ?? 0 })));
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/nutrition/foods", requireAuth, async (req, res) => {
  try {
    const user = await getAuthUser(req);
    const { name, calories, protein, carbs, fats, healthScore, servingSize, servingUnit } = req.body;
    const [f] = await db.insert(foodItemsTable).values({
      userId: user.id, name, calories: calories.toString(), protein: protein.toString(), carbs: carbs.toString(), fats: fats.toString(),
      healthScore: healthScore?.toString(), servingSize: servingSize?.toString(), servingUnit, isCustom: true,
    }).returning();
    res.status(201).json(formatFoodItem(f));
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/nutrition/foods/:foodItemId", requireAuth, async (req, res) => {
  try {
    const foodItemIdParam = getSingleValue(req.params.foodItemId);
    if (!foodItemIdParam) {
      res.status(400).json({ error: "Missing food item id" });
      return;
    }
    const foodItemId = parseInt(foodItemIdParam);
    const f = await db.query.foodItemsTable.findFirst({ where: eq(foodItemsTable.id, foodItemId) });
    if (!f) { res.status(404).json({ error: "Not found" }); return; }
    res.json(formatFoodItem(f));
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/nutrition/foods/:foodItemId", requireAuth, async (req, res) => {
  try {
    const user = await getAuthUser(req);
    const foodItemIdParam = getSingleValue(req.params.foodItemId);
    if (!foodItemIdParam) {
      res.status(400).json({ error: "Missing food item id" });
      return;
    }
    const foodItemId = parseInt(foodItemIdParam);
    const { name, calories, protein, carbs, fats, healthScore, servingSize, servingUnit } = req.body;
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (calories !== undefined) updateData.calories = calories.toString();
    if (protein !== undefined) updateData.protein = protein.toString();
    if (carbs !== undefined) updateData.carbs = carbs.toString();
    if (fats !== undefined) updateData.fats = fats.toString();
    if (healthScore !== undefined) updateData.healthScore = healthScore.toString();
    if (servingSize !== undefined) updateData.servingSize = servingSize.toString();
    if (servingUnit !== undefined) updateData.servingUnit = servingUnit;
    const [f] = await db.update(foodItemsTable).set(updateData).where(and(eq(foodItemsTable.id, foodItemId), eq(foodItemsTable.userId, user.id))).returning();
    if (!f) { res.status(404).json({ error: "Not found" }); return; }
    res.json(formatFoodItem(f));
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/nutrition/logs", requireAuth, async (req, res) => {
  try {
    const user = await getAuthUser(req);
    const date = getSingleValue(req.query.date);
    if (!date) {
      res.status(400).json({ error: "Missing date" });
      return;
    }
    const logs = await db.select({ log: foodLogsTable, food: foodItemsTable }).from(foodLogsTable).innerJoin(foodItemsTable, eq(foodLogsTable.foodItemId, foodItemsTable.id)).where(and(eq(foodLogsTable.userId, user.id), eq(foodLogsTable.date, date))).orderBy(foodLogsTable.loggedAt);
    res.json(logs.map((r) => formatFoodLog(r.log, r.food)));
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/nutrition/logs", requireAuth, async (req, res) => {
  try {
    const user = await getAuthUser(req);
    const { foodItemId, mealType, quantity, date, customCalories, customProtein, customCarbs, customFats } = req.body;
    const food = await db.query.foodItemsTable.findFirst({ where: eq(foodItemsTable.id, foodItemId) });
    if (!food) { res.status(404).json({ error: "Food item not found" }); return; }
    const [log] = await db.insert(foodLogsTable).values({
      userId: user.id, foodItemId, mealType, quantity: quantity.toString(), date,
      customCalories: customCalories?.toString(), customProtein: customProtein?.toString(), customCarbs: customCarbs?.toString(), customFats: customFats?.toString(),
    }).returning();
    res.status(201).json(formatFoodLog(log, food));
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/nutrition/logs/:logId", requireAuth, async (req, res) => {
  try {
    const user = await getAuthUser(req);
    const logIdParam = getSingleValue(req.params.logId);
    if (!logIdParam) {
      res.status(400).json({ error: "Missing log id" });
      return;
    }
    const logId = parseInt(logIdParam);
    const { quantity, mealType, customCalories, customProtein, customCarbs, customFats } = req.body;
    const updateData: any = {};
    if (quantity !== undefined) updateData.quantity = quantity.toString();
    if (mealType !== undefined) updateData.mealType = mealType;
    if (customCalories !== undefined) updateData.customCalories = customCalories.toString();
    if (customProtein !== undefined) updateData.customProtein = customProtein.toString();
    if (customCarbs !== undefined) updateData.customCarbs = customCarbs.toString();
    if (customFats !== undefined) updateData.customFats = customFats.toString();
    const [log] = await db.update(foodLogsTable).set(updateData).where(and(eq(foodLogsTable.id, logId), eq(foodLogsTable.userId, user.id))).returning();
    if (!log) { res.status(404).json({ error: "Not found" }); return; }
    const food = await db.query.foodItemsTable.findFirst({ where: eq(foodItemsTable.id, log.foodItemId) });
    res.json(formatFoodLog(log, food!));
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/nutrition/logs/:logId", requireAuth, async (req, res) => {
  try {
    const user = await getAuthUser(req);
    const logIdParam = getSingleValue(req.params.logId);
    if (!logIdParam) {
      res.status(400).json({ error: "Missing log id" });
      return;
    }
    const logId = parseInt(logIdParam);
    await db.delete(foodLogsTable).where(and(eq(foodLogsTable.id, logId), eq(foodLogsTable.userId, user.id)));
    res.status(204).send();
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/nutrition/summary", requireAuth, async (req, res) => {
  try {
    const user = await getAuthUser(req);
    const date = getSingleValue(req.query.date);
    if (!date) {
      res.status(400).json({ error: "Missing date" });
      return;
    }
    const logs = await db.select({ log: foodLogsTable, food: foodItemsTable }).from(foodLogsTable).innerJoin(foodItemsTable, eq(foodLogsTable.foodItemId, foodItemsTable.id)).where(and(eq(foodLogsTable.userId, user.id), eq(foodLogsTable.date, date)));
    const formatted = logs.map((r) => formatFoodLog(r.log, r.food));
    const totals = formatted.reduce((acc, l) => ({
      calories: acc.calories + l.effectiveCalories,
      protein: acc.protein + l.effectiveProtein,
      carbs: acc.carbs + l.effectiveCarbs,
      fats: acc.fats + l.effectiveFats,
    }), { calories: 0, protein: 0, carbs: 0, fats: 0 });
    const goals = await db.query.nutritionGoalsTable.findFirst({ where: eq(nutritionGoalsTable.userId, user.id) });
    res.json({
      date,
      totalCalories: Math.round(totals.calories),
      totalProtein: Math.round(totals.protein * 10) / 10,
      totalCarbs: Math.round(totals.carbs * 10) / 10,
      totalFats: Math.round(totals.fats * 10) / 10,
      goalCalories: goals ? parseFloat(goals.calories) : null,
      goalProtein: goals ? parseFloat(goals.protein) : null,
      goalCarbs: goals ? parseFloat(goals.carbs) : null,
      goalFats: goals ? parseFloat(goals.fats) : null,
      caloriesRemaining: goals ? parseFloat(goals.calories) - totals.calories : 0,
      logs: formatted,
    });
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/nutrition/goals", requireAuth, async (req, res) => {
  try {
    const user = await getAuthUser(req);
    let goals = await db.query.nutritionGoalsTable.findFirst({ where: eq(nutritionGoalsTable.userId, user.id) });
    if (!goals) {
      const [created] = await db.insert(nutritionGoalsTable).values({ userId: user.id }).returning();
      goals = created;
    }
    res.json({ ...goals, calories: parseFloat(goals.calories), protein: parseFloat(goals.protein), carbs: parseFloat(goals.carbs), fats: parseFloat(goals.fats) });
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/nutrition/goals", requireAuth, async (req, res) => {
  try {
    const user = await getAuthUser(req);
    const { calories, protein, carbs, fats } = req.body;
    const existing = await db.query.nutritionGoalsTable.findFirst({ where: eq(nutritionGoalsTable.userId, user.id) });
    let goals;
    if (existing) {
      const [updated] = await db.update(nutritionGoalsTable).set({ calories: calories.toString(), protein: protein.toString(), carbs: carbs.toString(), fats: fats.toString() }).where(eq(nutritionGoalsTable.userId, user.id)).returning();
      goals = updated;
    } else {
      const [created] = await db.insert(nutritionGoalsTable).values({ userId: user.id, calories: calories.toString(), protein: protein.toString(), carbs: carbs.toString(), fats: fats.toString() }).returning();
      goals = created;
    }
    res.json({ ...goals, calories: parseFloat(goals.calories), protein: parseFloat(goals.protein), carbs: parseFloat(goals.carbs), fats: parseFloat(goals.fats) });
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
