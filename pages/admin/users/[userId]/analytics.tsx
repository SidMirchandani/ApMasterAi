import { useRouter } from "next/router";
import AnalyticsPage from "../../../../client/src/pages/analytics";

export default function AdminUserAnalyticsPage() {
  const router = useRouter();
  const userId = typeof router.query.userId === "string" ? router.query.userId : "";

  if (!router.isReady || !userId) return null;

  return <AnalyticsPage adminReadOnlyTargetUserId={userId} />;
}
