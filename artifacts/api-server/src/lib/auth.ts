import { Request, Response, NextFunction } from "express";
import { getAuth } from "@clerk/express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  (req as any).clerkId = clerkId;
  next();
}

function defaultUsername(clerkId: string): string {
  const safe = clerkId.replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 48);
  return `u_${safe}`;
}

export async function getOrCreateUser(
  clerkId: string,
  username?: string,
): Promise<typeof usersTable.$inferSelect> {
  const [existing] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.clerkId, clerkId))
    .limit(1);
  if (existing) return existing;

  const name = username ?? defaultUsername(clerkId);

  const [inserted] = await db
    .insert(usersTable)
    .values({ clerkId, username: name })
    .onConflictDoUpdate({
      target: usersTable.clerkId,
      set: { updatedAt: new Date() },
    })
    .returning();

  if (inserted) return inserted;

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.clerkId, clerkId))
    .limit(1);
  if (!user) throw new Error(`Failed to find or create user for clerkId: ${clerkId}`);
  return user;
}

export async function getAuthUser(req: Request) {
  const clerkId = (req as any).clerkId as string;
  return getOrCreateUser(clerkId);
}
