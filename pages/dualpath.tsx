import { useEffect } from 'react';
import { useRouter } from 'next/router';

/** Legacy route — redirects to /fast-path preserving subject query. */
export default function DualPathRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    if (!router.isReady) return;
    const subject = router.query.subject;
    const target =
      typeof subject === 'string'
        ? `/fast-path?subject=${encodeURIComponent(subject)}`
        : '/fast-path';
    router.replace(target);
  }, [router.isReady, router.query.subject]);

  return null;
}
