import { useEffect, useState } from "react";
import { getAuthHeaders } from "@/lib/api";

export type AuthAwareImageStatus = "loading" | "ready" | "error";

/**
 * Resolves `/api/image-proxy?...` URLs using a Bearer token (img tags cannot send headers).
 * Non-proxy URLs are passed through unchanged.
 * @param bearerToken When provided (e.g. admin page), only that token is used; empty string means still loading.
 *   When omitted, uses `getAuthHeaders()` (student client Firebase).
 */
export function useAuthAwareImageSrc(
  src: string,
  bearerToken?: string,
): { displaySrc: string | null; status: AuthAwareImageStatus } {
  const [displaySrc, setDisplaySrc] = useState<string | null>(null);
  const [status, setStatus] = useState<AuthAwareImageStatus>("loading");

  useEffect(() => {
    if (!src) {
      setStatus("error");
      setDisplaySrc(null);
      return;
    }

    if (!src.includes("/api/image-proxy")) {
      setDisplaySrc(src);
      setStatus("ready");
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const headers: Record<string, string> = {};
        if (bearerToken !== undefined) {
          if (!bearerToken.trim()) {
            if (!cancelled) {
              setStatus("loading");
              setDisplaySrc(null);
            }
            return;
          }
          headers.Authorization = `Bearer ${bearerToken}`;
        } else {
          Object.assign(headers, await getAuthHeaders());
        }
        if (!headers.Authorization) {
          if (!cancelled) {
            setStatus("error");
            setDisplaySrc(null);
          }
          return;
        }

        const res = await fetch(src, {
          headers,
          redirect: "manual",
          credentials: "include",
        });
        if (cancelled) return;
        const loc = res.headers.get("Location");
        if (res.status === 302 && loc) {
          setDisplaySrc(loc);
          setStatus("ready");
          return;
        }
        setStatus("error");
        setDisplaySrc(null);
      } catch {
        if (!cancelled) {
          setStatus("error");
          setDisplaySrc(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [src, bearerToken]);

  return { displaySrc, status };
}
