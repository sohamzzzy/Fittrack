/**
 * Hand-written React Query hooks for the notifications API.
 * Follows the same pattern as the generated api.ts hooks.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  UseMutationOptions,
  UseMutationResult,
  UseQueryOptions,
  UseQueryResult,
} from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";
import type { ErrorType } from "./custom-fetch";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type NotificationType =
  | "new_follower"
  | "post_liked"
  | "post_commented"
  | "mention"
  | "routine_shared"
  | "system";

export interface NotificationActor {
  id: number;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}

export interface AppNotification {
  id: number;
  recipientId: number;
  actorId: number | null;
  type: NotificationType;
  entityId: number | null;
  entityType: string | null;
  message: string;
  isRead: boolean;
  createdAt: string;
  actor: NotificationActor | null;
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const getNotificationsQueryKey = () => ["/api/notifications"] as const;
export const getUnreadCountQueryKey = () => ["/api/notifications/unread-count"] as const;

// ---------------------------------------------------------------------------
// GET /api/notifications
// ---------------------------------------------------------------------------

export function useGetNotifications<TError = ErrorType<unknown>>(
  options?: Partial<UseQueryOptions<AppNotification[], TError>>
): UseQueryResult<AppNotification[], TError> {
  return useQuery({
    queryKey: getNotificationsQueryKey(),
    queryFn: () =>
      customFetch("/api/notifications", { responseType: "json" }) as Promise<AppNotification[]>,
    ...options,
  });
}

// ---------------------------------------------------------------------------
// GET /api/notifications/unread-count
// ---------------------------------------------------------------------------

export function useGetUnreadCount<TError = ErrorType<unknown>>(
  options?: Partial<UseQueryOptions<{ count: number }, TError>>
): UseQueryResult<{ count: number }, TError> {
  return useQuery({
    queryKey: getUnreadCountQueryKey(),
    queryFn: () =>
      customFetch("/api/notifications/unread-count", { responseType: "json" }) as Promise<{ count: number }>,
    refetchInterval: 30_000,
    ...options,
  });
}

// ---------------------------------------------------------------------------
// POST /api/notifications/:id/read
// ---------------------------------------------------------------------------

export function useMarkNotificationRead<TError = ErrorType<unknown>>(
  options?: Partial<UseMutationOptions<unknown, TError, { id: number }>>
): UseMutationResult<unknown, TError, { id: number }> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }) =>
      customFetch(`/api/notifications/${id}/read`, { method: "POST", responseType: "json" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: getNotificationsQueryKey() });
      qc.invalidateQueries({ queryKey: getUnreadCountQueryKey() });
    },
    ...options,
  });
}

// ---------------------------------------------------------------------------
// POST /api/notifications/read-all
// ---------------------------------------------------------------------------

export function useMarkAllNotificationsRead<TError = ErrorType<unknown>>(
  options?: Partial<UseMutationOptions<unknown, TError, void>>
): UseMutationResult<unknown, TError, void> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      customFetch("/api/notifications/read-all", { method: "POST", responseType: "json" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: getNotificationsQueryKey() });
      qc.invalidateQueries({ queryKey: getUnreadCountQueryKey() });
    },
    ...options,
  });
}

// ---------------------------------------------------------------------------
// DELETE /api/notifications/:id
// ---------------------------------------------------------------------------

export function useDeleteNotification<TError = ErrorType<unknown>>(
  options?: Partial<UseMutationOptions<unknown, TError, { id: number }>>
): UseMutationResult<unknown, TError, { id: number }> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }) =>
      customFetch(`/api/notifications/${id}`, { method: "DELETE", responseType: "json" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: getNotificationsQueryKey() });
      qc.invalidateQueries({ queryKey: getUnreadCountQueryKey() });
    },
    ...options,
  });
}

// ---------------------------------------------------------------------------
// DELETE /api/notifications (clear all)
// ---------------------------------------------------------------------------

export function useClearNotifications<TError = ErrorType<unknown>>(
  options?: Partial<UseMutationOptions<unknown, TError, void>>
): UseMutationResult<unknown, TError, void> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      customFetch("/api/notifications", { method: "DELETE", responseType: "json" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: getNotificationsQueryKey() });
      qc.invalidateQueries({ queryKey: getUnreadCountQueryKey() });
    },
    ...options,
  });
}
