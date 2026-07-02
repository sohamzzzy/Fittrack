import { useState, useMemo } from "react";
import { useGetGoals, useCreateGoal, useUpdateGoal, useDeleteGoal, Goal, CreateGoalRequest, UpdateGoalRequest } from "@workspace/api-client-react";
import { GoalsOverview } from "@/components/goals/goals-overview";
import { GoalList } from "@/components/goals/goal-list";
import { GoalDialog } from "@/components/goals/goal-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import confetti from "canvas-confetti";

export function GoalsPage() {
  const { data: goals = [], isLoading } = useGetGoals();
  const { mutateAsync: createGoal } = useCreateGoal();
  const { mutateAsync: updateGoal } = useUpdateGoal();
  const { mutateAsync: deleteGoal } = useDeleteGoal();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  const activeGoals = useMemo(() => goals.filter(g => g.status === "ACTIVE"), [goals]);
  const completedGoals = useMemo(() => goals.filter(g => g.status === "COMPLETED"), [goals]);

  const handleOpenCreate = () => {
    setEditingGoal(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (goal: Goal) => {
    setEditingGoal(goal);
    setDialogOpen(true);
  };

  const handleSubmit = async (payload: CreateGoalRequest | UpdateGoalRequest) => {
    try {
      if (editingGoal) {
        await updateGoal({ id: editingGoal.id, data: payload as UpdateGoalRequest });
        toast({ title: "Goal updated successfully" });
      } else {
        await createGoal({ data: payload as CreateGoalRequest });
        toast({ title: "Goal created successfully" });
      }
      queryClient.invalidateQueries({ queryKey: ["getGoals"] });
    } catch (err) {
      toast({ title: "Error saving goal", variant: "destructive" });
    }
  };

  const handleDelete = async (goal: Goal) => {
    if (confirm("Are you sure you want to delete this goal?")) {
      try {
        await deleteGoal({ id: goal.id });
        toast({ title: "Goal deleted" });
        queryClient.invalidateQueries({ queryKey: ["getGoals"] });
      } catch (err) {
        toast({ title: "Error deleting goal", variant: "destructive" });
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-100px)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container max-w-6xl mx-auto p-4 md:p-6 space-y-8 animate-in fade-in duration-500 pb-24">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Goals</h1>
          <p className="text-muted-foreground">Set targets, track progress, and crush your milestones.</p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="mr-2 h-4 w-4" /> New Goal
        </Button>
      </div>

      <GoalsOverview goals={goals} />

      <Tabs defaultValue="active" className="w-full">
        <div className="flex justify-between items-center mb-6">
          <TabsList>
            <TabsTrigger value="active">Active Goals</TabsTrigger>
            <TabsTrigger value="completed">Completed History</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="active" className="mt-0">
          <GoalList goals={activeGoals} onEdit={handleOpenEdit} onDelete={handleDelete} />
        </TabsContent>

        <TabsContent value="completed" className="mt-0">
          <GoalList goals={completedGoals} onEdit={handleOpenEdit} onDelete={handleDelete} />
        </TabsContent>
      </Tabs>
      
      <GoalDialog 
        open={dialogOpen} 
        onOpenChange={setDialogOpen} 
        initialData={editingGoal} 
        onSubmit={handleSubmit} 
      />
    </div>
  );
}
