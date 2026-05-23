import { useEffect } from "react";
import { useAuth } from "@clerk/react";
import { bindApiAuthToken, clearApiAuthToken } from "@/lib/api-client-setup";

/** Wires Clerk `getToken` into the generated API client's `Authorization` header. */
export function ApiAuthSetup({ children }: { children: React.ReactNode }) {
  const { getToken, isSignedIn } = useAuth();

  useEffect(() => {
    if (!isSignedIn) {
      clearApiAuthToken();
      return;
    }

    bindApiAuthToken(() => getToken());
    return () => clearApiAuthToken();
  }, [getToken, isSignedIn]);

  return <>{children}</>;
}
