import { useState } from "react";
import { Link } from "wouter";
import {
  useListExercises,
  useCreateExercise,
  useArchiveExercise,
  getListExercisesQueryKey,
  type Exercise,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dumbbell, Plus, ChevronRight, Search, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { CustomExerciseForm, type CustomExerciseFormValues } from "@/components/custom-exercise-form";
import { EXERCISE_CATEGORIES, CATEGORY_COLORS } from "@/lib/exercise-constants";

function apiErrorMessage(err: unknown): string {
  if (err && typeof err === "object" && "message" in err && typeof (err as { message: string }).message === "string") {
    return (err as { message: string }).message;
  }
  return "Something went wrong. Please try again.";
}

export default function Exercises() {
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Exercise | null>(null);
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: exercises, isLoading, isError, refetch, isFetching } = useListExercises({
    q: search || undefined,
    category: filterCat !== "all" ? filterCat : undefined,
  });
  const createExercise = useCreateExercise();
  const archiveExercise = useArchiveExercise();

  const handleCreate = (values: CustomExerciseFormValues) => {
    setCreateError(null);
    createExercise.mutate(
      { data: values },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListExercisesQueryKey() });
          setOpen(false);
          setCreateError(null);
          toast({ title: "Custom exercise created" });
        },
        onError: (err) => {
          const msg = apiErrorMessage(err);
          setCreateError(msg);
          toast({ variant: "destructive", title: "Could not create exercise", description: msg });
        },
      },
    );
  };

  const handleArchive = () => {
    if (!archiveTarget) return;
    archiveExercise.mutate(
      { exerciseId: archiveTarget.id },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListExercisesQueryKey() });
          setArchiveTarget(null);
          toast({ title: "Exercise removed", description: "Past workouts still keep this exercise." });
        },
        onError: (err) => {
          toast({ variant: "destructive", title: "Could not remove exercise", description: apiErrorMessage(err) });
        },
      },
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black tracking-tight">Exercises</h1>
        <Button size="sm" className="font-bold" onClick={() => { setCreateError(null); setOpen(true); }} data-testid="button-create-exercise">
          <Plus className="w-4 h-4 mr-1" /> Add Custom Exercise
        </Button>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search exercises..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="input-exercise-search"
          />
        </div>
        <Select value={filterCat} onValueChange={setFilterCat}>
          <SelectTrigger className="w-36" data-testid="select-category-filter">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {EXERCISE_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16" />)}</div>
      ) : isError ? (
        <Card className="bg-card border-card-border">
          <CardContent className="py-8 text-center space-y-3">
            <p className="text-muted-foreground">Could not load exercises.</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : exercises && exercises.length > 0 ? (
        <div className="space-y-2">
          {isFetching && !isLoading && (
            <p className="text-xs text-muted-foreground text-center">Updating…</p>
          )}
          {exercises.map((ex, i) => (
            <motion.div key={ex.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}>
              <Card className="bg-card border-card-border hover:border-primary/30 transition-colors" data-testid={`card-exercise-${ex.id}`}>
                <CardContent className="py-3 px-4 flex items-center justify-between gap-2">
                  <Link href={`/exercises/${ex.id}`} className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-sm">{ex.name}</span>
                      {ex.isCustom && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
                          Custom
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${CATEGORY_COLORS[ex.category] ?? ""}`}>
                        {ex.category}
                      </Badge>
                      {ex.muscleGroups?.slice(0, 2).map((m) => (
                        <span key={m} className="text-[10px] text-muted-foreground">
                          {m}
                        </span>
                      ))}
                    </div>
                  </Link>
                  <div className="flex items-center gap-1 shrink-0">
                    {ex.isCustom && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-8 h-8 text-muted-foreground hover:text-destructive"
                        onClick={() => setArchiveTarget(ex)}
                        data-testid={`button-archive-exercise-${ex.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                    <Link href={`/exercises/${ex.id}`}>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        <Card className="bg-card border-card-border">
          <CardContent className="py-12 text-center text-muted-foreground space-y-3">
            <Dumbbell className="w-10 h-10 mx-auto opacity-40" />
            <p>{search ? `No exercises found for "${search}"` : "No exercises yet."}</p>
            <Button size="sm" variant="outline" onClick={() => { setCreateError(null); setOpen(true); }}>
              Add Custom Exercise
            </Button>
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-card border-card-border">
          <DialogHeader>
            <DialogTitle>Add Custom Exercise</DialogTitle>
          </DialogHeader>
          <CustomExerciseForm
            formId="exercises-page-create-form"
            onSubmit={handleCreate}
            isSubmitting={createExercise.isPending}
            errorMessage={createError}
            idPrefix="exercises-page-create"
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="exercises-page-create-form"
              disabled={createExercise.isPending}
              className="font-bold"
              data-testid="button-save-exercise"
            >
              {createExercise.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!archiveTarget} onOpenChange={(v) => !v && setArchiveTarget(null)}>
        <AlertDialogContent className="bg-card border-card-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove custom exercise?</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{archiveTarget?.name}&quot; will be hidden from your library. Past workouts and history are kept.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleArchive}
              disabled={archiveExercise.isPending}
            >
              {archiveExercise.isPending ? "Removing..." : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
