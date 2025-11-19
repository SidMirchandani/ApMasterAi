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
        title: "Test in Progress",
        description:
          "You cannot navigate away during a test. Use ‘Exit Test’ to leave.",
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
    <nav className="border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-50 shadow-sm">
      <div className="mx-auto max-w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-12">
          {/* LEFT: APMaster + Breadcrumb */}
          <div className="flex items-center space-x-3">
            {/* APMaster root */}
            <Link
              href={isAuthenticated ? "/dashboard" : "/"}
              className={`flex items-center space-x-2 flex-shrink-0 ${
                isInQuizMode ? "pointer-events-none opacity-60" : ""
              }`}
              onClick={handleDisabledClick}
            >
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-khan-green rounded-lg flex items-center justify-center">
                <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>

              <span className="text-xl sm:text-2xl font-bold text-khan-gray-dark">
                APMaster
              </span>
            </Link>

            {/* Breadcrumb (Dashboard → AP…) */}
            {isAuthenticated && breadcrumbs.length > 0 && (
              <div className="flex items-center space-x-1.5 text-sm sm:text-base text-khan-gray-medium">
                {breadcrumbs.map((crumb, i) => (
                  <div key={i} className="flex items-center">
                    <ChevronRight className="w-3.5 h-3.5 mx-1" />
                    {crumb.href === "#" ? (
                      <span className="font-semibold text-khan-gray-dark whitespace-nowrap text-sm sm:text-base">
                        {crumb.label}
                      </span>
                    ) : (
                      <Link
                        href={crumb.href}
                        className="font-semibold hover:text-khan-green transition-colors whitespace-nowrap text-sm sm:text-base"
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
          <div className="flex items-center space-x-3">
            {loading ? (
              <div className="w-16 h-8 bg-gray-200 animate-pulse rounded" />
            ) : isAuthenticated && user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className={`border-2 border-khan-gray-light text-khan-gray-dark hover:bg-khan-background font-medium text-sm sm:text-base px-3 ${
                      isInQuizMode ? "opacity-60 pointer-events-none" : ""
                    }`}
                  >
                    <User className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">Account</span>
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
                    variant="outline"
                    className="border-2 border-khan-green text-khan-green hover:bg-khan-green hover:text-white font-semibold px-4"
                  >
                    Login
                  </Button>
                </Link>

                <Link href="/signup">
                  <Button className="bg-khan-green text-white hover:bg-khan-green-light font-semibold px-4">
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
