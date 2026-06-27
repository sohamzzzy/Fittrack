import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getListExercisesQueryKey, getGetExerciseQueryKey } from "@workspace/api-client-react";

export function useInvalidateExercises() {
  const queryClient = useQueryClient();

  return useCallback(
    (exerciseId?: number) => {
      queryClient.invalidateQueries({ queryKey: getListExercisesQueryKey() });
      if (exerciseId) {
        queryClient.invalidateQueries({ queryKey: getGetExerciseQueryKey(exerciseId) });
      }
    },
    [queryClient],
  );
}
