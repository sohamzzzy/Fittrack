import { useState } from "react";
import { Link } from "wouter";
import { useListExercises, useDeleteExercise } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { Plus, ChevronRight, Search, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { EXERCISE_CATEGORIES, CATEGORY_COLORS } from "@/lib/exercise-constants";
import { CreateExerciseDialog } from "@/components/exercises/create-exercise-dialog";
import { useInvalidateExercises } from "@/hooks/use-exercise-cache";
import { apiErrorMessage } from "@/lib/api-errors";

export default function Exercises() {
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState<string>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const { toast } = useToast();
  const invalidate = useInvalidateExercises();
  const deleteExercise = useDeleteExercise();

  const { data: exercises, isLoading } = useListExercises({
    q: search || undefined,
    category: filterCat !== "all" ? filterCat : undefined,
  });

  const handleDelete = () => {
    if (deleteId == null) return;
    deleteExercise.mutate(
      { exerciseId: deleteId },
      {
        onSuccess: () => {
          invalidate(deleteId);
          toast({ title: "Exercise deleted" });
          setDeleteId(null);
        },
        onError: (err) => {
          toast({
            variant: "destructive",
            title: "Could not delete exercise",
            description: apiErrorMessage(err),
          });
          setDeleteId(null);
        },
      },
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black tracking-tight">Exercises</h1>
        <Button size="sm" className="font-bold" onClick={() => setCreateOpen(true)} data-testid="button-create-exercise">
          <Plus className="w-4 h-4 mr-1" /> New
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
        <div className="space-y-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : exercises && exercises.length > 0 ? (
        <div className="space-y-2">
          {exercises.map((ex, i) => (
            <motion.div
              key={ex.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.02 }}
            >
              <Card
                className="bg-card border-card-border hover:border-primary/30 transition-colors"
                data-testid={`card-exercise-${ex.id}`}
              >
                <CardContent className="py-3 px-4 flex items-center justify-between gap-2">
                  <Link href={`/exercises/${ex.id}`} className="flex-1 min-w-0">
                    <div className="cursor-pointer">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm">{ex.name}</span>
                        {ex.isCustom && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
                            Custom
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-1.5 py-0 ${CATEGORY_COLORS[ex.category] ?? ""}`}
                        >
                          {ex.category}
                        </Badge>
                        {ex.muscleGroups?.slice(0, 2).map((m) => (
                          <span key={m} className="text-[10px] text-muted-foreground">
                            {m}
                          </span>
                        ))}
                      </div>
                    </div>
                  </Link>
                  <div className="flex items-center gap-1 shrink-0">
                    {ex.isCustom && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-8 h-8 text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleteId(ex.id)}
                        data-testid={`button-delete-exercise-${ex.id}`}
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
          <CardContent className="py-12 text-center text-muted-foreground">
            {search ? `No exercises found for "${search}"` : "No exercises. Create your own!"}
          </CardContent>
        </Card>
      )}

      <CreateExerciseDialog open={createOpen} onOpenChange={setCreateOpen} />

      <AlertDialog open={deleteId != null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="bg-card border-card-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete custom exercise?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. Exercises used in workouts or routines cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteExercise.isPending}
            >
              {deleteExercise.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
