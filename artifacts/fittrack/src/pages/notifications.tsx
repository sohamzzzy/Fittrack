import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { Bell, Check, CheckCheck, Trash2, X, Heart, MessageCircle, UserPlus, AlertCircle } from "lucide-react";
import {
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useDeleteNotification,
  useClearNotifications,
} from "@workspace/api-client-react";
import type { AppNotification, NotificationType } from "@workspace/api-client-react";
import { useLiveNotifications, useLiveUnreadCount } from "@/hooks/use-live-notifications";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getNotificationIcon(type: NotificationType) {
  switch (type) {
    case "new_follower": return <UserPlus className="w-4 h-4 text-blue-400" />;
    case "post_liked": return <Heart className="w-4 h-4 text-rose-400" />;
    case "post_commented": return <MessageCircle className="w-4 h-4 text-emerald-400" />;
    default: return <AlertCircle className="w-4 h-4 text-muted-foreground" />;
  }
}

function getNotificationHref(n: AppNotification): string {
  if (n.entityType === "post") return "/feed";
  if (n.entityType === "user" && n.entityId) return `/profile/${n.entityId}`;
  if (n.entityType === "workout" && n.entityId) return `/workouts/${n.entityId}`;
  return "#";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Notifications() {
  const [, navigate] = useLocation();
  const { data: notifications, isLoading } = useLiveNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const deleteOne = useDeleteNotification();
  const clearAll = useClearNotifications();
  const { data: unreadData } = useLiveUnreadCount();

  const unreadCount = unreadData?.count ?? 0;

  const handleItemClick = (n: AppNotification) => {
    if (!n.isRead) markRead.mutate({ id: n.id });
    const href = getNotificationHref(n);
    if (href !== "#") navigate(href);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-black tracking-tight">Notifications</h1>
          {unreadCount > 0 && (
            <span className="bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="text-xs font-semibold"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
            >
              <CheckCheck className="w-3.5 h-3.5 mr-1" />
              Mark all read
            </Button>
          )}
          {notifications && notifications.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground hover:text-destructive"
              onClick={() => window.confirm("Clear all notifications?") && clearAll.mutate()}
              disabled={clearAll.isPending}
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              Clear all
            </Button>
          )}
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && notifications?.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-24 gap-4 text-center"
        >
          <div className="w-20 h-20 rounded-full bg-muted/30 flex items-center justify-center">
            <Bell className="w-10 h-10 text-muted-foreground/40" />
          </div>
          <div>
            <p className="font-bold text-lg">All caught up!</p>
            <p className="text-sm text-muted-foreground mt-1">
              You have no notifications yet. Follow some users or share a workout to get started.
            </p>
          </div>
        </motion.div>
      )}

      {/* Notification list */}
      <AnimatePresence initial={false}>
        {notifications?.map((n, i) => {
          const href = getNotificationHref(n);
          return (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: 40, transition: { duration: 0.2 } }}
              transition={{ delay: i * 0.03 }}
              className={cn(
                "group relative flex items-start gap-3 p-4 rounded-xl border transition-colors cursor-pointer",
                n.isRead
                  ? "bg-card border-card-border hover:border-primary/20"
                  : "bg-primary/5 border-primary/20 hover:border-primary/40"
              )}
              onClick={() => handleItemClick(n)}
            >
              {/* Unread dot */}
              {!n.isRead && (
                <span className="absolute right-4 top-4 w-2 h-2 rounded-full bg-primary shadow-[0_0_6px] shadow-primary/60" />
              )}

              {/* Actor avatar */}
              <div className="relative shrink-0">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={n.actor?.avatarUrl ?? undefined} />
                  <AvatarFallback className="bg-muted text-muted-foreground text-sm font-bold">
                    {n.actor?.username?.[0]?.toUpperCase() ?? "?"}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute -bottom-1 -right-1 p-0.5 bg-card border border-border rounded-full">
                  {getNotificationIcon(n.type)}
                </span>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pr-8">
                <p className={cn("text-sm leading-snug", !n.isRead && "font-semibold")}>
                  {n.message}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                </p>
              </div>

              {/* Action buttons */}
              <div
                className="absolute right-10 top-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                {!n.isRead && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-7 h-7 text-muted-foreground hover:text-primary"
                    onClick={() => markRead.mutate({ id: n.id })}
                    title="Mark as read"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-3 w-7 h-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => { e.stopPropagation(); deleteOne.mutate({ id: n.id }); }}
                title="Delete"
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
