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
import fs from "node:fs";
import { and, count, eq, isNull } from "drizzle-orm";

function repoRoot(): string {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
}

const CATALOG_EXERCISES = JSON.parse(
  fs.readFileSync(path.join(repoRoot(), "scripts", "src", "data", "exercises.json"), "utf-8")
);

const SYSTEM_FOOD_ITEMS = JSON.parse(
  fs.readFileSync(path.join(repoRoot(), "scripts", "src", "data", "foods.json"), "utf-8")
);

const GLOBAL_SUPPLEMENTS = JSON.parse(
  fs.readFileSync(path.join(repoRoot(), "scripts", "src", "data", "supplements.json"), "utf-8")
);

async function main() {
  dotenv.config({ path: path.join(repoRoot(), ".env") });

  const [{ db, pool }, { exercisesTable, foodItemsTable, supplementsTable }] = await Promise.all([
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
      await db.delete(supplementsTable).where(and(isNull(supplementsTable.userId), eq(supplementsTable.isCustom, false)));
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

    let supplementsInserted = 0;
    let supplementsSkipped = 0;

    for (const row of GLOBAL_SUPPLEMENTS) {
      const existing = await db
        .select({ id: supplementsTable.id })
        .from(supplementsTable)
        .where(and(eq(supplementsTable.name, row.name), isNull(supplementsTable.userId)))
        .limit(1);
      if (existing.length > 0) {
        supplementsSkipped++;
        continue;
      }
      await db.insert(supplementsTable).values({
        userId: null,
        name: row.name,
        dosage: row.dosage ?? null,
        isCustom: false,
      });
      supplementsInserted++;
    }

    const [{ exerciseCount }] = await db
      .select({ exerciseCount: count() })
      .from(exercisesTable)
      .where(isNull(exercisesTable.userId));
    const [{ foodCount }] = await db
      .select({ foodCount: count() })
      .from(foodItemsTable)
      .where(isNull(foodItemsTable.userId));
    const [{ supplementCount }] = await db
      .select({ supplementCount: count() })
      .from(supplementsTable)
      .where(isNull(supplementsTable.userId));

    console.log(
      `[seed] exercises: +${exercisesInserted} inserted, ${exercisesSkipped} already present (global total: ${Number(exerciseCount)})`,
    );
    console.log(
      `[seed] food items: +${foodsInserted} inserted, ${foodsSkipped} already present (system total: ${Number(foodCount)})`,
    );
    console.log(
      `[seed] supplements: +${supplementsInserted} inserted, ${supplementsSkipped} already present (global total: ${Number(supplementCount)})`,
    );
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("[seed] failed:", err);
  process.exit(1);
});
