import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetWorkoutQueryKey,
  getListWorkoutsQueryKey,
  getGetWorkoutSummaryQueryKey,
} from "@workspace/api-client-react";

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
