import { useEffect, useState } from "react";

export type AuthAwareImageStatus = "loading" | "ready" | "error";

/**
 * Simplified image resolver: for now `/api/image-proxy` is public, so we just
 * surface the URL directly and track a basic loading state.
 */
export function useAuthAwareImageSrc(
  src: string,
  _bearerToken?: string,
): { displaySrc: string | null; status: AuthAwareImageStatus } {
  const [displaySrc, setDisplaySrc] = useState<string | null>(null);
  const [status, setStatus] = useState<AuthAwareImageStatus>("loading");

  useEffect(() => {
    if (!src) {
      setDisplaySrc(null);
      setStatus("error");
      return;
    }

    setDisplaySrc(src);
    setStatus("ready");
  }, [src]);

  return { displaySrc, status };
}
