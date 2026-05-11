import { useRouter } from "next/router";
import FullLengthHistoryPage from "../../../../client/src/pages/full-length-history";

export default function AdminUserFullLengthHistoryPage() {
  const router = useRouter();
  const userId = typeof router.query.userId === "string" ? router.query.userId : "";

  if (!router.isReady || !userId) return null;

  return <FullLengthHistoryPage adminReadOnlyTargetUserId={userId} />;
}
