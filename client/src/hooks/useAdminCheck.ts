import { useState, useEffect } from "react";
import { getAuthHeaders } from "@/lib/queryClient";

/**
 * Returns whether the current user is an admin (for admin-only UI like auto-answer).
 * Uses GET /api/user/admin-check with the current auth token.
 */
export function useAdminCheck(): { isAdmin: boolean; loading: boolean } {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const headers = await getAuthHeaders();
        if (!headers?.Authorization) {
          if (!cancelled) {
            setIsAdmin(false);
            setLoading(false);
          }
          return;
        }
        const res = await fetch("/api/user/admin-check", { headers });
        const data = await res.json().catch(() => ({}));
        if (!cancelled) {
          setIsAdmin(!!data?.data?.isAdmin);
        }
      } catch {
        if (!cancelled) setIsAdmin(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    check();
    return () => {
      cancelled = true;
    };
  }, []);

  return { isAdmin, loading };
}
