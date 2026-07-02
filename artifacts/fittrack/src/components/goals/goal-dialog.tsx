import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Goal, CreateGoalRequest, UpdateGoalRequest, useListExercises } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initialData?: Goal | null;
  onSubmit: (data: CreateGoalRequest | UpdateGoalRequest) => Promise<void>;
};

export function GoalDialog({ open, onOpenChange, initialData, onSubmit }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<Goal['category']>("WORKOUT");
  const [metric, setMetric] = useState("");
  const [targetValue, setTargetValue] = useState("");
  const [smartGoalType, setSmartGoalType] = useState<string>("none");
  const [smartExerciseId, setSmartExerciseId] = useState<string>("");
  const [deadline, setDeadline] = useState("");
  const [loading, setLoading] = useState(false);

  const { data: exercises } = useListExercises();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title);
      setDescription(initialData.description || "");
      setCategory(initialData.category);
      setMetric(initialData.metric);
      setTargetValue(initialData.targetValue.toString());
      setSmartGoalType(initialData.smartGoalType || "none");
      setSmartExerciseId(initialData.smartExerciseId?.toString() || "");
      setDeadline(initialData.deadline ? new Date(initialData.deadline).toISOString().split('T')[0] : "");
    } else {
      setTitle("");
      setDescription("");
      setCategory("WORKOUT");
      setMetric("");
      setTargetValue("");
      setSmartGoalType("none");
      setSmartExerciseId("");
      setDeadline("");
    }
  }, [initialData, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload: any = {
        title,
        description: description || undefined,
        category,
        metric,
        targetValue: parseInt(targetValue) || 0,
      };

      if (!initialData) {
        payload.smartGoalType = smartGoalType !== "none" ? smartGoalType : undefined;
        payload.smartExerciseId = smartExerciseId ? parseInt(smartExerciseId) : undefined;
      }
      if (deadline) {
        payload.deadline = new Date(deadline).toISOString();
      }

      await onSubmit(payload);
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ["getGoals"] });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{initialData ? "Edit Goal" : "Create Goal"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="title">Goal Title</Label>
            <Input id="title" value={title} onChange={(e: any) => setTitle(e.target.value)} required placeholder="e.g. Lift 50,000kg" />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={category} onValueChange={(val: any) => setCategory(val)} disabled={!!initialData}>
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="WORKOUT">Workout</SelectItem>
                <SelectItem value="STRENGTH">Strength</SelectItem>
                <SelectItem value="VOLUME">Volume</SelectItem>
                <SelectItem value="NUTRITION">Nutrition</SelectItem>
                <SelectItem value="HYDRATION">Hydration</SelectItem>
                <SelectItem value="SUPPLEMENT">Supplement</SelectItem>
                <SelectItem value="CUSTOM">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="target">Target Value</Label>
              <Input id="target" type="number" value={targetValue} onChange={(e: any) => setTargetValue(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="metric">Unit/Metric</Label>
              <Input id="metric" value={metric} onChange={(e: any) => setMetric(e.target.value)} required placeholder="kg, reps, kcal..." />
            </div>
          </div>

          {!initialData && (
            <div className="space-y-2 p-3 bg-muted/50 rounded-lg border border-border">
              <Label>Smart Tracking Engine</Label>
              <p className="text-xs text-muted-foreground mb-2">Automatically update progress from your logged data.</p>
              <Select value={smartGoalType} onValueChange={setSmartGoalType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select automation" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Manual Tracking Only</SelectItem>
                  <SelectItem value="TOTAL_VOLUME">Total Volume (Workouts)</SelectItem>
                  <SelectItem value="EXERCISE_WEIGHT">Exercise Max Weight</SelectItem>
                  <SelectItem value="WATER_STREAK">Hydration (Total)</SelectItem>
                </SelectContent>
              </Select>

              {smartGoalType === "EXERCISE_WEIGHT" && (
                <div className="mt-3">
                  <Select value={smartExerciseId} onValueChange={setSmartExerciseId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select exercise to track" />
                    </SelectTrigger>
                    <SelectContent>
                      {exercises?.map((ex: any) => (
                        <SelectItem key={ex.id} value={ex.id.toString()}>{ex.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="deadline">Deadline (Optional)</Label>
            <Input id="deadline" type="date" value={deadline} onChange={(e: any) => setDeadline(e.target.value)} />
          </div>
          
          <Button type="submit" className="w-full mt-2" disabled={loading}>
            {loading ? "Saving..." : initialData ? "Update Goal" : "Create Goal"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
