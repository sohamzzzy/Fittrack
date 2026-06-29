import { Router } from "express";
import { getSingleValue } from "../lib/getSingleValue";
import { requireAuth, getAuthUser } from "../lib/auth";
import { db, postsTable, postLikesTable, postCommentsTable, followsTable, blocksTable, mutesTable, usersTable, workoutsTable } from "@workspace/db";
import { eq, and, count, inArray, sql, or } from "drizzle-orm";
import { createNotification } from "./notifications";


const router = Router();

function isMissingTableError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  if ("code" in error && error.code === "42P01") return true;
  return "cause" in error && isMissingTableError(error.cause);
}

function parseUserId(value: string | undefined) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

async function hasBlockBetween(firstId: number, secondId: number) {
  try {
    return !!await db.query.blocksTable.findFirst({ where: or(
      and(eq(blocksTable.blockerId, firstId), eq(blocksTable.blockedId, secondId)),
      and(eq(blocksTable.blockerId, secondId), eq(blocksTable.blockedId, firstId)),
    ) });
  } catch (error) {
    if (!isMissingTableError(error)) throw error;
    return false;
  }
}

async function canAccessPost(viewerId: number, postId: number) {
  const post = await db.query.postsTable.findFirst({ where: eq(postsTable.id, postId) });
  if (!post) return null;
  if (post.userId !== viewerId && await hasBlockBetween(viewerId, post.userId)) return null;
  return post;
}

async function formatUser(userId: number, viewerId: number) {
  const u = await db.query.usersTable.findFirst({ where: eq(usersTable.id, userId) });
  if (!u) return null;
  const [fl] = await db.select({ c: count() }).from(followsTable).where(eq(followsTable.followingId, userId));
  const [fg] = await db.select({ c: count() }).from(followsTable).where(eq(followsTable.followerId, userId));
  const followRow = viewerId !== userId ? await db.query.followsTable.findFirst({ where: and(eq(followsTable.followerId, viewerId), eq(followsTable.followingId, userId)) }) : null;
  return { ...u, followersCount: Number(fl.c), followingCount: Number(fg.c), isFollowing: !!followRow };
}

async function formatPost(post: typeof postsTable.$inferSelect, viewerId: number) {
  const user = await formatUser(post.userId, viewerId);
  const [likes] = await db.select({ c: count() }).from(postLikesTable).where(eq(postLikesTable.postId, post.id));
  const [comments] = await db.select({ c: count() }).from(postCommentsTable).where(eq(postCommentsTable.postId, post.id));
  const likeRow = await db.query.postLikesTable.findFirst({ where: and(eq(postLikesTable.postId, post.id), eq(postLikesTable.userId, viewerId)) });
  let workout = null;
  if (post.workoutId) {
    const w = await db.query.workoutsTable.findFirst({ where: eq(workoutsTable.id, post.workoutId) });
    if (w) {
      const duration = w.finishedAt ? Math.round((new Date(w.finishedAt).getTime() - new Date(w.startedAt).getTime()) / 60000) : null;
      workout = { ...w, durationMinutes: duration, totalVolume: null, totalSets: null, exerciseCount: null };
    }
  }
  return {
    ...post,
    user,
    workout,
    likesCount: Number(likes.c),
    commentsCount: Number(comments.c),
    isLiked: !!likeRow,
  };
}

