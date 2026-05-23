import { useState } from "react";
import { Link } from "wouter";
import {
  useGetNutritionSummary, useDeleteFoodLog,
  getGetNutritionSummaryQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Plus, Flame, Trash2, Settings, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;
const MEAL_LABELS: Record<string, string> = { breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner", snack: "Snacks" };
const MACRO_COLORS = { protein: "hsl(0 80% 60%)", carbs: "hsl(40 90% 55%)", fats: "hsl(200 80% 55%)" };

function MacroRing({ value, goal, color, label, unit = "g" }: { value: number; goal: number; color: string; label: string; unit?: string }) {
  const pct = goal > 0 ? Math.min(value / goal, 1) : 0;
  const r = 36;
  const circ = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative w-20 h-20">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 88 88">
          <circle cx="44" cy="44" r={r} fill="none" stroke="hsl(220 10% 10%)" strokeWidth="10" />
          <circle cx="44" cy="44" r={r} fill="none" stroke={color} strokeWidth="10" strokeDasharray={`${pct * circ} ${circ}`} strokeLinecap="round" className="transition-all duration-700" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-sm font-black">{Math.round(value)}{unit}</span>
          <span className="text-[9px] text-muted-foreground">/{Math.round(goal)}</span>
        </div>
      </div>
      <span className="text-xs text-muted-foreground font-medium">{label}</span>
    </div>
  );
}

export default function Nutrition() {
  const today = format(new Date(), "yyyy-MM-dd");
  const { data: summary, isLoading } = useGetNutritionSummary({ date: today });
  const deleteFoodLog = useDeleteFoodLog();
  const qc = useQueryClient();

  const handleDelete = (logId: number) => {
    deleteFoodLog.mutate({ logId }, {
      onSuccess: () => qc.invalidateQueries({ queryKey: getGetNutritionSummaryQueryKey({ date: today }) }),
    });
  };

  const calGoal = summary?.goalCalories ?? 2000;
  const calPct = calGoal > 0 ? Math.min((summary?.totalCalories ?? 0) / calGoal, 1) : 0;
  const calLeft = Math.max(0, calGoal - (summary?.totalCalories ?? 0));
  const rMain = 64;
  const circMain = 2 * Math.PI * rMain;

  const byMeal = MEAL_TYPES.reduce<Record<string, any[]>>((acc, mt) => {
    acc[mt] = summary?.logs?.filter((l) => l.mealType === mt) ?? [];
    return acc;
  }, {} as any);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black tracking-tight">Nutrition</h1>
        <div className="flex gap-2">
          <Link href="/nutrition/goals">
            <Button variant="ghost" size="icon" className="text-muted-foreground" data-testid="button-nutrition-goals">
              <Settings className="w-4 h-4" />
            </Button>
          </Link>
          <Link href="/nutrition/log">
            <Button size="sm" className="font-bold" data-testid="button-log-food">
              <Plus className="w-4 h-4 mr-1" /> Log
            </Button>
          </Link>
        </div>
      </div>

      {/* Calories + Macro Rings */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="bg-card border-card-border">
          <CardContent className="pt-6 pb-6">
            {isLoading ? (
              <div className="flex justify-center gap-6"><Skeleton className="w-36 h-36 rounded-full" />{[0,1,2].map(i => <Skeleton key={i} className="w-20 h-20 rounded-full" />)}</div>
            ) : (
              <div className="flex items-center justify-around flex-wrap gap-4">
                <div className="relative w-36 h-36">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 144 144">
                    <circle cx="72" cy="72" r={rMain} fill="none" stroke="hsl(220 10% 10%)" strokeWidth="16" />
                    <circle cx="72" cy="72" r={rMain} fill="none" stroke="hsl(15 100% 55%)" strokeWidth="16" strokeDasharray={`${calPct * circMain} ${circMain}`} strokeLinecap="round" className="transition-all duration-700" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <Flame className="w-5 h-5 text-primary mb-0.5" />
                    <span className="text-2xl font-black">{Math.round(calLeft)}</span>
                    <span className="text-[10px] text-muted-foreground">kcal left</span>
                  </div>
                </div>
                <div className="flex gap-4">
                  <MacroRing value={summary?.totalProtein ?? 0} goal={summary?.goalProtein ?? 150} color={MACRO_COLORS.protein} label="Protein" />
                  <MacroRing value={summary?.totalCarbs ?? 0} goal={summary?.goalCarbs ?? 200} color={MACRO_COLORS.carbs} label="Carbs" />
                  <MacroRing value={summary?.totalFats ?? 0} goal={summary?.goalFats ?? 65} color={MACRO_COLORS.fats} label="Fats" />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Meals */}
      {MEAL_TYPES.map((mealType, mi) => {
        const logs = byMeal[mealType] ?? [];
        const mealCals = logs.reduce((acc: number, l: any) => acc + (l.effectiveCalories ?? 0), 0);
        return (
          <motion.div key={mealType} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: mi * 0.07 }}>
            <Card className="bg-card border-card-border">
              <CardHeader className="pb-2 pt-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold">{MEAL_LABELS[mealType]}</CardTitle>
                  <div className="flex items-center gap-2">
                    {mealCals > 0 && <span className="text-xs text-muted-foreground">{Math.round(mealCals)} kcal</span>}
                    <Link href={`/nutrition/log?meal=${mealType}`}>
                      <Button variant="ghost" size="icon" className="w-6 h-6 text-muted-foreground" data-testid={`button-add-${mealType}`}>
                        <Plus className="w-3.5 h-3.5" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 pb-3">
                {logs.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-1">Nothing logged yet</p>
                ) : (
                  <div className="space-y-1.5">
                    {logs.map((l: any) => (
                      <div key={l.id} className="flex items-center justify-between py-1.5 group" data-testid={`log-item-${l.id}`}>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{l.foodItem?.name}</p>
                          <p className="text-xs text-muted-foreground">{l.quantity}x · {Math.round(l.effectiveCalories)} kcal · P:{Math.round(l.effectiveProtein)}g C:{Math.round(l.effectiveCarbs)}g F:{Math.round(l.effectiveFats)}g</p>
                        </div>
                        <Button variant="ghost" size="icon" className="w-7 h-7 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive transition-all" onClick={() => handleDelete(l.id)} data-testid={`button-delete-log-${l.id}`}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
