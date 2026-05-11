import { useRouter } from "next/router";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AdminReadOnlyReturnBar() {
  const router = useRouter();

  return (
    <div className="sticky top-0 z-50 border-b border-red-200 bg-red-600 px-4 py-2 shadow-sm dark:border-red-900/70">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
        <p className="min-w-0 truncate text-sm font-semibold text-white">
          Admin read-only learner view
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => router.push("/admin?tab=users")}
          className="h-8 shrink-0 rounded-full bg-white px-3 text-xs font-bold text-red-700 hover:bg-red-50 hover:text-red-800"
        >
          <ShieldAlert className="mr-1 h-3.5 w-3.5" />
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
          Back to Admin Users
        </Button>
      </div>
    </div>
  );
}