router.get("/social/feed", requireAuth, async (req, res) => {
  try {
    const me = await getAuthUser(req);
    const limit = parseInt(getSingleValue(req.query.limit) ?? "") || 20;
    const offset = parseInt(getSingleValue(req.query.offset) ?? "") || 0;
    const followingRows = await db.select({ followingId: followsTable.followingId }).from(followsTable).where(eq(followsTable.followerId, me.id));
    const mutedRows = await db.select({ mutedId: mutesTable.mutedId }).from(mutesTable).where(eq(mutesTable.muterId, me.id));
    const blockedRows = await db.select().from(blocksTable).where(or(eq(blocksTable.blockerId, me.id), eq(blocksTable.blockedId, me.id)));
    const excludedIds = new Set([
      ...mutedRows.map((r) => r.mutedId),
      ...blockedRows.map((r) => r.blockerId === me.id ? r.blockedId : r.blockerId),
    ]);
    const followingIds = followingRows.map((r) => r.followingId).filter((id) => !excludedIds.has(id));
    const userIds = [me.id, ...followingIds];
    const posts = await db.select().from(postsTable).where(sql`${postsTable.userId} = ANY(ARRAY[${sql.join(userIds.map(id => sql`${id}`), sql`, `)}]::int[])`).orderBy(sql`${postsTable.createdAt} desc`).limit(limit).offset(offset);
    const result = await Promise.all(posts.map((p) => formatPost(p, me.id)));
    res.json(result);
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/social/posts", requireAuth, async (req, res) => {
  try {
    const me = await getAuthUser(req);
    const { content, workoutId } = req.body;
    const [post] = await db.insert(postsTable).values({ userId: me.id, content, workoutId }).returning();
    res.status(201).json(await formatPost(post, me.id));
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/social/posts/:postId", requireAuth, async (req, res) => {
  try {
    const me = await getAuthUser(req);
    const postIdParam = getSingleValue(req.params.postId);
    if (!postIdParam) {
      res.status(400).json({ error: "Missing post id" });
      return;
    }
    const postId = parseInt(postIdParam);
    const post = await db.query.postsTable.findFirst({ where: eq(postsTable.id, postId) });
    if (!post) { res.status(404).json({ error: "Not found" }); return; }
    if (post.userId !== me.id && (await hasBlockBetween(me.id, post.userId))) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(await formatPost(post, me.id));
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/social/posts/:postId", requireAuth, async (req, res) => {
  try {
    const me = await getAuthUser(req);
    const postIdParam = getSingleValue(req.params.postId);
    if (!postIdParam) {
      res.status(400).json({ error: "Missing post id" });
      return;
    }
    const postId = parseInt(postIdParam);
    await db.delete(postsTable).where(and(eq(postsTable.id, postId), eq(postsTable.userId, me.id)));
    res.status(204).send();
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/social/posts/:postId/like", requireAuth, async (req, res) => {
  try {
    const me = await getAuthUser(req);
    const postIdParam = getSingleValue(req.params.postId);
    if (!postIdParam) {
      res.status(400).json({ error: "Missing post id" });
      return;
    }
    const postId = parseInt(postIdParam);
    if (!await canAccessPost(me.id, postId)) { res.status(404).json({ error: "Not found" }); return; }
    const existing = await db.query.postLikesTable.findFirst({ where: and(eq(postLikesTable.postId, postId), eq(postLikesTable.userId, me.id)) });
    if (!existing) {
      await db.insert(postLikesTable).values({ postId, userId: me.id });
      const post = await db.query.postsTable.findFirst({ where: eq(postsTable.id, postId) });
      if (post && post.userId !== me.id) {
        const actor = await db.query.usersTable.findFirst({ where: eq(usersTable.id, me.id) });
        await createNotification({
          recipientId: post.userId,
          actorId: me.id,
          type: "post_liked",
          entityId: postId,
          entityType: "post",
          message: `${actor?.displayName ?? actor?.username ?? "Someone"} liked your post`,
        });
      }
    }

    const [likes] = await db.select({ c: count() }).from(postLikesTable).where(eq(postLikesTable.postId, postId));
    res.json({ liked: true, likesCount: Number(likes.c) });
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/social/posts/:postId/like", requireAuth, async (req, res) => {
  try {
    const me = await getAuthUser(req);
    const postIdParam = getSingleValue(req.params.postId);
    if (!postIdParam) {
      res.status(400).json({ error: "Missing post id" });
      return;
    }
    const postId = parseInt(postIdParam);
    if (!await canAccessPost(me.id, postId)) { res.status(404).json({ error: "Not found" }); return; }
    await db.delete(postLikesTable).where(and(eq(postLikesTable.postId, postId), eq(postLikesTable.userId, me.id)));
    const [likes] = await db.select({ c: count() }).from(postLikesTable).where(eq(postLikesTable.postId, postId));
    res.json({ liked: false, likesCount: Number(likes.c) });
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/social/posts/:postId/comments", requireAuth, async (req, res) => {
  try {
    const me = await getAuthUser(req);
    const postIdParam = getSingleValue(req.params.postId);
    if (!postIdParam) {
      res.status(400).json({ error: "Missing post id" });
      return;
    }
    const postId = parseInt(postIdParam);
    if (!await canAccessPost(me.id, postId)) { res.status(404).json({ error: "Not found" }); return; }
    const comments = await db.select().from(postCommentsTable).where(eq(postCommentsTable.postId, postId)).orderBy(postCommentsTable.createdAt);
    const result = await Promise.all(comments.map(async (c) => ({
      ...c,
      user: await formatUser(c.userId, me.id),
    })));
    res.json(result);
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/social/posts/:postId/comments", requireAuth, async (req, res) => {
  try {
    const me = await getAuthUser(req);
    const postIdParam = getSingleValue(req.params.postId);
    if (!postIdParam) {
      res.status(400).json({ error: "Missing post id" });
      return;
    }
    const postId = parseInt(postIdParam);
    if (!await canAccessPost(me.id, postId)) { res.status(404).json({ error: "Not found" }); return; }
    const { content } = req.body;
    const [c] = await db.insert(postCommentsTable).values({ postId, userId: me.id, content }).returning();
    const post = await db.query.postsTable.findFirst({ where: eq(postsTable.id, postId) });
    if (post && post.userId !== me.id) {
      const actor = await db.query.usersTable.findFirst({ where: eq(usersTable.id, me.id) });
      await createNotification({
        recipientId: post.userId,
        actorId: me.id,
        type: "post_commented",
        entityId: postId,
        entityType: "post",
        message: `${actor?.displayName ?? actor?.username ?? "Someone"} commented on your post`,
      });
    }
    res.status(201).json({ ...c, user: await formatUser(me.id, me.id) });

  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/social/comments/:commentId", requireAuth, async (req, res) => {
  try {
    const me = await getAuthUser(req);
    const commentIdParam = getSingleValue(req.params.commentId);
    if (!commentIdParam) {
      res.status(400).json({ error: "Missing comment id" });
      return;
    }
    const commentId = parseInt(commentIdParam);
    await db.delete(postCommentsTable).where(and(eq(postCommentsTable.id, commentId), eq(postCommentsTable.userId, me.id)));
    res.status(204).send();
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/social/follow/:userId", requireAuth, async (req, res) => {
  try {
    const me = await getAuthUser(req);
    const targetIdParam = getSingleValue(req.params.userId);
    if (!targetIdParam) {
      res.status(400).json({ error: "Missing user id" });
      return;
    }
    const targetId = parseUserId(targetIdParam);
    if (!targetId || targetId === me.id) { res.status(400).json({ error: "Invalid follow target" }); return; }
    const target = await db.query.usersTable.findFirst({ where: eq(usersTable.id, targetId) });
    if (!target) { res.status(404).json({ error: "User not found" }); return; }
    if (await hasBlockBetween(me.id, targetId)) { res.status(409).json({ error: "Blocked users cannot be followed" }); return; }
    const existing = await db.query.followsTable.findFirst({ where: and(eq(followsTable.followerId, me.id), eq(followsTable.followingId, targetId)) });
    if (!existing) {
      await db.insert(followsTable).values({ followerId: me.id, followingId: targetId });
      const actor = await db.query.usersTable.findFirst({ where: eq(usersTable.id, me.id) });
      await createNotification({
        recipientId: targetId,
        actorId: me.id,
        type: "new_follower",
        entityId: me.id,
        entityType: "user",
        message: `${actor?.displayName ?? actor?.username ?? "Someone"} started following you`,
      });
    }

    const [fl] = await db.select({ c: count() }).from(followsTable).where(eq(followsTable.followingId, targetId));
    res.json({ following: true, followersCount: Number(fl.c) });
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/social/follow/:userId", requireAuth, async (req, res) => {
  try {
    const me = await getAuthUser(req);
    const targetIdParam = getSingleValue(req.params.userId);
    if (!targetIdParam) {
      res.status(400).json({ error: "Missing user id" });
      return;
    }
    const targetId = parseInt(targetIdParam);
    await db.delete(followsTable).where(and(eq(followsTable.followerId, me.id), eq(followsTable.followingId, targetId)));
    const [fl] = await db.select({ c: count() }).from(followsTable).where(eq(followsTable.followingId, targetId));
    res.json({ following: false, followersCount: Number(fl.c) });
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/social/mute/:userId", requireAuth, async (req, res) => {
  try {
    const me = await getAuthUser(req);
    const targetId = parseUserId(getSingleValue(req.params.userId));
    if (!targetId || targetId === me.id) { res.status(400).json({ error: "Invalid mute target" }); return; }
    const target = await db.query.usersTable.findFirst({ where: eq(usersTable.id, targetId) });
    if (!target) { res.status(404).json({ error: "User not found" }); return; }
    await db.insert(mutesTable).values({ muterId: me.id, mutedId: targetId }).onConflictDoNothing();
    res.json({ muted: true });
  } catch (e) {
    if (isMissingTableError(e)) {
      res.json({ muted: true });
      return;
    }
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/social/mute/:userId", requireAuth, async (req, res) => {
  try {
    const me = await getAuthUser(req);
    const targetId = parseUserId(getSingleValue(req.params.userId));
    if (!targetId) { res.status(400).json({ error: "Invalid mute target" }); return; }
    await db.delete(mutesTable).where(and(eq(mutesTable.muterId, me.id), eq(mutesTable.mutedId, targetId)));
    res.json({ muted: false });
  } catch (e) {
    if (isMissingTableError(e)) {
      res.json({ muted: false });
      return;
    }
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/social/block/:userId", requireAuth, async (req, res) => {
  try {
    const me = await getAuthUser(req);
    const targetId = parseUserId(getSingleValue(req.params.userId));
    if (!targetId || targetId === me.id) { res.status(400).json({ error: "Invalid block target" }); return; }
    const target = await db.query.usersTable.findFirst({ where: eq(usersTable.id, targetId) });
    if (!target) { res.status(404).json({ error: "User not found" }); return; }
    await db.transaction(async (tx) => {
      await tx.insert(blocksTable).values({ blockerId: me.id, blockedId: targetId }).onConflictDoNothing();
      await tx.delete(followsTable).where(or(
        and(eq(followsTable.followerId, me.id), eq(followsTable.followingId, targetId)),
        and(eq(followsTable.followerId, targetId), eq(followsTable.followingId, me.id)),
      ));
      await tx.delete(mutesTable).where(and(eq(mutesTable.muterId, me.id), eq(mutesTable.mutedId, targetId)));
    });
    res.json({ blocked: true });
  } catch (e) {
    if (isMissingTableError(e)) {
      res.json({ blocked: true });
      return;
    }
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/social/blocked", requireAuth, async (req, res) => {
  try {
    const me = await getAuthUser(req);
    const rows = await db.select({ blockedId: blocksTable.blockedId }).from(blocksTable).where(eq(blocksTable.blockerId, me.id));
    const users = await Promise.all(rows.map(async ({ blockedId }) => {
      const user = await db.query.usersTable.findFirst({ where: eq(usersTable.id, blockedId) });
      return user ? { id: user.id, username: user.username, displayName: user.displayName, avatarUrl: user.avatarUrl } : null;
    }));
    res.json(users.filter(Boolean));
  } catch (e) {
    if (isMissingTableError(e)) {
      res.json([]);
      return;
    }
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/social/block/:userId", requireAuth, async (req, res) => {
  try {
    const me = await getAuthUser(req);
    const targetId = parseUserId(getSingleValue(req.params.userId));
    if (!targetId) { res.status(400).json({ error: "Invalid block target" }); return; }
    await db.delete(blocksTable).where(and(eq(blocksTable.blockerId, me.id), eq(blocksTable.blockedId, targetId)));
    res.json({ blocked: false });
  } catch (e) {
    if (isMissingTableError(e)) {
      res.json({ blocked: false });
      return;
    }
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/social/followers/:userId", requireAuth, async (req, res) => {
  try {
    const me = await getAuthUser(req);
    const userIdParam = getSingleValue(req.params.userId);
    if (!userIdParam) {
      res.status(400).json({ error: "Missing user id" });
      return;
    }
    const userId = parseInt(userIdParam);
    const rows = await db.select({ followerId: followsTable.followerId }).from(followsTable).where(eq(followsTable.followingId, userId));
    const users = await Promise.all(rows.map(async (r) => await hasBlockBetween(me.id, r.followerId) ? null : formatUser(r.followerId, me.id)));
    res.json(users.filter(Boolean));
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/social/following/:userId", requireAuth, async (req, res) => {
  try {
    const me = await getAuthUser(req);
    const userIdParam = getSingleValue(req.params.userId);
    if (!userIdParam) {
      res.status(400).json({ error: "Missing user id" });
      return;
    }
    const userId = parseInt(userIdParam);
    const rows = await db.select({ followingId: followsTable.followingId }).from(followsTable).where(eq(followsTable.followerId, userId));
    const users = await Promise.all(rows.map(async (r) => await hasBlockBetween(me.id, r.followingId) ? null : formatUser(r.followingId, me.id)));
    res.json(users.filter(Boolean));
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
