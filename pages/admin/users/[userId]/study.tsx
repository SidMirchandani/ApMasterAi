import { useRouter } from "next/router";
import Study from "../../../../client/src/pages/study";

export default function AdminUserStudyPage() {
  const router = useRouter();
  const userId = typeof router.query.userId === "string" ? router.query.userId : "";

  if (!router.isReady || !userId) return null;

  return <Study adminReadOnlyTargetUserId={userId} />;
}
