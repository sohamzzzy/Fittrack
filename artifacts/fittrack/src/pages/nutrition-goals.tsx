import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useGetNutritionGoals, useSetNutritionGoals, getGetNutritionGoalsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Flame, Target } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function NutritionGoals() {
  const [, setLocation] = useLocation();
  const { data: goals, isLoading } = useGetNutritionGoals();
  const setGoals = useSetNutritionGoals();
  const qc = useQueryClient();
  const { toast } = useToast();

  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fats, setFats] = useState("");

  useEffect(() => {
    if (goals) {
      setCalories(String(Math.round(goals.calories as number)));
      setProtein(String(Math.round(goals.protein as number)));
      setCarbs(String(Math.round(goals.carbs as number)));
      setFats(String(Math.round(goals.fats as number)));
    }
  }, [goals]);

  const proteinCals = (parseFloat(protein) || 0) * 4;
  const carbsCals = (parseFloat(carbs) || 0) * 4;
  const fatsCals = (parseFloat(fats) || 0) * 9;
  const totalCals = proteinCals + carbsCals + fatsCals;

  const handleSave = () => {
    setGoals.mutate({ data: { calories: parseFloat(calories), protein: parseFloat(protein), carbs: parseFloat(carbs), fats: parseFloat(fats) } }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetNutritionGoalsQueryKey() });
        toast({ title: "Goals saved" });
        setLocation("/nutrition");
      },
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="text-muted-foreground" onClick={() => setLocation("/nutrition")} data-testid="button-back">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-xl font-black">Nutrition Goals</h1>
      </div>

      <Card className="bg-card border-card-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Target className="w-4 h-4" /> Daily Targets
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-semibold mb-1.5 flex items-center gap-2"><Flame className="w-4 h-4 text-primary" />Calories (kcal)</label>
            <Input type="number" value={calories} onChange={(e) => setCalories(e.target.value)} className="text-lg font-bold" placeholder="2000" data-testid="input-goal-calories" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-muted-foreground font-medium block mb-1.5">Protein (g)</label>
              <Input type="number" value={protein} onChange={(e) => setProtein(e.target.value)} placeholder="150" data-testid="input-goal-protein" />
              <p className="text-[10px] text-muted-foreground mt-1">{proteinCals} kcal</p>
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-medium block mb-1.5">Carbs (g)</label>
              <Input type="number" value={carbs} onChange={(e) => setCarbs(e.target.value)} placeholder="200" data-testid="input-goal-carbs" />
              <p className="text-[10px] text-muted-foreground mt-1">{carbsCals} kcal</p>
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-medium block mb-1.5">Fats (g)</label>
              <Input type="number" value={fats} onChange={(e) => setFats(e.target.value)} placeholder="65" data-testid="input-goal-fats" />
              <p className="text-[10px] text-muted-foreground mt-1">{fatsCals} kcal</p>
            </div>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <span className="text-sm text-muted-foreground">Macro total</span>
            <span className={`text-sm font-bold ${Math.abs(totalCals - (parseFloat(calories) || 0)) < 50 ? "text-green-400" : "text-amber-400"}`}>{totalCals} kcal</span>
          </div>
        </CardContent>
      </Card>

      <Button className="w-full font-bold" onClick={handleSave} disabled={setGoals.isPending || !calories} data-testid="button-save-goals">
        {setGoals.isPending ? "Saving..." : "Save Goals"}
      </Button>
    </div>
  );
}
