import { Router } from "express";
import { getSingleValue } from "../lib/getSingleValue";
import { requireAuth, getAuthUser } from "../lib/auth";
import { db, notificationsTable, usersTable } from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import type { NotificationType } from "@workspace/db";

const router = Router();

// ---------------------------------------------------------------------------
// Shared helper — called from other routes (follow, like, comment)
// ---------------------------------------------------------------------------

export interface CreateNotificationInput {
  recipientId: number;
  actorId?: number | null;
  type: NotificationType;
  entityId?: number | null;
  entityType?: string | null;
  message: string;
}

export async function createNotification(input: CreateNotificationInput): Promise<void> {
  // Never notify yourself
  if (input.actorId != null && input.actorId === input.recipientId) return;

  try {
    await db.insert(notificationsTable).values({
      recipientId: input.recipientId,
      actorId: input.actorId ?? null,
      type: input.type,
      entityId: input.entityId ?? null,
      entityType: input.entityType ?? null,
      message: input.message,
      isRead: false,
    });
  } catch (e) {
    // Never let a notification failure bubble up and break the triggering action
    console.error("[notifications] createNotification failed:", e);
  }
}

// ---------------------------------------------------------------------------
// Format a notification row for the API response
// ---------------------------------------------------------------------------

async function formatNotification(n: typeof notificationsTable.$inferSelect) {
  let actor = null;
  if (n.actorId) {
    const u = await db.query.usersTable.findFirst({ where: eq(usersTable.id, n.actorId) });
    if (u) actor = { id: u.id, username: u.username, displayName: u.displayName, avatarUrl: u.avatarUrl };
  }
  return { ...n, actor };
}

// ---------------------------------------------------------------------------
// GET /api/notifications — list caller's notifications (newest first)
// ---------------------------------------------------------------------------

router.get("/notifications", requireAuth, async (req, res) => {
  try {
    const me = await getAuthUser(req);
    const limit = parseInt(getSingleValue(req.query.limit) ?? "") || 30;
    const offset = parseInt(getSingleValue(req.query.offset) ?? "") || 0;
    const rows = await db
      .select()
      .from(notificationsTable)
      .where(eq(notificationsTable.recipientId, me.id))
      .orderBy(desc(notificationsTable.createdAt))
      .limit(limit)
      .offset(offset);
    const result = await Promise.all(rows.map(formatNotification));
    res.json(result);
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// GET /api/notifications/unread-count
// ---------------------------------------------------------------------------

router.get("/notifications/unread-count", requireAuth, async (req, res) => {
  try {
    const me = await getAuthUser(req);
    const [row] = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(notificationsTable)
      .where(and(eq(notificationsTable.recipientId, me.id), eq(notificationsTable.isRead, false)));
    res.json({ count: row?.count ?? 0 });
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// POST /api/notifications/:id/read — mark one as read
// ---------------------------------------------------------------------------

router.post("/notifications/:id/read", requireAuth, async (req, res) => {
  try {
    const me = await getAuthUser(req);
    const idParam = getSingleValue(req.params.id);
    if (!idParam) { res.status(400).json({ error: "Missing id" }); return; }
    const id = parseInt(idParam);
    await db
      .update(notificationsTable)
      .set({ isRead: true })
      .where(and(eq(notificationsTable.id, id), eq(notificationsTable.recipientId, me.id)));
    res.json({ ok: true });
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// POST /api/notifications/read-all — mark all as read
// ---------------------------------------------------------------------------

router.post("/notifications/read-all", requireAuth, async (req, res) => {
  try {
    const me = await getAuthUser(req);
    await db
      .update(notificationsTable)
      .set({ isRead: true })
      .where(eq(notificationsTable.recipientId, me.id));
    res.json({ ok: true });
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/notifications/:id — delete one
// ---------------------------------------------------------------------------

router.delete("/notifications/:id", requireAuth, async (req, res) => {
  try {
    const me = await getAuthUser(req);
    const idParam = getSingleValue(req.params.id);
    if (!idParam) { res.status(400).json({ error: "Missing id" }); return; }
    const id = parseInt(idParam);
    await db
      .delete(notificationsTable)
      .where(and(eq(notificationsTable.id, id), eq(notificationsTable.recipientId, me.id)));
    res.status(204).send();
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/notifications — clear all
// ---------------------------------------------------------------------------

router.delete("/notifications", requireAuth, async (req, res) => {
  try {
    const me = await getAuthUser(req);
    await db.delete(notificationsTable).where(eq(notificationsTable.recipientId, me.id));
    res.status(204).send();
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
