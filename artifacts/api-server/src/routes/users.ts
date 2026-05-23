import { Router } from "express";
import { getSingleValue } from "../lib/getSingleValue";
import { requireAuth, getAuthUser, getOrCreateUser } from "../lib/auth";
import { db, usersTable, followsTable, workoutsTable, postsTable } from "@workspace/db";
import { eq, and, count, sql } from "drizzle-orm";

const router = Router();

router.get("/users/me", requireAuth, async (req, res) => {
  try {
    const clerkId = (req as any).clerkId;
    const user = await getOrCreateUser(clerkId);
    const [followers] = await db.select({ c: count() }).from(followsTable).where(eq(followsTable.followingId, user.id));
    const [following] = await db.select({ c: count() }).from(followsTable).where(eq(followsTable.followerId, user.id));
    res.json({
      ...user,
      followersCount: Number(followers.c),
      followingCount: Number(following.c),
      isFollowing: false,
    });
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/users/me", requireAuth, async (req, res) => {
  try {
    const user = await getAuthUser(req);
    const { username, displayName, bio, avatarUrl } = req.body;
    const [updated] = await db
      .update(usersTable)
      .set({ username, displayName, bio, avatarUrl })
      .where(eq(usersTable.id, user.id))
      .returning();
    const [followers] = await db.select({ c: count() }).from(followsTable).where(eq(followsTable.followingId, user.id));
    const [following] = await db.select({ c: count() }).from(followsTable).where(eq(followsTable.followerId, user.id));
    res.json({ ...updated, followersCount: Number(followers.c), followingCount: Number(following.c), isFollowing: false });
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/users/me/stats", requireAuth, async (req, res) => {
  try {
    const user = await getAuthUser(req);
    const [wCount] = await db.select({ c: count() }).from(workoutsTable).where(and(eq(workoutsTable.userId, user.id), eq(workoutsTable.isFinished, true)));
    const [followers] = await db.select({ c: count() }).from(followsTable).where(eq(followsTable.followingId, user.id));
    const [following] = await db.select({ c: count() }).from(followsTable).where(eq(followsTable.followerId, user.id));
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const [weekCount] = await db.select({ c: count() }).from(workoutsTable).where(and(eq(workoutsTable.userId, user.id), eq(workoutsTable.isFinished, true), sql`${workoutsTable.startedAt} > ${weekAgo}`));
    const [monthCount] = await db.select({ c: count() }).from(workoutsTable).where(and(eq(workoutsTable.userId, user.id), eq(workoutsTable.isFinished, true), sql`${workoutsTable.startedAt} > ${monthAgo}`));
    res.json({
      totalWorkouts: Number(wCount.c),
      totalVolume: 0,
      currentStreak: 0,
      totalFollowers: Number(followers.c),
      totalFollowing: Number(following.c),
      thisWeekWorkouts: Number(weekCount.c),
      thisMonthWorkouts: Number(monthCount.c),
    });
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/users/search", requireAuth, async (req, res) => {
  try {
    const user = await getAuthUser(req);
    const q = getSingleValue(req.query.q) ?? "";
    const users = await db.select().from(usersTable).where(sql`lower(${usersTable.username}) like lower(${"%" + q + "%"})`).limit(20);
    const followingRows = await db.select({ followingId: followsTable.followingId }).from(followsTable).where(eq(followsTable.followerId, user.id));
    const followingIds = new Set(followingRows.map((r) => r.followingId));
    const result = await Promise.all(
      users.map(async (u) => {
        const [fl] = await db.select({ c: count() }).from(followsTable).where(eq(followsTable.followingId, u.id));
        const [fg] = await db.select({ c: count() }).from(followsTable).where(eq(followsTable.followerId, u.id));
        return { ...u, followersCount: Number(fl.c), followingCount: Number(fg.c), isFollowing: followingIds.has(u.id) };
      })
    );
    res.json(result);
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/users/:userId", requireAuth, async (req, res) => {
  try {
    const me = await getAuthUser(req);
    const userIdParam = getSingleValue(req.params.userId);
    if (!userIdParam) {
      res.status(400).json({ error: "Missing user id" });
      return;
    }
    const userId = parseInt(userIdParam);
    const user = await db.query.usersTable.findFirst({ where: eq(usersTable.id, userId) });
    if (!user) { res.status(404).json({ error: "Not found" }); return; }
    const [fl] = await db.select({ c: count() }).from(followsTable).where(eq(followsTable.followingId, userId));
    const [fg] = await db.select({ c: count() }).from(followsTable).where(eq(followsTable.followerId, userId));
    const followRow = await db.query.followsTable.findFirst({ where: and(eq(followsTable.followerId, me.id), eq(followsTable.followingId, userId)) });
    res.json({ ...user, followersCount: Number(fl.c), followingCount: Number(fg.c), isFollowing: !!followRow });
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
