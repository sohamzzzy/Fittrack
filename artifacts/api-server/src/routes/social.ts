import { Router } from "express";
import { getSingleValue } from "../lib/getSingleValue";
import { requireAuth, getAuthUser } from "../lib/auth";
import { db, postsTable, postLikesTable, postCommentsTable, followsTable, usersTable, workoutsTable } from "@workspace/db";
import { eq, and, count, inArray, sql } from "drizzle-orm";

const router = Router();

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
    const followingIds = followingRows.map((r) => r.followingId);
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
    const existing = await db.query.postLikesTable.findFirst({ where: and(eq(postLikesTable.postId, postId), eq(postLikesTable.userId, me.id)) });
    if (!existing) {
      await db.insert(postLikesTable).values({ postId, userId: me.id });
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
    const { content } = req.body;
    const [c] = await db.insert(postCommentsTable).values({ postId, userId: me.id, content }).returning();
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
    const targetId = parseInt(targetIdParam);
    const existing = await db.query.followsTable.findFirst({ where: and(eq(followsTable.followerId, me.id), eq(followsTable.followingId, targetId)) });
    if (!existing) {
      await db.insert(followsTable).values({ followerId: me.id, followingId: targetId });
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
    const users = await Promise.all(rows.map((r) => formatUser(r.followerId, me.id)));
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
    const users = await Promise.all(rows.map((r) => formatUser(r.followingId, me.id)));
    res.json(users.filter(Boolean));
  } catch (e) {
    req.log.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
