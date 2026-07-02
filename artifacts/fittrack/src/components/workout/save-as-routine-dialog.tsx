import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSaveWorkoutAsRoutine, useListRoutines, getListRoutinesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";

export function SaveAsRoutineDialog({ 
  workoutId, 
  workoutName,
  workoutStartedAt,
  open, 
  onOpenChange 
}: { 
  workoutId: number; 
  workoutName: string;
  workoutStartedAt: string;
  open: boolean; 
  onOpenChange: (o: boolean) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [conflictRoutineId, setConflictRoutineId] = useState<number | null>(null);
  
  useEffect(() => {
    if (open) {
      if (workoutName.toLowerCase().includes("workout")) {
        setName(`Workout - ${format(new Date(workoutStartedAt), "MMM d")}`);
      } else {
        setName(workoutName);
      }
      setDescription("");
      setConflictRoutineId(null);
    }
  }, [open, workoutName, workoutStartedAt]);

  const { data: routines } = useListRoutines({ query: { enabled: open, queryKey: getListRoutinesQueryKey() } });
  const saveMutation = useSaveWorkoutAsRoutine();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const handleInitialSubmit = () => {
    if (!name.trim()) {
      toast.error("Routine name is required");
      return;
    }
    const existing = routines?.find(r => r.name.toLowerCase() === name.trim().toLowerCase());
    if (existing) {
      setConflictRoutineId(existing.id);
    } else {
      doSave(undefined);
    }
  };

  const doSave = (overwriteId?: number) => {
    saveMutation.mutate(
      { workoutId, data: { name: name.trim(), description: description.trim() || undefined, overwriteRoutineId: overwriteId } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListRoutinesQueryKey() });
          toast.success("Saved as routine");
          onOpenChange(false);
          setLocation("/routines");
        },
        onError: (err: any) => {
          toast.error(err.response?.data?.error || "Failed to save routine");
        }
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { setConflictRoutineId(null); }; onOpenChange(v); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save as Routine</DialogTitle>
        </DialogHeader>
        
        {conflictRoutineId ? (
          <div className="space-y-4 py-4">
            <DialogDescription className="text-base text-foreground">
              A routine named <span className="font-bold">"{name.trim()}"</span> already exists. What would you like to do?
            </DialogDescription>
            <div className="flex flex-col gap-2">
              <Button onClick={() => doSave(conflictRoutineId)} disabled={saveMutation.isPending} variant="default">
                {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Replace Existing
              </Button>
              <Button onClick={() => doSave(undefined)} disabled={saveMutation.isPending} variant="secondary">
                {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create a Copy
              </Button>
              <Button onClick={() => setConflictRoutineId(null)} disabled={saveMutation.isPending} variant="outline">
                Rename
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Routine Name</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Push Day" />
            </div>
            <div className="space-y-2">
              <Label>Description (Optional)</Label>
              <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. Focus on chest and triceps" />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={handleInitialSubmit} disabled={!name.trim() || saveMutation.isPending}>
                {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
