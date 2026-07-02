import { Goal } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { format, differenceInDays } from "date-fns";
import { Dumbbell, Utensils, Droplets, Target, MoreVertical, Pencil, Trash } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export function GoalCard({ goal, onEdit, onDelete }: { goal: Goal, onEdit: () => void, onDelete: () => void }) {
  const percentage = Math.min(Math.round((goal.currentValue / goal.targetValue) * 100), 100);
  const isCompleted = goal.status === "COMPLETED";

  const getIcon = () => {
    switch (goal.category) {
      case "WORKOUT":
      case "STRENGTH":
      case "VOLUME": return <Dumbbell className="h-4 w-4" />;
      case "NUTRITION": return <Utensils className="h-4 w-4" />;
      case "HYDRATION": return <Droplets className="h-4 w-4" />;
      default: return <Target className="h-4 w-4" />;
    }
  };

  const daysRemaining = goal.deadline ? differenceInDays(new Date(goal.deadline), new Date()) : null;

  return (
    <Card className={`relative overflow-hidden transition-all ${isCompleted ? 'border-green-500/50 bg-green-500/5' : ''}`}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-md ${isCompleted ? 'bg-green-500/20 text-green-600' : 'bg-primary/10 text-primary'}`}>
              {getIcon()}
            </div>
            <div>
              <CardTitle className="text-base">{goal.title}</CardTitle>
              <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                <span className="capitalize">{goal.category.toLowerCase()}</span>
                {goal.deadline && !isCompleted && (
                  <>
                    <span>•</span>
                    <span className={daysRemaining !== null && daysRemaining < 3 ? "text-red-500" : ""}>
                      {daysRemaining} days left
                    </span>
                  </>
                )}
                {isCompleted && goal.completedAt && (
                  <>
                    <span>•</span>
                    <span className="text-green-600">Completed {format(new Date(goal.completedAt), "MMM d, yyyy")}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit Goal
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="text-red-600">
                <Trash className="h-4 w-4 mr-2" />
                Delete Goal
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      
      <CardContent>
        {goal.description && <p className="text-sm text-muted-foreground mb-4">{goal.description}</p>}
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium">{goal.currentValue.toLocaleString()} / {goal.targetValue.toLocaleString()} {goal.metric}</span>
            <span className="font-medium">{percentage}%</span>
          </div>
          <Progress value={percentage} className={isCompleted ? "[&>div]:bg-green-500" : ""} />
        </div>
      </CardContent>
    </Card>
  );
}
