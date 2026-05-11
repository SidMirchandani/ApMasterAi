import { useRouter } from "next/router";
import Dashboard from "../../../../client/src/pages/dashboard";

export default function AdminUserDashboardPage() {
  const router = useRouter();
  const userId = typeof router.query.userId === "string" ? router.query.userId : "";

  if (!router.isReady || !userId) return null;

  return <Dashboard adminReadOnlyTargetUserId={userId} />;
}
