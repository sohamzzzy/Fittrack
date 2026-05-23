import { useState } from "react";
import { Link } from "wouter";
import {
  useListRoutines, useCreateRoutine, useDeleteRoutine, useListExercises,
  getListRoutinesQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Dumbbell, Plus, Trash2, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

export default function Routines() {
  const { data: routines, isLoading } = useListRoutines();
  const createRoutine = useCreateRoutine();
  const deleteRoutine = useDeleteRoutine();
  const qc = useQueryClient();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const handleCreate = () => {
    if (!name.trim()) return;
    createRoutine.mutate({ data: { name, description } }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListRoutinesQueryKey() });
        setOpen(false);
        setName("");
        setDescription("");
        toast({ title: "Routine created" });
      },
    });
  };

  const handleDelete = (id: number) => {
    deleteRoutine.mutate({ routineId: id }, {
      onSuccess: () => qc.invalidateQueries({ queryKey: getListRoutinesQueryKey() }),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black tracking-tight">Routines</h1>
        <Button size="sm" className="font-bold" onClick={() => setOpen(true)} data-testid="button-create-routine">
          <Plus className="w-4 h-4 mr-1" /> New
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[0,1,2].map(i => <Skeleton key={i} className="h-24" />)}</div>
      ) : routines && routines.length > 0 ? (
        <div className="space-y-3">
          {routines.map((r, i) => (
            <motion.div key={r.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="bg-card border-card-border hover:border-primary/30 transition-colors">
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-base mb-1">{r.name}</h3>
                      {r.description && <p className="text-xs text-muted-foreground mb-2">{r.description}</p>}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Dumbbell className="w-3.5 h-3.5" />
                        <span>{r.exerciseCount} exercises</span>
                      </div>
                      {r.exercises && r.exercises.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">{r.exercises.map((e) => e.exerciseName).join(", ")}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 ml-2 shrink-0">
                      <Button variant="ghost" size="icon" className="text-muted-foreground w-7 h-7 hover:text-destructive" onClick={() => handleDelete(r.id)} data-testid={`button-delete-routine-${r.id}`}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
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
              <p className="text-sm text-muted-foreground">Create a template to keep your training consistent.</p>
            </div>
            <Button className="font-bold" onClick={() => setOpen(true)}>Create Routine</Button>
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-card border-card-border">
          <DialogHeader><DialogTitle>New Routine</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Routine name (e.g. Push Day)" value={name} onChange={(e) => setName(e.target.value)} data-testid="input-routine-name" />
            <Input placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} data-testid="input-routine-description" />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!name.trim() || createRoutine.isPending} className="font-bold" data-testid="button-save-routine">
              {createRoutine.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
