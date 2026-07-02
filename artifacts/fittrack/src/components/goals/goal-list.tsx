import { Goal } from "@workspace/api-client-react";
import { GoalCard } from "./goal-card";
import { Target } from "lucide-react";

export function GoalList({ goals, onEdit, onDelete }: { goals: Goal[], onEdit: (g: Goal) => void, onDelete: (g: Goal) => void }) {
  if (goals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground border rounded-lg border-dashed">
        <Target className="h-12 w-12 mb-4 opacity-20" />
        <h3 className="text-lg font-medium text-foreground">No goals found</h3>
        <p className="text-sm">Create a goal to start tracking your progress.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {goals.map(goal => (
        <GoalCard 
          key={goal.id} 
          goal={goal} 
          onEdit={() => onEdit(goal)}
          onDelete={() => onDelete(goal)}
        />
      ))}
    </div>
  );
}
