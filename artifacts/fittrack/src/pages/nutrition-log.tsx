import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import {
  useListFoodItems, useCreateFoodItem, useLogFood,
  getGetNutritionSummaryQueryKey, getListFoodItemsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Plus, Search } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;
const MEAL_LABELS: Record<string, string> = { breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner", snack: "Snacks" };

export default function NutritionLog() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const defaultMeal = (params.get("meal") as any) ?? "snack";

  const [q, setQ] = useState("");
  type MealType = "breakfast" | "lunch" | "dinner" | "snack";
  const [selectedMeal, setSelectedMeal] = useState<MealType>(defaultMeal as MealType);
  const handleMealChange = (v: string) => setSelectedMeal(v as MealType);
  const [qty, setQty] = useState("1");
  const [selectedFood, setSelectedFood] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newFood, setNewFood] = useState({ name: "", calories: "", protein: "", carbs: "", fats: "" });
  const { toast } = useToast();
  const qc = useQueryClient();
  const today = format(new Date(), "yyyy-MM-dd");

  const { data: foods, isLoading } = useListFoodItems({ q: q || undefined, recentOnly: !q ? true : undefined });
  const logFood = useLogFood();
  const createFoodItem = useCreateFoodItem();

  const handleLog = (foodId: number) => {
    logFood.mutate({ data: { foodItemId: foodId, mealType: selectedMeal, quantity: parseFloat(qty) || 1, date: today } }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetNutritionSummaryQueryKey({ date: today }) });
        toast({ title: "Food logged" });
        setLocation("/nutrition");
      },
    });
  };

  const handleCreate = () => {
    const { name, calories, protein, carbs, fats } = newFood;
    if (!name || !calories) return;
    createFoodItem.mutate({ data: { name, calories: parseFloat(calories), protein: parseFloat(protein) || 0, carbs: parseFloat(carbs) || 0, fats: parseFloat(fats) || 0 } }, {
      onSuccess: (food) => {
        qc.invalidateQueries({ queryKey: getListFoodItemsQueryKey() });
        setCreateOpen(false);
        handleLog(food.id);
      },
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="text-muted-foreground" onClick={() => setLocation("/nutrition")} data-testid="button-back">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-xl font-black">Log Food</h1>
      </div>

      <div className="flex gap-2">
        <Select value={selectedMeal} onValueChange={handleMealChange}>
          <SelectTrigger className="w-36" data-testid="select-meal-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MEAL_TYPES.map((m) => <SelectItem key={m} value={m}>{MEAL_LABELS[m]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={qty} onValueChange={setQty}>
          <SelectTrigger className="w-20" data-testid="select-quantity">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {["0.5", "1", "1.5", "2", "2.5", "3"].map((v) => <SelectItem key={v} value={v}>{v}x</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input className="pl-9" placeholder={q ? "Search foods..." : "Recent foods shown below"} value={q} onChange={(e) => setQ(e.target.value)} data-testid="input-food-search" />
      </div>

      <div className="space-y-2">
        {isLoading ? (
          [0,1,2,3].map(i => <Skeleton key={i} className="h-16" />)
        ) : Array.isArray(foods) && foods.length > 0 ? (
          foods.map((food) => (
            <Card key={food.id} className={cn("bg-card border-card-border cursor-pointer hover:border-primary/40 transition-colors", selectedFood === food.id ? "border-primary/60 bg-primary/5" : "")} onClick={() => setSelectedFood(food.id === selectedFood ? null : food.id)} data-testid={`card-food-${food.id}`}>
              <CardContent className="py-3 px-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{food.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {Math.round(food.calories as number)} kcal · P:{Math.round(food.protein as number)}g C:{Math.round(food.carbs as number)}g F:{Math.round(food.fats as number)}g
                    </p>
                  </div>
                  {selectedFood === food.id ? (
                    <Button size="sm" className="font-bold shrink-0 ml-3" onClick={(e) => { e.stopPropagation(); handleLog(food.id); }} disabled={logFood.isPending} data-testid={`button-log-food-${food.id}`}>
                      Log
                    </Button>
                  ) : (
                    <Plus className="w-4 h-4 text-muted-foreground shrink-0 ml-3" />
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="bg-card border-card-border">
            <CardContent className="py-8 text-center text-muted-foreground text-sm">
              {q ? `No food found for "${q}"` : "No recent foods. Search or create a custom food."}
            </CardContent>
          </Card>
        )}
      </div>

      <Button variant="outline" className="w-full border-dashed" onClick={() => setCreateOpen(true)} data-testid="button-create-food">
        <Plus className="w-4 h-4 mr-2" /> Create Custom Food
      </Button>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-card border-card-border">
          <DialogHeader><DialogTitle>Custom Food</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Food name" value={newFood.name} onChange={(e) => setNewFood({ ...newFood, name: e.target.value })} data-testid="input-custom-food-name" />
            <div className="grid grid-cols-2 gap-2">
              <div><label className="text-xs text-muted-foreground">Calories</label><Input type="number" placeholder="0" value={newFood.calories} onChange={(e) => setNewFood({ ...newFood, calories: e.target.value })} data-testid="input-custom-calories" /></div>
              <div><label className="text-xs text-muted-foreground">Protein (g)</label><Input type="number" placeholder="0" value={newFood.protein} onChange={(e) => setNewFood({ ...newFood, protein: e.target.value })} data-testid="input-custom-protein" /></div>
              <div><label className="text-xs text-muted-foreground">Carbs (g)</label><Input type="number" placeholder="0" value={newFood.carbs} onChange={(e) => setNewFood({ ...newFood, carbs: e.target.value })} data-testid="input-custom-carbs" /></div>
              <div><label className="text-xs text-muted-foreground">Fats (g)</label><Input type="number" placeholder="0" value={newFood.fats} onChange={(e) => setNewFood({ ...newFood, fats: e.target.value })} data-testid="input-custom-fats" /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!newFood.name || !newFood.calories || createFoodItem.isPending} className="font-bold" data-testid="button-save-custom-food">
              {createFoodItem.isPending ? "Creating..." : "Create & Log"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
