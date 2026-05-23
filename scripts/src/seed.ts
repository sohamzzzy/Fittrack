/**
 * Development seed: global catalog rows (no Clerk user required).
 *
 * Usage (from repo root):
 *   pnpm --filter @workspace/scripts seed
 *   pnpm --filter @workspace/scripts seed -- --reset-catalog
 *
 * `--reset-catalog` removes global exercises and system food items (user_id IS NULL),
 * then re-inserts. Do not use on a database where you care about FK-linked history
 * to those exercise rows.
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { and, count, eq, isNull } from "drizzle-orm";

function repoRoot(): string {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
}

const CATALOG_EXERCISES: Array<{
  name: string;
  category: string;
  muscleGroups: string[];
  description?: string;
}> = [
  { name: "Barbell Bench Press", category: "Barbell", muscleGroups: ["Chest", "Triceps"], description: "Flat bench, full ROM." },
  { name: "Incline Dumbbell Press", category: "Dumbbell", muscleGroups: ["Chest", "Shoulders"], description: "30–45° incline." },
  { name: "Cable Fly", category: "Cable", muscleGroups: ["Chest"], description: "Constant tension chest fly." },
  { name: "Push-Up", category: "Bodyweight", muscleGroups: ["Chest", "Triceps", "Core"], description: "Bodyweight pressing." },
  { name: "Barbell Back Squat", category: "Barbell", muscleGroups: ["Legs", "Glutes"], description: "High-bar or low-bar squat." },
  { name: "Romanian Deadlift", category: "Barbell", muscleGroups: ["Glutes", "Legs", "Back"], description: "Hip hinge RDL." },
  { name: "Leg Press", category: "Machine", muscleGroups: ["Legs", "Glutes"], description: "Machine quad/glute emphasis." },
  { name: "Walking Lunge", category: "Dumbbell", muscleGroups: ["Legs", "Glutes"], description: "Alternating lunges." },
  { name: "Standing Calf Raise", category: "Machine", muscleGroups: ["Calves"], description: "Gastrocnemius focus." },
  { name: "Pull-Up", category: "Bodyweight", muscleGroups: ["Back", "Biceps"], description: "Overhand grip vertical pull." },
  { name: "Barbell Row", category: "Barbell", muscleGroups: ["Back", "Biceps"], description: "Bent-over row." },
  { name: "Lat Pulldown", category: "Cable", muscleGroups: ["Back", "Biceps"], description: "Wide or neutral grip." },
  { name: "Seated Cable Row", category: "Cable", muscleGroups: ["Back", "Biceps"], description: "Mid-back thickness." },
  { name: "Overhead Press", category: "Barbell", muscleGroups: ["Shoulders", "Triceps"], description: "Strict standing press." },
  { name: "Lateral Raise", category: "Dumbbell", muscleGroups: ["Shoulders"], description: "Side delt isolation." },
  { name: "Face Pull", category: "Cable", muscleGroups: ["Shoulders", "Back"], description: "Rear delt / external rotation." },
  { name: "Barbell Curl", category: "Barbell", muscleGroups: ["Biceps"], description: "Standing curl." },
  { name: "Tricep Pushdown", category: "Cable", muscleGroups: ["Triceps"], description: "Rope or straight bar." },
  { name: "Skull Crusher", category: "Barbell", muscleGroups: ["Triceps"], description: "Lying tricep extension." },
  { name: "Plank", category: "Bodyweight", muscleGroups: ["Core"], description: "Anti-extension hold." },
  { name: "Hanging Leg Raise", category: "Bodyweight", muscleGroups: ["Core"], description: "Hip flexion from hang." },
  { name: "Treadmill Run", category: "Cardio", muscleGroups: ["Legs"], description: "Steady-state or intervals." },
  { name: "Assault Bike", category: "Cardio", muscleGroups: ["Legs", "Shoulders"], description: "Full-body conditioning." },
];

const SYSTEM_FOOD_ITEMS: Array<{
  name: string;
  calories: string;
  protein: string;
  carbs: string;
  fats: string;
  servingSize?: string;
  servingUnit?: string;
}> = [
  { name: "Chicken breast (grilled, 100g)", calories: "165", protein: "31", carbs: "0", fats: "3.6", servingSize: "100", servingUnit: "g" },
  { name: "Brown rice (cooked, 1 cup)", calories: "216", protein: "5", carbs: "45", fats: "1.8", servingSize: "1", servingUnit: "cup" },
  { name: "Greek yogurt (plain, 170g)", calories: "100", protein: "17", carbs: "6", fats: "0.7", servingSize: "170", servingUnit: "g" },
  { name: "Large egg", calories: "78", protein: "6", carbs: "0.6", fats: "5.3", servingSize: "1", servingUnit: "egg" },
  { name: "Oats (dry, 40g)", calories: "150", protein: "5", carbs: "27", fats: "3", servingSize: "40", servingUnit: "g" },
  { name: "Banana (medium)", calories: "105", protein: "1.3", carbs: "27", fats: "0.4", servingSize: "1", servingUnit: "medium" },
  { name: "Salmon (baked, 100g)", calories: "206", protein: "22", carbs: "0", fats: "12", servingSize: "100", servingUnit: "g" },
  { name: "Broccoli (steamed, 1 cup)", calories: "55", protein: "3.7", carbs: "11", fats: "0.6", servingSize: "1", servingUnit: "cup" },
];

async function main() {
  dotenv.config({ path: path.join(repoRoot(), ".env") });

  const [{ db, pool }, { exercisesTable, foodItemsTable }] = await Promise.all([
    import("@workspace/db"),
    import("@workspace/db/schema"),
  ]);

  try {
    const args = process.argv.slice(2);
    const resetCatalog = args.includes("--reset-catalog");

    if (resetCatalog) {
      console.warn("[seed] --reset-catalog: removing global exercises and system food items (user_id IS NULL)…");
      await db.delete(foodItemsTable).where(isNull(foodItemsTable.userId));
      await db.delete(exercisesTable).where(and(isNull(exercisesTable.userId), eq(exercisesTable.isCustom, false)));
    }

    let exercisesInserted = 0;
    let exercisesSkipped = 0;

    for (const row of CATALOG_EXERCISES) {
      const existing = await db
        .select({ id: exercisesTable.id })
        .from(exercisesTable)
        .where(and(eq(exercisesTable.name, row.name), isNull(exercisesTable.userId)))
        .limit(1);
      if (existing.length > 0) {
        exercisesSkipped++;
        continue;
      }
      await db.insert(exercisesTable).values({
        name: row.name,
        category: row.category,
        muscleGroups: row.muscleGroups,
        description: row.description ?? null,
        isCustom: false,
        userId: null,
      });
      exercisesInserted++;
    }

    let foodsInserted = 0;
    let foodsSkipped = 0;

    for (const row of SYSTEM_FOOD_ITEMS) {
      const existing = await db
        .select({ id: foodItemsTable.id })
        .from(foodItemsTable)
        .where(and(eq(foodItemsTable.name, row.name), isNull(foodItemsTable.userId)))
        .limit(1);
      if (existing.length > 0) {
        foodsSkipped++;
        continue;
      }
      await db.insert(foodItemsTable).values({
        userId: null,
        name: row.name,
        calories: row.calories,
        protein: row.protein,
        carbs: row.carbs,
        fats: row.fats,
        servingSize: row.servingSize ?? null,
        servingUnit: row.servingUnit ?? null,
        isCustom: false,
      });
      foodsInserted++;
    }

    const [{ exerciseCount }] = await db
      .select({ exerciseCount: count() })
      .from(exercisesTable)
      .where(isNull(exercisesTable.userId));
    const [{ foodCount }] = await db
      .select({ foodCount: count() })
      .from(foodItemsTable)
      .where(isNull(foodItemsTable.userId));

    console.log(
      `[seed] exercises: +${exercisesInserted} inserted, ${exercisesSkipped} already present (global total: ${Number(exerciseCount)})`,
    );
    console.log(
      `[seed] food items: +${foodsInserted} inserted, ${foodsSkipped} already present (system total: ${Number(foodCount)})`,
    );
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("[seed] failed:", err);
  process.exit(1);
});
