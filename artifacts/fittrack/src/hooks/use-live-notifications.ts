import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetNotifications,
  useGetUnreadCount,
  getNotificationsQueryKey,
  getUnreadCountQueryKey,
} from "@workspace/api-client-react";

/**
 * A wrapper hook around useGetNotifications that enables background polling.
 * This is isolated so it can be easily replaced with WebSockets/Realtime later.
 */
export function useLiveNotifications() {
  return useGetNotifications({
    // Orval wraps React Query hooks and passes the options down.
    // However, our hand-written useGetNotifications in notifications.ts expects React Query options directly.
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}

/**
 * A wrapper hook around useGetUnreadCount that enables background polling.
 */
export function useLiveUnreadCount() {
  return useGetUnreadCount({
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}

/**
 * A hook to initialize global mutation listeners for optimistic updates.
 * Call this once at the root of your application (e.g., in App.tsx or Layout).
 */
export function useNotificationOptimisticUpdates() {
  const qc = useQueryClient();

  useEffect(() => {
    const unsubscribe = qc.getMutationCache().subscribe((event) => {
      if (event.type === "updated" && event.action.type === "success") {
        const mutationKey = event.mutation.options.mutationKey;
        if (mutationKey && Array.isArray(mutationKey) && typeof mutationKey[0] === "string") {
          const key = mutationKey[0];
          const triggers = [
            "followUser",
            "unfollowUser",
            "likePost",
            "unlikePost",
            "commentPost",
            "createPost",
          ];
          
          if (triggers.includes(key)) {
            // Optimistically invalidate to fetch fresh notifications right after an action
            qc.invalidateQueries({ queryKey: getUnreadCountQueryKey() });
            qc.invalidateQueries({ queryKey: getNotificationsQueryKey() });
          }
        }
      }
    });

    return () => unsubscribe();
  }, [qc]);
}
