import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useListRoutines, useDeleteRoutine, type Routine } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dumbbell, Plus, Trash2, Pencil, Play } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { RoutineFormDialog } from "@/components/routines/routine-form-dialog";
import { useInvalidateRoutines } from "@/hooks/use-routine-cache";

export default function Routines() {
  const [, setLocation] = useLocation();
  const { data: routines, isLoading } = useListRoutines();
  const deleteRoutine = useDeleteRoutine();
  const invalidate = useInvalidateRoutines();
  const { toast } = useToast();

  const [formOpen, setFormOpen] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState<Routine | null>(null);

  const openCreate = () => {
    setEditingRoutine(null);
    setFormOpen(true);
  };

  const openEdit = (routine: Routine) => {
    setEditingRoutine(routine);
    setFormOpen(true);
  };

  const handleDelete = (id: number) => {
    deleteRoutine.mutate(
      { routineId: id },
      {
        onSuccess: () => {
          invalidate(id);
          toast({ title: "Routine deleted" });
        },
      },
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black tracking-tight">Routines</h1>
        <Button size="sm" className="font-bold" onClick={openCreate} data-testid="button-create-routine">
          <Plus className="w-4 h-4 mr-1" /> New
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : routines && routines.length > 0 ? (
        <div className="space-y-3">
          {routines.map((r, i) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="bg-card border-card-border hover:border-primary/30 transition-colors">
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-base mb-1">{r.name}</h3>
                      {r.description && (
                        <p className="text-xs text-muted-foreground mb-2">{r.description}</p>
                      )}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Dumbbell className="w-3.5 h-3.5" />
                        <span>{r.exerciseCount ?? r.exercises?.length ?? 0} exercises</span>
                      </div>
                      {r.exercises && r.exercises.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          {r.exercises.map((e) => e.exerciseName).join(", ")}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      <Button
                        size="sm"
                        className="font-bold h-8"
                        onClick={() => setLocation(`/workout?routineId=${r.id}`)}
                        data-testid={`button-start-routine-${r.id}`}
                      >
                        <Play className="w-3.5 h-3.5 mr-1" /> Start
                      </Button>
                      <div className="flex gap-1 justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-7 h-7 text-muted-foreground"
                          onClick={() => openEdit(r)}
                          data-testid={`button-edit-routine-${r.id}`}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-7 h-7 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDelete(r.id)}
                          data-testid={`button-delete-routine-${r.id}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        <Card className="bg-card border-card-border">
          <CardContent className="py-16 flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Dumbbell className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-lg mb-1">No routines yet</h3>
              <p className="text-sm text-muted-foreground">
                Create a template with exercises, sets, and reps.
              </p>
            </div>
            <Button className="font-bold" onClick={openCreate}>
              Create Routine
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="text-center">
        <Link href="/workout">
          <Button variant="link" className="text-muted-foreground text-sm">
            Back to Start Workout
          </Button>
        </Link>
      </div>

      <RoutineFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        routine={editingRoutine}
        onSaved={() => invalidate(editingRoutine?.id)}
      />
    </div>
  );
}
