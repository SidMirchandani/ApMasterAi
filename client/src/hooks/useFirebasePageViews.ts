import { useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import { apiRequest } from "@/lib/api";
import {
  getAnalyticsPageParams,
  trackPageView,
  trackVersionedAnalyticsEvent,
  type AnalyticsSurface,
  type VersionedAnalyticsAction,
} from "@/lib/firebase";

function firstQueryValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function routeTrackingFor(pathname: string, query: { review?: string | string[] }): {
  surface: AnalyticsSurface;
  action?: VersionedAnalyticsAction;
} {
  const normalized = pathname.replace(/^\/+/, "").replace(/\/+$/, "");
  const reviewParam = firstQueryValue(query.review);

  if (!normalized) return { surface: "home" };
  if (normalized === "dashboard") return { surface: "dashboard", action: "dashboard" };
  if (normalized === "study") return { surface: "study", action: "study" };
  if (normalized === "quiz" && reviewParam === "1") return { surface: "result", action: "result_viewed" };
  if (normalized === "quiz") return { surface: "quiz", action: "quiz" };
  if (normalized === "analytics") return { surface: "analytics" };
  if (normalized === "login") return { surface: "login" };
  if (normalized === "signup") return { surface: "signup" };
  if (normalized === "profile") return { surface: "profile" };
  if (
    normalized === "review" ||
    normalized === "unit-quiz-result" ||
    normalized === "full-length-results" ||
    normalized === "test-results"
  ) {
    return { surface: "result", action: "result_viewed" };
  }

  return { surface: "other" };
}

function canonicalReferrerFor(surface: AnalyticsSurface): string | null {
  if (typeof window === "undefined") return null;
  const origin = window.location.origin;
  if (surface === "study") return `${origin}/dashboard`;
  if (surface === "quiz") return `${origin}/study`;
  if (surface === "result") return `${origin}/quiz`;
  return null;
}

export function useFirebasePageViews() {
  const router = useRouter();
  const { loading: authLoading, isAuthenticated } = useAuth();
  const lastTrackedPathRef = useRef<string | null>(null);
  const {
    data: userProfile,
    isLoading: profileLoading,
    isError: profileError,
  } = useQuery<{
    success: boolean;
    data?: { state?: string | null };
  }>({
    queryKey: ["userProfile"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/user/me");
      return response.json();
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (authLoading) return;
    if (isAuthenticated && profileLoading && !profileError) return;
    if (!router.isReady || !router.asPath) return;
    if (lastTrackedPathRef.current === router.asPath) return;

    const { surface, action } = routeTrackingFor(router.pathname, router.query);
    const pagePath = router.pathname;
    const eventParams = getAnalyticsPageParams({
      surface,
      subject: firstQueryValue(router.query.subject),
      unit: firstQueryValue(router.query.unit),
      pagePath,
      pageReferrer: canonicalReferrerFor(surface),
      state: userProfile?.data?.state ?? null,
    });

    lastTrackedPathRef.current = router.asPath;

    void trackPageView(eventParams);
    if (action) {
      void trackVersionedAnalyticsEvent({
        action,
        params: {
          ...eventParams,
          method: "route",
          user_count:
            action === "dashboard" || action === "study" || action === "quiz"
              ? 1
              : undefined,
        },
      });
    }
  }, [
    authLoading,
    isAuthenticated,
    profileError,
    profileLoading,
    router.asPath,
    router.isReady,
    router.pathname,
    router.query.review,
    router.query.subject,
    router.query.unit,
    userProfile?.data?.state,
  ]);
}
