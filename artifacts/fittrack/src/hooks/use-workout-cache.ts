import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetWorkoutQueryKey,
  getListWorkoutsQueryKey,
  getGetWorkoutSummaryQueryKey,
  type WorkoutDetail,
  type WorkoutSet,
  type WorkoutExercise,
} from "@workspace/api-client-react";

/**
 * Lightweight invalidation: only invalidates the workout list and summary.
 * Used when finishing a workout (where list/summary data actually changes).
 */
export function useInvalidateWorkoutQueries() {
  const queryClient = useQueryClient();

  return useCallback(
    (workoutId?: number) => {
      if (workoutId) {
        queryClient.invalidateQueries({ queryKey: getGetWorkoutQueryKey(workoutId) });
      }
      queryClient.invalidateQueries({ queryKey: getListWorkoutsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetWorkoutSummaryQueryKey() });
    },
    [queryClient],
  );
}

/**
 * Invalidate ONLY the single workout detail query.
 * Does NOT touch listWorkouts or workoutSummary since set-level
 * edits don't change the data those queries return.
 */
export function useInvalidateWorkoutDetail() {
  const queryClient = useQueryClient();

  return useCallback(
    (workoutId: number) => {
      queryClient.invalidateQueries({ queryKey: getGetWorkoutQueryKey(workoutId) });
    },
    [queryClient],
  );
}

// ─────────────────────────────────────────────────────────────
// Optimistic cache helpers — mutate the cached WorkoutDetail
// in-place so the UI updates instantly before the network call.
// ─────────────────────────────────────────────────────────────

type WorkoutCache = WorkoutDetail | undefined;

function updateWorkoutCache(
  queryClient: ReturnType<typeof useQueryClient>,
  workoutId: number,
  updater: (prev: WorkoutDetail) => WorkoutDetail,
): WorkoutCache {
  const queryKey = getGetWorkoutQueryKey(workoutId);
  const previous = queryClient.getQueryData<WorkoutDetail>(queryKey);
  if (previous) {
    queryClient.setQueryData<WorkoutDetail>(queryKey, updater(previous));
  }
  return previous;
}

/**
 * Hook returning helpers for optimistic cache mutations on the
 * active workout. Each helper returns a rollback function.
 */
export function useWorkoutOptimisticCache(workoutId: number) {
  const queryClient = useQueryClient();

  const getWorkoutFromCache = useCallback(() => {
    return queryClient.getQueryData<WorkoutDetail>(getGetWorkoutQueryKey(workoutId));
  }, [queryClient, workoutId]);

  /** Optimistically add a set to a workout exercise. */
  const addSetOptimistic = useCallback(
    (weId: number, tempSet: Partial<WorkoutSet> & { setNumber: number }) => {
      const previous = updateWorkoutCache(queryClient, workoutId, (prev) => ({
        ...prev,
        exercises: prev.exercises.map((ex) =>
          ex.id === weId
            ? {
                ...ex,
                sets: [
                  ...ex.sets,
                  {
                    id: -(Date.now()), // temporary negative id
                    completed: false,
                    weight: null,
                    reps: null,
                    setType: "normal" as const,
                    previousWeight: null,
                    previousReps: null,
                    ...tempSet,
                  },
                ],
              }
            : ex,
        ),
      }));
      return () => {
        if (previous) {
          queryClient.setQueryData(getGetWorkoutQueryKey(workoutId), previous);
        }
      };
    },
    [queryClient, workoutId],
  );

  /** Replace the temp set with the real server-returned set. */
  const replaceSetInCache = useCallback(
    (weId: number, tempSetNumber: number, serverSet: WorkoutSet) => {
      updateWorkoutCache(queryClient, workoutId, (prev) => ({
        ...prev,
        exercises: prev.exercises.map((ex) =>
          ex.id === weId
            ? {
                ...ex,
                sets: ex.sets.map((s) =>
                  s.id < 0 && s.setNumber === tempSetNumber ? serverSet : s,
                ),
              }
            : ex,
        ),
      }));
    },
    [queryClient, workoutId],
  );

  /** Optimistically update a set's weight, reps, or completed status. */
  const updateSetOptimistic = useCallback(
    (weId: number, setId: number, data: Partial<Pick<WorkoutSet, "weight" | "reps" | "completed">>) => {
      const previous = updateWorkoutCache(queryClient, workoutId, (prev) => ({
        ...prev,
        exercises: prev.exercises.map((ex) =>
          ex.id === weId
            ? {
                ...ex,
                sets: ex.sets.map((s) =>
                  s.id === setId ? { ...s, ...data } : s,
                ),
              }
            : ex,
        ),
      }));
      return () => {
        if (previous) {
          queryClient.setQueryData(getGetWorkoutQueryKey(workoutId), previous);
        }
      };
    },
    [queryClient, workoutId],
  );

  /** Optimistically remove a set from the cache. */
  const deleteSetOptimistic = useCallback(
    (weId: number, setId: number) => {
      const previous = updateWorkoutCache(queryClient, workoutId, (prev) => ({
        ...prev,
        exercises: prev.exercises.map((ex) =>
          ex.id === weId
            ? {
                ...ex,
                sets: ex.sets.filter((s) => s.id !== setId),
              }
            : ex,
        ),
      }));
      return () => {
        if (previous) {
          queryClient.setQueryData(getGetWorkoutQueryKey(workoutId), previous);
        }
      };
    },
    [queryClient, workoutId],
  );

  /** Optimistically add an exercise to the workout. */
  const addExerciseOptimistic = useCallback(
    (tempExercise: WorkoutExercise) => {
      const previous = updateWorkoutCache(queryClient, workoutId, (prev) => ({
        ...prev,
        exercises: [...prev.exercises, tempExercise],
      }));
      return () => {
        if (previous) {
          queryClient.setQueryData(getGetWorkoutQueryKey(workoutId), previous);
        }
      };
    },
    [queryClient, workoutId],
  );

  /** Optimistically remove an exercise from the workout. */
  const removeExerciseOptimistic = useCallback(
    (weId: number) => {
      const previous = updateWorkoutCache(queryClient, workoutId, (prev) => ({
        ...prev,
        exercises: prev.exercises.filter((ex) => ex.id !== weId),
      }));
      return () => {
        if (previous) {
          queryClient.setQueryData(getGetWorkoutQueryKey(workoutId), previous);
        }
      };
    },
    [queryClient, workoutId],
  );

  /** Optimistically update workout-level fields (notes, name, etc). */
  const updateWorkoutFieldsOptimistic = useCallback(
    (data: Partial<Pick<WorkoutDetail, "notes" | "name" | "finishedAt" | "isFinished">>) => {
      const previous = updateWorkoutCache(queryClient, workoutId, (prev) => ({
        ...prev,
        ...data,
      }));
      return () => {
        if (previous) {
          queryClient.setQueryData(getGetWorkoutQueryKey(workoutId), previous);
        }
      };
    },
    [queryClient, workoutId],
  );

  return {
    getWorkoutFromCache,
    addSetOptimistic,
    replaceSetInCache,
    updateSetOptimistic,
    deleteSetOptimistic,
    addExerciseOptimistic,
    removeExerciseOptimistic,
    updateWorkoutFieldsOptimistic,
  };
}
