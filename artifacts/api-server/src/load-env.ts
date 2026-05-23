import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const apiServerRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const repoRoot = path.resolve(apiServerRoot, "../..");

/**
 * Load env files before any other application modules import `@workspace/db` or Clerk.
 *
 * Order matters: `artifacts/api-server/.env` supplies Clerk keys and PORT; repo-root `.env`
 * wins for `DATABASE_URL` so a single pooler URL is not overridden by a stale direct URL.
 */
function loadEnvFiles(): void {
  dotenv.config({ path: path.join(apiServerRoot, ".env") });
  dotenv.config({ path: path.join(apiServerRoot, ".env.local") });
  dotenv.config({ path: path.join(repoRoot, ".env"), override: true });
  dotenv.config({ path: path.join(repoRoot, ".env.local"), override: true });
}

loadEnvFiles();

export function loadApiServerEnv(): void {
  loadEnvFiles();
}

export function assertApiServerEnv(): void {
  const missing: string[] = [];
  if (!process.env.DATABASE_URL?.trim()) missing.push("DATABASE_URL");
  if (!process.env.CLERK_SECRET_KEY?.trim()) missing.push("CLERK_SECRET_KEY");
  if (!process.env.CLERK_PUBLISHABLE_KEY?.trim()) {
    missing.push("CLERK_PUBLISHABLE_KEY");
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}. ` +
        `Copy artifacts/api-server/.env.example to artifacts/api-server/.env and set your Clerk keys ` +
        `(https://dashboard.clerk.com).`,
    );
  }
}
