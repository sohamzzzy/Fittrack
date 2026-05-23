import { useState } from "react";
import {
  useListExercises,
  useCreateExercise,
  getListExercisesQueryKey,
  type Exercise,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus } from "lucide-react";
import { CustomExerciseForm, type CustomExerciseFormValues } from "@/components/custom-exercise-form";
import { normalizeExerciseName } from "@/lib/exercise-constants";
import { useToast } from "@/hooks/use-toast";

function apiErrorMessage(err: unknown): string {
  if (err && typeof err === "object" && "message" in err && typeof (err as { message: string }).message === "string") {
    return (err as { message: string }).message;
  }
  return "Something went wrong. Please try again.";
}

type ExerciseSearchPickerProps = {
  search: string;
  onSearchChange: (value: string) => void;
  onSelect: (exercise: Exercise) => void;
  /** When set, shows inline "Create …" when search has no exact match. */
  allowCreateFromSearch?: boolean;
  emptyMessage?: string;
  idPrefix?: string;
};

export function ExerciseSearchPicker({
  search,
  onSearchChange,
  onSelect,
  allowCreateFromSearch = true,
  emptyMessage = "No exercises found.",
  idPrefix = "exercise-picker",
}: ExerciseSearchPickerProps) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const { data: exercises, isLoading, isError } = useListExercises({
    q: search.trim() || undefined,
  });
  const createExercise = useCreateExercise();

  const list = Array.isArray(exercises) ? exercises : [];
  const trimmedSearch = search.trim();
  const hasExactMatch =
    trimmedSearch.length > 0 &&
    list.some((ex) => normalizeExerciseName(ex.name) === normalizeExerciseName(trimmedSearch));
  const showCreateSuggestion = allowCreateFromSearch && trimmedSearch.length > 0 && !hasExactMatch;

  const handleCreate = (values: CustomExerciseFormValues) => {
    setCreateError(null);
    createExercise.mutate(
      { data: values },
      {
        onSuccess: (created) => {
          qc.invalidateQueries({ queryKey: getListExercisesQueryKey() });
          setCreateOpen(false);
          setCreateError(null);
          onSearchChange("");
          toast({ title: "Custom exercise created", description: created.name });
          onSelect(created);
        },
        onError: (err) => {
          const msg = apiErrorMessage(err);
          setCreateError(msg);
          toast({ variant: "destructive", title: "Could not create exercise", description: msg });
        },
      },
    );
  };

  return (
    <>
      <Input
        placeholder="Search exercises..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        data-testid={`${idPrefix}-search`}
        className="mb-2"
      />
      <div className="overflow-y-auto max-h-96 space-y-1">
        {isLoading ? (
          <div className="space-y-2 p-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : isError ? (
          <p className="text-sm text-destructive px-3 py-4" data-testid={`${idPrefix}-load-error`}>
            Could not load exercises.
          </p>
        ) : (
          <>
            {list.map((ex) => (
              <button
                key={ex.id}
                type="button"
                className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-secondary transition-colors"
                onClick={() => onSelect(ex)}
                data-testid={`${idPrefix}-item-${ex.id}`}
              >
                <div className="font-medium text-sm flex items-center gap-2">
                  {ex.name}
                  {ex.isCustom && (
                    <span className="text-[10px] text-muted-foreground border border-border rounded px-1">
                      Custom
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {ex.category} · {ex.muscleGroups?.join(", ") || "—"}
                </div>
              </button>
            ))}
            {showCreateSuggestion && (
              <button
                type="button"
                className="w-full text-left px-3 py-2.5 rounded-lg border border-dashed border-primary/40 hover:bg-primary/5 transition-colors"
                onClick={() => {
                  setCreateError(null);
                  setCreateOpen(true);
                }}
                data-testid={`${idPrefix}-create-from-search`}
              >
                <div className="font-medium text-sm text-primary flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Create &quot;{trimmedSearch}&quot;
                </div>
                <div className="text-xs text-muted-foreground">Add as a custom exercise</div>
              </button>
            )}
            {list.length === 0 && !showCreateSuggestion && (
              <p className="text-sm text-muted-foreground text-center py-6" data-testid={`${idPrefix}-empty`}>
                {emptyMessage}
              </p>
            )}
          </>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-card border-card-border">
          <DialogHeader>
            <DialogTitle>Add Custom Exercise</DialogTitle>
          </DialogHeader>
          <CustomExerciseForm
            key={trimmedSearch}
            formId={`${idPrefix}-create-form`}
            initialName={trimmedSearch}
            onSubmit={handleCreate}
            isSubmitting={createExercise.isPending}
            errorMessage={createError}
            idPrefix={`${idPrefix}-create-form`}
          />
          <DialogFooter>
            <Button variant="ghost" type="button" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              form={`${idPrefix}-create-form`}
              className="font-bold"
              disabled={createExercise.isPending}
              data-testid={`${idPrefix}-create-submit`}
            >
              {createExercise.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
