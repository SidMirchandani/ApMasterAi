import { useState, useEffect } from "react";
import { getAuthHeaders } from "@/lib/queryClient";

/**
 * Returns admin and experimental feature flags from GET /api/user/admin-check.
 * showAdminFeatures = isAdmin && experimentalFeaturesEnabled (gates admin-only UI).
 */
export function useAdminCheck(): {
  isAdmin: boolean;
  experimentalFeaturesEnabled: boolean;
  showAdminFeatures: boolean;
  loading: boolean;
} {
  const [isAdmin, setIsAdmin] = useState(false);
  const [experimentalFeaturesEnabled, setExperimentalFeaturesEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const headers = await getAuthHeaders();
        if (!headers?.Authorization) {
          if (!cancelled) {
            setIsAdmin(false);
            setExperimentalFeaturesEnabled(false);
            setLoading(false);
          }
          return;
        }
        const res = await fetch("/api/user/admin-check", { headers });
        const data = await res.json().catch(() => ({}));
        if (!cancelled) {
          const admin = !!data?.data?.isAdmin;
          const experimental = !!data?.data?.experimentalFeaturesEnabled;
          setIsAdmin(admin);
          setExperimentalFeaturesEnabled(experimental);
        }
      } catch {
        if (!cancelled) {
          setIsAdmin(false);
          setExperimentalFeaturesEnabled(false);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    check();
    return () => {
      cancelled = true;
    };
  }, []);

  const showAdminFeatures = isAdmin && experimentalFeaturesEnabled;

  return { isAdmin, experimentalFeaturesEnabled, showAdminFeatures, loading };
}
