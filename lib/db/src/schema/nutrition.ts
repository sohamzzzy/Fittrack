import { pgTable, text, serial, timestamp, integer, boolean, numeric, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const foodItemsTable = pgTable("food_items", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  calories: numeric("calories", { precision: 8, scale: 2 }).notNull(),
  protein: numeric("protein", { precision: 8, scale: 2 }).notNull(),
  carbs: numeric("carbs", { precision: 8, scale: 2 }).notNull(),
  fats: numeric("fats", { precision: 8, scale: 2 }).notNull(),
  healthScore: numeric("health_score", { precision: 4, scale: 1 }),
  servingSize: numeric("serving_size", { precision: 8, scale: 2 }),
  servingUnit: text("serving_unit"),
  isCustom: boolean("is_custom").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const foodLogsTable = pgTable("food_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  foodItemId: integer("food_item_id").notNull().references(() => foodItemsTable.id, { onDelete: "cascade" }),
  mealType: text("meal_type").notNull().default("snack"),
  quantity: numeric("quantity", { precision: 8, scale: 2 }).notNull().default("1"),
  date: date("date").notNull(),
  loggedAt: timestamp("logged_at", { withTimezone: true }).notNull().defaultNow(),
  customCalories: numeric("custom_calories", { precision: 8, scale: 2 }),
  customProtein: numeric("custom_protein", { precision: 8, scale: 2 }),
  customCarbs: numeric("custom_carbs", { precision: 8, scale: 2 }),
  customFats: numeric("custom_fats", { precision: 8, scale: 2 }),
});

export const nutritionGoalsTable = pgTable("nutrition_goals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }).unique(),
  calories: numeric("calories", { precision: 8, scale: 2 }).notNull().default("2000"),
  protein: numeric("protein", { precision: 8, scale: 2 }).notNull().default("150"),
  carbs: numeric("carbs", { precision: 8, scale: 2 }).notNull().default("200"),
  fats: numeric("fats", { precision: 8, scale: 2 }).notNull().default("65"),
  waterMl: integer("water_ml").notNull().default(3000),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const waterIntakeTable = pgTable("water_intake", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  amountMl: integer("amount_ml").notNull(),
  date: date("date").notNull(),
  loggedAt: timestamp("logged_at", { withTimezone: true }).notNull().defaultNow(),
});

export const supplementsTable = pgTable("supplements", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  dosage: text("dosage"),
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const supplementLogsTable = pgTable("supplement_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  supplementId: integer("supplement_id").notNull().references(() => supplementsTable.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  loggedAt: timestamp("logged_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertFoodItemSchema = createInsertSchema(foodItemsTable).omit({ id: true, createdAt: true });
export const insertFoodLogSchema = createInsertSchema(foodLogsTable).omit({ id: true, loggedAt: true });

export type InsertFoodItem = z.infer<typeof insertFoodItemSchema>;
export type FoodItem = typeof foodItemsTable.$inferSelect;
export type FoodLog = typeof foodLogsTable.$inferSelect;
export type NutritionGoals = typeof nutritionGoalsTable.$inferSelect;
export type WaterIntake = typeof waterIntakeTable.$inferSelect;
export type Supplement = typeof supplementsTable.$inferSelect;
export type SupplementLog = typeof supplementLogsTable.$inferSelect;
