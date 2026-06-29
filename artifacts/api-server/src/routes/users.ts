import { Router } from "express";
import { getSingleValue } from "../lib/getSingleValue";
import { requireAuth, getAuthUser, getOrCreateUser } from "../lib/auth";
import { db, usersTable, followsTable, blocksTable, mutesTable, workoutsTable, postsTable } from "@workspace/db";
import { eq, and, count, sql, or, ne, desc } from "drizzle-orm";
import { UpdateMeBody } from "@workspace/api-zod";
import multer from "multer";
import path from "path";
import fs from "fs";

const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Not an image! Please upload an image.'));
    }
  }
});

const router = Router();

function isMissingTableError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  if ("code" in error && error.code === "42P01") return true;
  return "cause" in error && isMissingTableError(error.cause);
}

async function userWithCounts(user: typeof usersTable.$inferSelect, isFollowing = false) {
  const [followers] = await db.select({ c: count() }).from(followsTable).where(eq(followsTable.followingId, user.id));
  const [following] = await db.select({ c: count() }).from(followsTable).where(eq(followsTable.followerId, user.id));
  return {
    ...user,
    followersCount: Number(followers.c),
    followingCount: Number(following.c),
    isFollowing,
  };
}

async function relationshipState(viewerId: number, userId: number) {
  const [follow, mute, block] = await Promise.all([
    db.query.followsTable.findFirst({ where: and(eq(followsTable.followerId, viewerId), eq(followsTable.followingId, userId)) }).catch(e => { if (isMissingTableError(e)) return null; throw e; }),
    db.query.mutesTable.findFirst({ where: and(eq(mutesTable.muterId, viewerId), eq(mutesTable.mutedId, userId)) }).catch(e => { if (isMissingTableError(e)) return null; throw e; }),
    db.query.blocksTable.findFirst({ where: or(
      and(eq(blocksTable.blockerId, viewerId), eq(blocksTable.blockedId, userId)),
      and(eq(blocksTable.blockerId, userId), eq(blocksTable.blockedId, viewerId)),
    ) }).catch(e => { if (isMissingTableError(e)) return null; throw e; }),
  ]);
  return { isFollowing: !!follow, isMuted: !!mute, isBlocked: !!block, blockedByMe: block?.blockerId === viewerId };
}

const meRouter = Router();

meRouter.get("/", requireAuth, async (req, res) => {
  try {
    const clerkId = (req as { clerkId?: string }).clerkId;
    if (!clerkId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const user = await getOrCreateUser(clerkId);
    res.json(await userWithCounts(user, false));
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

meRouter.patch("/", requireAuth, async (req, res) => {
  try {
    const parsed = UpdateMeBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request body", details: parsed.error.flatten() });
      return;
    }

    const { username, displayName, bio, avatarUrl } = parsed.data;
    const updateData: Partial<typeof usersTable.$inferInsert> = {};
    if (username !== undefined) updateData.username = username;
    if (displayName !== undefined) updateData.displayName = displayName;
    if (bio !== undefined) updateData.bio = bio;
    if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;

    if (Object.keys(updateData).length === 0) {
      res.status(400).json({ error: "No profile fields to update" });
      return;
    }

    const user = await getAuthUser(req);
    const [updated] = await db.update(usersTable).set(updateData).where(eq(usersTable.id, user.id)).returning();
    if (!updated) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json(updated);
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

meRouter.post("/avatar", upload.single("avatar"), async (req, res) => {
  try {
    const user = await getAuthUser(req);
    if (!req.file) {
      res.status(400).json({ error: "No image file provided" });
      return;
    }
    const avatarUrl = `/uploads/${req.file.filename}`;
    const [updated] = await db.update(usersTable).set({ avatarUrl }).where(eq(usersTable.id, user.id)).returning();
    res.json({ avatarUrl: updated.avatarUrl });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

meRouter.get("/stats", requireAuth, async (req, res) => {
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

router.use("/users/me", meRouter);

router.get("/users/search", requireAuth, async (req, res) => {
  try {
    const user = await getAuthUser(req);
    const q = (getSingleValue(req.query.q) ?? "").trim();
    if (!q) {
      res.json([]);
      return;
    }
    let blockedRows: Array<typeof blocksTable.$inferSelect> = [];
    try {
      blockedRows = await db.select().from(blocksTable).where(or(eq(blocksTable.blockerId, user.id), eq(blocksTable.blockedId, user.id)));
    } catch (error) {
      if (!isMissingTableError(error)) throw error;
    }
    const blockedIds = new Set(blockedRows.map((row) => row.blockerId === user.id ? row.blockedId : row.blockerId));
    const users = await db.select().from(usersTable).where(and(
      ne(usersTable.id, user.id),
      or(
        sql`lower(btrim(${usersTable.username})) like lower(${"%" + q + "%"})`,
        sql`lower(btrim(coalesce(${usersTable.displayName}, ''))) like lower(${"%" + q + "%"})`,
      ),
    )).limit(20);
    const followingRows = await db.select({ followingId: followsTable.followingId }).from(followsTable).where(eq(followsTable.followerId, user.id));
    const followingIds = new Set(followingRows.map((r) => r.followingId));
    const result = await Promise.all(
      users.filter((u) => !blockedIds.has(u.id)).map(async (u) => {
        const [fl] = await db.select({ c: count() }).from(followsTable).where(eq(followsTable.followingId, u.id));
        const [fg] = await db.select({ c: count() }).from(followsTable).where(eq(followsTable.followerId, u.id));
        let mute: typeof mutesTable.$inferSelect | undefined;
        try {
          mute = await db.query.mutesTable.findFirst({ where: and(eq(mutesTable.muterId, user.id), eq(mutesTable.mutedId, u.id)) });
        } catch (error) {
          if (!isMissingTableError(error)) throw error;
        }
        return { ...u, followersCount: Number(fl.c), followingCount: Number(fg.c), isFollowing: followingIds.has(u.id), isMuted: !!mute, isBlocked: false, blockedByMe: false };
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
    const relationship = await relationshipState(me.id, userId);
    if (relationship.isBlocked) { res.status(404).json({ error: "Not found" }); return; }
    const [fl] = await db.select({ c: count() }).from(followsTable).where(eq(followsTable.followingId, userId));
    const [fg] = await db.select({ c: count() }).from(followsTable).where(eq(followsTable.followerId, userId));
    const [workoutCount] = await db.select({ c: count() }).from(workoutsTable).where(and(eq(workoutsTable.userId, userId), eq(workoutsTable.isFinished, true)));
    const recentActivity = await db.select({
      id: postsTable.id,
      content: postsTable.content,
      createdAt: postsTable.createdAt,
    }).from(postsTable).where(eq(postsTable.userId, userId)).orderBy(desc(postsTable.createdAt)).limit(5);
    res.json({
      ...user,
      followersCount: Number(fl.c),
      followingCount: Number(fg.c),
      ...relationship,
      totalWorkouts: Number(workoutCount.c),
      recentActivity,
    });
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
