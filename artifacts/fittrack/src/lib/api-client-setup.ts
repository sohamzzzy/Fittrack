import { setBaseUrl, setAuthTokenGetter } from "@workspace/api-client-react";

/** Strip trailing slash; empty string means same-origin relative `/api/...` paths. */
function normalizeApiOrigin(raw: string | undefined): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  return trimmed.replace(/\/+$/, "");
}

const apiOrigin = normalizeApiOrigin(import.meta.env.VITE_API_URL);
setBaseUrl(apiOrigin);

/**
 * Attach Clerk session JWTs to every API request (required by `requireAuth` on the server).
 * Call from a component inside `ClerkProvider` once `useAuth` is available.
 */
export function bindApiAuthToken(getToken: () => Promise<string | null>): void {
  setAuthTokenGetter(async () => {
    try {
      return await getToken();
    } catch {
      return null;
    }
  });
}

export function clearApiAuthToken(): void {
  setAuthTokenGetter(null);
}

export function getConfiguredApiOrigin(): string | null {
  return apiOrigin;
}
