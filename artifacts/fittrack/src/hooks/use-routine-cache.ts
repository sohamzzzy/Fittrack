import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getListRoutinesQueryKey, getGetRoutineQueryKey } from "@workspace/api-client-react";

export function useInvalidateRoutines() {
  const queryClient = useQueryClient();

  return useCallback(
    (routineId?: number) => {
      queryClient.invalidateQueries({ queryKey: getListRoutinesQueryKey() });
      if (routineId) {
        queryClient.invalidateQueries({ queryKey: getGetRoutineQueryKey(routineId) });
      }
    },
    [queryClient],
  );
}
