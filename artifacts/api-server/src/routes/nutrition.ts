import { Router } from "express";
import { getSingleValue } from "../lib/getSingleValue";
import { requireAuth, getAuthUser } from "../lib/auth";
import { db, foodItemsTable, foodLogsTable, nutritionGoalsTable, waterIntakeTable, supplementsTable, supplementLogsTable, userSupplementsTable } from "@workspace/db";
import { eq, and, or, isNull, count, sql } from "drizzle-orm";
import { DEFAULT_SUPPLEMENTS } from "../data/default-supplements";

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

router.delete("/nutrition/foods/:foodItemId", requireAuth, async (req, res) => {
  try {
    const user = await getAuthUser(req);
    const foodItemIdParam = getSingleValue(req.params.foodItemId);
    if (!foodItemIdParam) {
      res.status(400).json({ error: "Missing food item id" });
      return;
    }
    const foodItemId = parseInt(foodItemIdParam);
    
    const f = await db.query.foodItemsTable.findFirst({ where: eq(foodItemsTable.id, foodItemId) });
    if (!f) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    
    if (!f.isCustom) {
      res.status(403).json({ error: "Cannot delete default foods" });
      return;
    }
    
    if (f.userId !== user.id) {
      res.status(403).json({ error: "Unauthorized to delete this food item" });
      return;
    }
    
    const usageCount = await db
      .select({ c: count() })
      .from(foodLogsTable)
      .where(eq(foodLogsTable.foodItemId, foodItemId));
      
    if (usageCount[0] && usageCount[0].c > 0) {
      res.status(400).json({ error: "Cannot delete a food item that is referenced in your historical nutrition logs." });
      return;
    }
    
    await db.delete(foodItemsTable).where(eq(foodItemsTable.id, foodItemId));
    res.status(204).end();
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
    const { calories, protein, carbs, fats, waterMl } = req.body;
    const existing = await db.query.nutritionGoalsTable.findFirst({ where: eq(nutritionGoalsTable.userId, user.id) });
    let goals;
    if (existing) {
      const [updated] = await db.update(nutritionGoalsTable).set({ calories: calories.toString(), protein: protein.toString(), carbs: carbs.toString(), fats: fats.toString(), waterMl }).where(eq(nutritionGoalsTable.userId, user.id)).returning();
      goals = updated;
    } else {
      const [created] = await db.insert(nutritionGoalsTable).values({ userId: user.id, calories: calories.toString(), protein: protein.toString(), carbs: carbs.toString(), fats: fats.toString(), waterMl }).returning();
      goals = created;
    }
    res.json({ ...goals, calories: parseFloat(goals.calories), protein: parseFloat(goals.protein), carbs: parseFloat(goals.carbs), fats: parseFloat(goals.fats) });
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/nutrition/water", requireAuth, async (req, res) => {
  try {
    const user = await getAuthUser(req);
    const date = getSingleValue(req.query.date);
    if (!date) {
      res.status(400).json({ error: "Missing date" });
      return;
    }
    const entries = await db.select().from(waterIntakeTable).where(and(eq(waterIntakeTable.userId, user.id), eq(waterIntakeTable.date, date))).orderBy(waterIntakeTable.loggedAt);
    let goals = await db.query.nutritionGoalsTable.findFirst({ where: eq(nutritionGoalsTable.userId, user.id) });
    if (!goals) {
      const [created] = await db.insert(nutritionGoalsTable).values({ userId: user.id }).returning();
      goals = created;
    }
    const totalMl = entries.reduce((sum, e) => sum + e.amountMl, 0);
    res.json({ date, entries, totalMl, goalMl: goals.waterMl });
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/nutrition/water", requireAuth, async (req, res) => {
  try {
    const user = await getAuthUser(req);
    const { amountMl, date } = req.body;
    const [entry] = await db.insert(waterIntakeTable).values({ userId: user.id, amountMl, date }).returning();
    res.status(201).json(entry);
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/nutrition/water/:entryId", requireAuth, async (req, res) => {
  try {
    const user = await getAuthUser(req);
    const entryIdParam = getSingleValue(req.params.entryId);
    if (!entryIdParam) {
      res.status(400).json({ error: "Missing entry id" });
      return;
    }
    const entryId = parseInt(entryIdParam);
    const { amountMl } = req.body;
    const [entry] = await db.update(waterIntakeTable).set({ amountMl }).where(and(eq(waterIntakeTable.id, entryId), eq(waterIntakeTable.userId, user.id))).returning();
    if (!entry) { res.status(404).json({ error: "Not found" }); return; }
    res.json(entry);
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/nutrition/water/:entryId", requireAuth, async (req, res) => {
  try {
    const user = await getAuthUser(req);
    const entryIdParam = getSingleValue(req.params.entryId);
    if (!entryIdParam) {
      res.status(400).json({ error: "Missing entry id" });
      return;
    }
    const entryId = parseInt(entryIdParam);
    await db.delete(waterIntakeTable).where(and(eq(waterIntakeTable.id, entryId), eq(waterIntakeTable.userId, user.id)));
    res.status(204).send();
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/nutrition/supplements/catalog", requireAuth, async (req, res) => {
  try {
    const user = await getAuthUser(req);
    const q = getSingleValue(req.query.q);
    
    let catalog = await db.select().from(supplementsTable).where(
      or(isNull(supplementsTable.userId), eq(supplementsTable.userId, user.id))
    );
    
    if (q) {
      catalog = catalog.filter(s => s.name.toLowerCase().includes(q.toLowerCase()));
    }
    
    res.json(catalog);
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/nutrition/supplements", requireAuth, async (req, res) => {
  try {
    const user = await getAuthUser(req);
    const date = getSingleValue(req.query.date);
    if (!date) {
      res.status(400).json({ error: "Missing date" });
      return;
    }
    
    let checklist = await db.select({
      checklistId: userSupplementsTable.id,
      id: supplementsTable.id,
      name: supplementsTable.name,
      dosage: userSupplementsTable.customDosage,
      defaultDosage: supplementsTable.dosage,
      displayOrder: userSupplementsTable.displayOrder,
      isCustom: supplementsTable.isCustom
    })
    .from(userSupplementsTable)
    .innerJoin(supplementsTable, eq(userSupplementsTable.supplementId, supplementsTable.id))
    .where(eq(userSupplementsTable.userId, user.id))
    .orderBy(userSupplementsTable.displayOrder, userSupplementsTable.createdAt);
    
    const logs = await db.select().from(supplementLogsTable).where(and(eq(supplementLogsTable.userId, user.id), eq(supplementLogsTable.date, date)));
    const loggedIds = new Set(logs.map(l => l.supplementId));
    
    const result = checklist.map(s => ({
      checklistId: s.checklistId,
      id: s.id,
      name: s.name,
      dosage: s.dosage ?? s.defaultDosage,
      displayOrder: s.displayOrder,
      isTaken: loggedIds.has(s.id)
    }));
    
    res.json(result);
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/nutrition/supplements", requireAuth, async (req, res) => {
  // This is used to create a completely new custom supplement in the catalog
  try {
    const user = await getAuthUser(req);
    const { name, dosage } = req.body;
    const [supplement] = await db.insert(supplementsTable).values({ userId: user.id, name, dosage, isCustom: true }).returning();
    res.status(201).json(supplement);
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/nutrition/supplements/checklist", requireAuth, async (req, res) => {
  try {
    const user = await getAuthUser(req);
    const { supplementId, customDosage } = req.body;
    
    // Check if it's already in the checklist
    const existing = await db.query.userSupplementsTable.findFirst({
      where: and(eq(userSupplementsTable.userId, user.id), eq(userSupplementsTable.supplementId, supplementId))
    });
    
    if (existing) {
      res.status(400).json({ error: "Supplement already in checklist" });
      return;
    }
    
    // Get max display order
    const currentItems = await db.select().from(userSupplementsTable).where(eq(userSupplementsTable.userId, user.id));
    const maxOrder = currentItems.length > 0 ? Math.max(...currentItems.map(i => i.displayOrder)) : -1;
    
    const [entry] = await db.insert(userSupplementsTable).values({
      userId: user.id,
      supplementId,
      customDosage,
      displayOrder: maxOrder + 1
    }).returning();
    
    res.status(201).json(entry);
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/nutrition/supplements/checklist/:checklistId", requireAuth, async (req, res) => {
  try {
    const user = await getAuthUser(req);
    const checklistId = parseInt(getSingleValue(req.params.checklistId) ?? "");
    const { customDosage, displayOrder } = req.body;
    
    const updateData: any = {};
    if (customDosage !== undefined) updateData.customDosage = customDosage;
    if (displayOrder !== undefined) updateData.displayOrder = displayOrder;
    
    const [entry] = await db.update(userSupplementsTable)
      .set(updateData)
      .where(and(eq(userSupplementsTable.id, checklistId), eq(userSupplementsTable.userId, user.id)))
      .returning();
      
    if (!entry) { res.status(404).json({ error: "Not found" }); return; }
    res.json(entry);
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/nutrition/supplements/checklist/:checklistId", requireAuth, async (req, res) => {
  try {
    const user = await getAuthUser(req);
    const checklistId = parseInt(getSingleValue(req.params.checklistId) ?? "");
    await db.delete(userSupplementsTable).where(and(eq(userSupplementsTable.id, checklistId), eq(userSupplementsTable.userId, user.id)));
    res.status(204).send();
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/nutrition/supplements/logs", requireAuth, async (req, res) => {
  try {
    const user = await getAuthUser(req);
    const { supplementId, date } = req.body;
    await db.insert(supplementLogsTable).values({ userId: user.id, supplementId, date }).onConflictDoNothing();
    res.json({ success: true });
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/nutrition/supplements/logs", requireAuth, async (req, res) => {
  try {
    const user = await getAuthUser(req);
    const { supplementId, date } = req.body;
    await db.delete(supplementLogsTable).where(and(eq(supplementLogsTable.userId, user.id), eq(supplementLogsTable.supplementId, supplementId), eq(supplementLogsTable.date, date)));
    res.status(204).send();
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
