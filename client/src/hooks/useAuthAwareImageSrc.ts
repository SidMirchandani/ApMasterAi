import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { getAuthHeaders } from "@/lib/api";
import { auth } from "@/lib/firebase";

export type AuthAwareImageStatus = "loading" | "ready" | "error";

/**
 * Resolves `/api/image-proxy?...` URLs using a Bearer token (img tags cannot send headers).
 * Non-proxy URLs are passed through unchanged.
 * @param bearerToken When provided (e.g. admin page), only that token is used; empty string means still loading.
 *   When omitted, waits for Firebase `onAuthStateChanged` then uses `getAuthHeaders()` so images load after auth restores.
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

    const fetchWithHeaders = async (headers: Record<string, string>) => {
      if (cancelled) return;
      if (!headers.Authorization) {
        setStatus("error");
        setDisplaySrc(null);
        return;
      }
      try {
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
    };

    if (bearerToken !== undefined) {
      if (!bearerToken.trim()) {
        setStatus("loading");
        setDisplaySrc(null);
        return () => {
          cancelled = true;
        };
      }
      void fetchWithHeaders({ Authorization: `Bearer ${bearerToken}` });
      return () => {
        cancelled = true;
      };
    }

    if (!auth) {
      setStatus("error");
      setDisplaySrc(null);
      return;
    }

    setStatus("loading");
    setDisplaySrc(null);

    const unsub = onAuthStateChanged(auth, () => {
      void (async () => {
        if (cancelled) return;
        const headers = await getAuthHeaders();
        await fetchWithHeaders(headers);
      })();
    });

    return () => {
      cancelled = true;
      unsub();
    };
  }, [src, bearerToken]);

  return { displaySrc, status };
}
