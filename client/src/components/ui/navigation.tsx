import Link from "next/link";
import { useRouter } from "next/router";
import { BookOpen, LogOut, User, Home, GraduationCap, ChevronRight, LayoutDashboard } from "lucide-react";
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
import { apSubjects } from "@/lib/ap-subjects";

export default function Navigation() {
  const router = useRouter();
  const location = router.pathname;
  const { user, isAuthenticated, loading } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  // Detect if user is in quiz/test mode
  const isInQuizMode = location === "/quiz" && router.query.unit;

  const handleDisabledClick = (e: React.MouseEvent) => {
    if (isInQuizMode) {
      e.preventDefault();
      toast({
        title: "Test in Progress",
        description: "You cannot navigate away during a test. Use the 'Exit Test' button to leave.",
        duration: 3000,
      });
    }
  };

  const { data: userProfile } = useQuery<{
    success: boolean;
    data: {
      firstName: string;
      lastName: string;
      displayName: string;
      email: string;
    };
  }>({
    queryKey: ["userProfile"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/user/me");
      if (!response.ok) {
        throw new Error("Failed to fetch user profile");
      }
      return response.json();
    },
    enabled: isAuthenticated && !!user,
  });

  const { data: subjectsResponse } = useQuery<{success: boolean, data: any[]}>({
    queryKey: ["subjects"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/user/subjects");
      if (!response.ok) {
        throw new Error("Failed to fetch subjects");
      }
      return response.json();
    },
    enabled: isAuthenticated,
  });

  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to logout",
        variant: "destructive",
      });
    }
  };

  // Helper function to abbreviate course names
  const getAbbreviatedCourseName = (subjectId: string) => {
    if (!subjectId) return "Course";

    const lowerSubjectId = subjectId.toLowerCase();

    if (lowerSubjectId.includes("macro")) return "AP MACRO";
    if (lowerSubjectId.includes("micro")) return "AP MICRO";
    if (lowerSubjectId.includes("csp") || lowerSubjectId.includes("computer")) return "AP CSP";
    if (lowerSubjectId.includes("chem")) return "AP CHEM";
    if (lowerSubjectId.includes("gov")) return "AP GOV";
    if (lowerSubjectId.includes("psych")) return "AP PSYCH";

    return "AP Course";
  };

  // Generate breadcrumb based on current route
  const getBreadcrumbs = () => {
    const breadcrumbs = [];

    // Always start with "Dashboard"
    breadcrumbs.push({ label: "Dashboard", href: "/dashboard" });

    // If on dashboard, only show Dashboard
    if (location === "/dashboard") {
      return breadcrumbs;
    }

    // Add subsequent breadcrumb items based on route
    if (location.startsWith("/learn") || location.startsWith("/courses")) {
      breadcrumbs.push({ label: "Courses", href: "/learn" });
    } else if (location.startsWith("/study")) {
      const subjectId = router.query.subject as string;
      if (subjectId) {
        const abbreviatedName = getAbbreviatedCourseName(subjectId);
        breadcrumbs.push({ label: abbreviatedName, href: `/study?subject=${subjectId}` });
      }
    } else if (location.startsWith("/quiz")) {
      const subjectId = router.query.subject as string;
      const unitId = router.query.unit as string;
      if (subjectId) {
        const abbreviatedName = getAbbreviatedCourseName(subjectId);
        breadcrumbs.push({ label: abbreviatedName, href: `/study?subject=${subjectId}` });
      }
      if (unitId) {
        breadcrumbs.push({ label: `${unitId.replace("unit", "Unit ").replace("bigidea", "Unit ")}`, href: "#" });
      }
    } else if (location.startsWith("/section-review")) {
      const subjectId = router.query.subject as string;
      const testId = router.query.testId as string;
      const sectionCode = router.query.section as string;
      if (subjectId) {
        const abbreviatedName = getAbbreviatedCourseName(subjectId);
        breadcrumbs.push({ label: abbreviatedName, href: `/study?subject=${subjectId}` });
      }
      breadcrumbs.push({ label: "Test History", href: `/full-length-history?subject=${subjectId}` });
      breadcrumbs.push({ label: "Test Results", href: `/full-length-results?subject=${subjectId}&testId=${testId}` });
      breadcrumbs.push({ label: sectionCode === "all" ? "Full Test Review" : "Unit Review", href: "#" });
    } else if (location.startsWith("/full-length-history")) {
      const subjectId = router.query.subject as string;
      if (subjectId) {
        const abbreviatedName = getAbbreviatedCourseName(subjectId);
        breadcrumbs.push({ label: abbreviatedName, href: `/study?subject=${subjectId}` });
      }
      breadcrumbs.push({ label: "Test History", href: "#" });
    } else if (location.startsWith("/full-length-results")) {
      const subjectId = router.query.subject as string;
      const testId = router.query.testId as string;
      if (subjectId) {
        const abbreviatedName = getAbbreviatedCourseName(subjectId);
        breadcrumbs.push({ label: abbreviatedName, href: `/study?subject=${subjectId}` });
      }
      breadcrumbs.push({ label: "Test History", href: `/full-length-history?subject=${subjectId}` });
      breadcrumbs.push({ label: "Test Results", href: "#" });
    } else if (location === "/profile") {
      breadcrumbs.push({ label: "Profile", href: "/profile" });
    }

    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <nav className="border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-50 shadow-sm">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-12 min-h-[3rem]">
          <Link
            href={isAuthenticated ? "/dashboard" : "/"}
            className={`flex items-center space-x-2 sm:space-x-3 flex-shrink-0 ${isInQuizMode ? 'pointer-events-none opacity-60' : ''}`}
            onClick={handleDisabledClick}
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-khan-green rounded-lg flex items-center justify-center">
              <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <span className="text-xl sm:text-2xl font-bold text-khan-gray-dark">APMaster</span>
          </Link>

          {/* Breadcrumb Navigation - Center */}
          {isAuthenticated && (
            <div className="flex items-center space-x-1.5 text-xs text-khan-gray-medium flex-shrink-0">
              {/* APMaster prefix */}
              <span className="font-semibold text-khan-gray-dark whitespace-nowrap">APMaster</span>
              <ChevronRight className="w-3.5 h-3.5 mx-0.5" />
              
              {/* Breadcrumb items */}
              {breadcrumbs.map((crumb, index) => (
                <div key={index} className="flex items-center">
                  {index > 0 && <ChevronRight className="w-3.5 h-3.5 mx-0.5" />}
                  {crumb.href === "#" ? (
                    <span className="font-medium text-khan-gray-dark whitespace-nowrap">{crumb.label}</span>
                  ) : (
                    <Link href={crumb.href} className="hover:text-khan-green transition-colors whitespace-nowrap">
                      {crumb.label}
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center space-x-2 sm:space-x-3">
            {isAuthenticated && (
              <Link
                href="/dashboard"
                className={`text-sm sm:text-base text-khan-gray-medium hover:text-khan-gray-dark font-medium transition-colors ${
                  location === "/dashboard"
                    ? "text-khan-green"
                    : ""
                } ${isInQuizMode ? 'pointer-events-none opacity-60' : ''}`}
                data-testid="link-dashboard"
                onClick={handleDisabledClick}
                title="Dashboard"
              >
                <span className="hidden sm:inline">Dashboard</span>
                <LayoutDashboard className="sm:hidden w-5 h-5" />
              </Link>
            )}

            {loading ? (
              <div className="w-16 sm:w-20 h-8 sm:h-9 bg-gray-200 animate-pulse rounded" />
            ) : isAuthenticated && user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className={`border-2 border-khan-gray-light text-khan-gray-dark hover:bg-khan-background font-medium text-sm sm:text-base px-2 sm:px-4 ${isInQuizMode ? 'opacity-60' : ''}`}
                    data-testid="button-user-menu"
                    disabled={isInQuizMode}
                    onClick={handleDisabledClick}
                    title="Account"
                  >
                    <User className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">Account</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        Welcome back{userProfile?.data?.firstName ? `, ${userProfile.data.firstName}` : ''}
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
                    data-testid="button-profile"
                  >
                    <User className="w-4 h-4 mr-2" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="cursor-pointer text-khan-red focus:text-khan-red"
                    data-testid="button-logout"
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
                    className="border-2 border-khan-green text-khan-green hover:bg-khan-green hover:text-white transition-colors font-semibold text-sm sm:text-base px-3 sm:px-4"
                    data-testid="button-login"
                  >
                    Login
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button className="bg-khan-green text-white hover:bg-khan-green-light transition-colors font-semibold text-sm sm:text-base px-3 sm:px-4" data-testid="button-sign-up">
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