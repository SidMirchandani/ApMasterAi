import { useEffect, useRef } from "react";
import { useRouter } from "next/router";
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

export function useFirebasePageViews() {
  const router = useRouter();
  const lastTrackedPathRef = useRef<string | null>(null);
  const previousLocationRef = useRef<string | null>(null);

  useEffect(() => {
    if (!router.isReady || !router.asPath) return;
    if (lastTrackedPathRef.current === router.asPath) return;

    const { surface, action } = routeTrackingFor(router.pathname, router.query);
    const pagePath = router.asPath;
    const pageReferrer = previousLocationRef.current ?? document.referrer ?? null;
    const eventParams = getAnalyticsPageParams({
      surface,
      subject: firstQueryValue(router.query.subject),
      unit: firstQueryValue(router.query.unit),
      pagePath,
      pageReferrer,
    });

    lastTrackedPathRef.current = pagePath;
    previousLocationRef.current = `${window.location.origin}${pagePath}`;

    void trackPageView(eventParams);
    if (action) {
      void trackVersionedAnalyticsEvent({
        action,
        params: eventParams,
      });
    }
  }, [router.asPath, router.isReady, router.pathname, router.query.review, router.query.subject, router.query.unit]);
}
