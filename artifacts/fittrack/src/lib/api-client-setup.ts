import {
  setBaseUrl,
  setAuthTokenGetter,
  resolveApiBaseUrl,
} from "@workspace/api-client-react";

/** Railway / API server origin from Vite env (no trailing slash). */
export const API_URL = import.meta.env.VITE_API_URL as string | undefined;

const apiBase = resolveApiBaseUrl(API_URL);
setBaseUrl(apiBase);

if (import.meta.env.PROD && !apiBase) {
  console.error(
    "[fittrack] VITE_API_URL is not set. API requests will use relative /api paths on the frontend origin and will fail in production.",
  );
}

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

/** Resolved API origin used for fetch (e.g. https://….up.railway.app). */
export function getConfiguredApiOrigin(): string | null {
  return apiBase;
}
