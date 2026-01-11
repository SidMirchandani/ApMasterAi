import Link from "next/link";
import { useRouter } from "next/router";
import { BookOpen, LogOut, User, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/auth-context";
import { logout } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { useIsMobile } from "@/lib/hooks/useMobile";

export default function Navigation() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, isAuthenticated, loading } = useAuth();
  const location = router.pathname;
  const isMobile = useIsMobile();

  // Prevent navigating away during a quiz
  const isInQuizMode = location === "/quiz" && router.query.unit;

  const handleDisabledClick = (e: React.MouseEvent) => {
    if (isInQuizMode) {
      e.preventDefault();
      toast({
        title: "Practice Quiz in Progress",
        description: "You cannot navigate away. Use ‘Exit Quiz’ to leave.",
        duration: 3000,
      });
    }
  };

  // User profile
  const { data: userProfile } = useQuery({
    queryKey: ["userProfile"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/user/me");
      if (!res.ok) throw new Error("Failed to fetch user profile");
      return res.json();
    },
    enabled: isAuthenticated && !!user,
  });

  // Abbreviate course names
  const shortName = (id: string) => {
    if (!id) return "Course";
    const s = id.toLowerCase();
    if (s.includes("macro")) return "AP MACRO";
    if (s.includes("micro")) return "AP MICRO";
    if (s.includes("csp") || s.includes("computer")) return "AP CSP";
    if (s.includes("chem")) return "AP CHEM";
    if (s.includes("gov")) return "AP GOV";
    if (s.includes("psych")) return "AP PSYCH";
    return "AP Course";
  };

  // Breadcrumb builder (unchanged logic)
  const getBreadcrumbs = () => {
    const bc: { label: string; href: string }[] = [];

    // Always Level-1
    bc.push({ label: "Dashboard", href: "/dashboard" });

    if (location === "/dashboard") return bc;

    if (location.startsWith("/study")) {
      const subject = router.query.subject as string;
      if (subject)
        bc.push({
          label: shortName(subject),
          href: `/study?subject=${subject}`,
        });
    }

    if (location.startsWith("/quiz")) {
      const subject = router.query.subject as string;
      const unit = router.query.unit as string;

      if (subject)
        bc.push({
          label: shortName(subject),
          href: `/study?subject=${subject}`,
        });

      if (unit)
        bc.push({
          label: unit.replace("unit", "Unit ").replace("bigidea", "Unit "),
          href: "#",
        });
    }

    if (location.startsWith("/full-length-history")) {
      const subject = router.query.subject as string;
      if (subject)
        bc.push({
          label: shortName(subject),
          href: `/study?subject=${subject}`,
        });

      bc.push({ label: "Test History", href: "#" });
    }

    if (location.startsWith("/full-length-results")) {
      const subject = router.query.subject as string;
      const testId = router.query.testId as string;

      if (subject)
        bc.push({
          label: shortName(subject),
          href: `/study?subject=${subject}`,
        });

      bc.push({
        label: "Test History",
        href: `/full-length-history?subject=${subject}`,
      });

      bc.push({ label: "Test Results", href: "#" });
    }

    if (location.startsWith("/section-review")) {
      const subject = router.query.subject as string;
      const testId = router.query.testId as string;
      const section = router.query.section as string;

      if (subject)
        bc.push({
          label: shortName(subject),
          href: `/study?subject=${subject}`,
        });

      bc.push({
        label: "Test History",
        href: `/full-length-history?subject=${subject}`,
      });

      bc.push({
        label: "Test Results",
        href: `/full-length-results?subject=${subject}&testId=${testId}`,
      });

      bc.push({
        label: section === "all" ? "Full Test Review" : "Unit Review",
        href: "#",
      });
    }

    if (location === "/profile") {
      bc.push({ label: "Profile", href: "/profile" });
    }

    return bc;
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <nav className="border-b border-border bg-white/80 backdrop-blur-md sticky top-0 z-50 shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* LEFT: APMaster + Breadcrumb */}
          <div className="flex items-center gap-8">
            {/* APMaster root */}
            <Link
              href={isAuthenticated ? "/dashboard" : "/"}
              className={`flex items-center gap-3 transition-opacity hover:opacity-90 ${
                isInQuizMode ? "pointer-events-none opacity-60" : ""
              }`}
              onClick={handleDisabledClick}
            >
              <div className="w-9 h-9 bg-khan-green rounded-xl flex items-center justify-center shadow-sm shadow-khan-green/20">
                <BookOpen className="w-5 h-5 text-white" />
              </div>

              <span className="text-xl font-bold text-foreground tracking-tight">
                APMaster
              </span>
            </Link>

            {/* Breadcrumb (Dashboard → AP…) */}
            {isAuthenticated && breadcrumbs.length > 0 && (
              <div className="hidden md:flex items-center gap-2 text-sm font-medium text-muted-foreground">
                {breadcrumbs.map((crumb, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
                    {crumb.href === "#" ? (
                      <span className="text-foreground whitespace-nowrap">
                        {crumb.label}
                      </span>
                    ) : (
                      <Link
                        href={crumb.href}
                        className="hover:text-khan-green transition-colors whitespace-nowrap"
                        onClick={handleDisabledClick}
                      >
                        {crumb.label}
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT: ACCOUNT ONLY */}
          <div className="flex items-center gap-4">
            {loading ? (
              <div className="w-10 h-10 bg-muted animate-pulse rounded-full" />
            ) : isAuthenticated && user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`h-10 w-10 p-0 rounded-full border border-border overflow-hidden hover:bg-accent transition-all ${
                      isInQuizMode ? "opacity-60 pointer-events-none" : ""
                    }`}
                  >
                    <div className="w-full h-full flex items-center justify-center bg-muted">
                      <User className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        Welcome back
                        {userProfile?.data?.firstName
                          ? `, ${userProfile.data.firstName}`
                          : ""}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user?.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    onClick={() => router.push("/profile")}
                    className="cursor-pointer"
                  >
                    <User className="w-4 h-4 mr-2" />
                    Profile
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={logout}
                    className="cursor-pointer text-khan-red focus:text-khan-red"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Link href="/login">
                  <Button
                    variant="ghost"
                    className="text-foreground hover:text-khan-green font-medium"
                  >
                    Login
                  </Button>
                </Link>

                <Link href="/signup">
                  <Button className="bg-khan-green text-white hover:bg-khan-green/90 font-bold px-6 shadow-sm shadow-khan-green/10">
                    Sign Up
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
