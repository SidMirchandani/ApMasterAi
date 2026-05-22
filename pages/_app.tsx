import type { AppProps } from 'next/app';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useMemo } from 'react';
import { attributionFromRouterQuery } from '../lib/attribution';
import { tryMergeAttributionFromPayload } from '../client/src/lib/attribution-storage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../client/src/contexts/auth-context';
import { ThemeProvider } from '../client/src/contexts/theme-context';
import { Toaster } from '../client/src/components/ui/toaster';
import { TooltipProvider } from '../client/src/components/ui/tooltip';
import { getSectionByCode, getSectionCodeForUnit, getSubjectByCode, getSubjectByLegacyId } from '../client/src/subjects';
import { useFirebasePageViews } from '../client/src/hooks/useFirebasePageViews';
import 'katex/dist/katex.min.css';
import '../client/src/index.css';

const queryClient = new QueryClient();

const BRAND_NAME = 'APMaster';
const HOMEPAGE_SEO_TITLE = 'APMaster - Master Your AP Exam';

function decodeQueryParam(value: string | string[] | undefined): string {
  if (!value) return '';
  const raw = Array.isArray(value) ? value[0] : value;
  try {
    return decodeURIComponent(raw).trim();
  } catch {
    return raw.trim();
  }
}

function normalizeSubjectName(subjectParam: string): string {
  if (!subjectParam) return 'AP Course';
  const byLegacy = getSubjectByLegacyId(subjectParam);
  if (byLegacy?.displayName) return byLegacy.displayName;
  const byCode = getSubjectByCode(subjectParam);
  if (byCode?.displayName) return byCode.displayName;
  return subjectParam
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function normalizeFromPath(pathname: string): string {
  return pathname
    .replace(/^\/+/, '')
    .replace(/\/+$/, '')
    .replace(/\?.*$/, '');
}

function routeBaseTitle(pathname: string, query: Record<string, string | string[] | undefined>): string {
  const normalizedPath = normalizeFromPath(pathname);
  const subjectParam = decodeQueryParam(query.subject);
  const subjectName = normalizeSubjectName(subjectParam);

  if (normalizedPath === '') return HOMEPAGE_SEO_TITLE;
  if (normalizedPath === 'about') return 'About';
  if (normalizedPath === 'dashboard') return 'Dashboard';
  if (normalizedPath === 'study') return subjectParam ? subjectName : 'Study';
  if (normalizedPath === 'analytics') return subjectParam ? `Analytics for ${subjectName}` : 'Analytics';
  if (normalizedPath === 'quiz') {
    const unitParam = decodeQueryParam(query.unit);
    if (unitParam.toLowerCase() === 'full-length') {
      return subjectParam ? `Full-Length MCQ Test for ${subjectName}` : 'Full-Length MCQ Test';
    }

    const sectionCode = /^[A-Z]{2,}$/.test(unitParam)
      ? unitParam
      : getSectionCodeForUnit(subjectParam, unitParam) || '';
    const sectionName =
      (sectionCode && getSectionByCode(subjectParam, sectionCode)?.name) ||
      unitParam
        .replace(/[-_]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/\b\w/g, (match) => match.toUpperCase());

    if (subjectParam && sectionName) return `${sectionName} Unit Quiz for ${subjectName}`;
    if (sectionName) return `${sectionName} Unit Quiz`;
    return 'Quiz';
  }

  const directTitles: Record<string, string> = {
    bookmarks: 'Bookmarks',
    courses: 'Courses',
    learn: 'Learn',
    login: 'Login',
    signup: 'Sign Up',
    profile: 'Profile',
    review: 'Review',
    'section-review': 'Section Review',
    'test-history': 'Test History',
    'test-results': 'Test Results',
    'unit-quiz-result': 'Unit Quiz Result',
    'full-length-history': 'Full-Length Test History',
    'full-length-results': 'Full-Length Test Results',
    diagnostic: 'Diagnostic',
    dualpath: 'Fast Path',
    'fast-path': 'Fast Path',
    'micro-lesson': 'Micro-lesson',
    team: 'Team',
    admin: 'Admin',
  };

  if (directTitles[normalizedPath]) return directTitles[normalizedPath];

  const lastSegment = normalizedPath.split('/').pop() || normalizedPath;
  return lastSegment
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function FirstTouchAttributionCapture() {
  const router = useRouter();
  useEffect(() => {
    if (!router.isReady) return;
    const payload = attributionFromRouterQuery(
      router.query as Record<string, string | string[] | undefined>
    );
    tryMergeAttributionFromPayload(payload);
  }, [router.isReady, router.query]);
  return null;
}

function AnalyticsTracking() {
  useFirebasePageViews();
  return null;
}

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const pageTitle = useMemo(() => {
    const base = routeBaseTitle(router.asPath, router.query as Record<string, string | string[] | undefined>);
    return base === HOMEPAGE_SEO_TITLE ? base : `${base} - ${BRAND_NAME}`;
  }, [router.asPath, router.query]);

  return (
    <QueryClientProvider client={queryClient}>
      <Head>
        <title>{pageTitle}</title>
        <meta name="title" content={pageTitle} />
        <meta property="og:title" content={pageTitle} />
        <meta name="twitter:title" content={pageTitle} />
      </Head>
      <ThemeProvider>
        <TooltipProvider>
          <AuthProvider>
            <FirstTouchAttributionCapture />
            <AnalyticsTracking />
            <Component {...pageProps} />
            <Toaster />
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
