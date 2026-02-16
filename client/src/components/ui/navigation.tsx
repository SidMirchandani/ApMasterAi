import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { BookOpen, LogOut, User, ChevronRight, Sun, Moon, Menu, X, Info, Users } from "lucide-react";
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
import { useTheme } from "@/contexts/theme-context";

export default function Navigation() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, isAuthenticated, loading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = router.pathname;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isInQuizMode = location === "/quiz" && router.query.unit;

  const handleDisabledClick = (e: React.MouseEvent) => {
    if (isInQuizMode) {
      e.preventDefault();
      toast({
        title: "Practice Quiz in Progress",
        description: "You cannot navigate away. Use 'Exit Quiz' to leave.",
        duration: 3000,
      });
    }
  };

  const { data: userProfile } = useQuery({
    queryKey: ["userProfile"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/user/me");
      if (!res.ok) throw new Error("Failed to fetch user profile");
      return res.json();
    },
    enabled: isAuthenticated && !!user,
  });

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

  const getBreadcrumbs = () => {
    const bc: { label: string; href: string }[] = [];
    bc.push({ label: "Dashboard", href: "/dashboard" });

    if (location === "/dashboard") return bc;

    const subject = router.query.subject as string;

    if (location.startsWith("/study")) {
      if (subject) bc.push({ label: shortName(subject), href: `/study?subject=${subject}` });
    }

    if (location.startsWith("/quiz")) {
      const unit = router.query.unit as string;
      if (subject) bc.push({ label: shortName(subject), href: `/study?subject=${subject}` });
      if (unit) bc.push({ label: unit.replace("unit", "Unit ").replace("bigidea", "Unit "), href: "#" });
    }

    if (location.startsWith("/bookmarks")) {
      if (subject) bc.push({ label: shortName(subject), href: `/study?subject=${subject}` });
      bc.push({ label: "Saved Questions", href: "#" });
    }

    if (location.startsWith("/review")) {
      if (subject) bc.push({ label: shortName(subject), href: `/study?subject=${subject}` });
      bc.push({ label: "Practice Again", href: "#" });
    }

    if (location.startsWith("/analytics")) {
      if (subject) bc.push({ label: shortName(subject), href: `/study?subject=${subject}` });
      bc.push({ label: "Analytics", href: "#" });
    }

    if (location.startsWith("/full-length-history")) {
      if (subject) bc.push({ label: shortName(subject), href: `/study?subject=${subject}` });
      bc.push({ label: "Test History", href: "#" });
    }

    if (location.startsWith("/full-length-results")) {
      const testId = router.query.testId as string;
      if (subject) bc.push({ label: shortName(subject), href: `/study?subject=${subject}` });
      bc.push({ label: "Test History", href: `/full-length-history?subject=${subject}` });
      bc.push({ label: "Test Results", href: "#" });
    }

    if (location.startsWith("/section-review")) {
      const testId = router.query.testId as string;
      const section = router.query.section as string;
      if (subject) bc.push({ label: shortName(subject), href: `/study?subject=${subject}` });
      bc.push({ label: "Test History", href: `/full-length-history?subject=${subject}` });
      bc.push({ label: "Test Results", href: `/full-length-results?subject=${subject}&testId=${testId}` });
      bc.push({ label: section === "all" ? "Full Test Review" : "Unit Review", href: "#" });
    }

    if (location === "/profile") {
      bc.push({ label: "Profile", href: "#" });
    }

    return bc;
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <nav className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 sticky top-0 z-50 shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* LEFT: Logo + Breadcrumbs */}
          <div className="flex items-center gap-4 min-w-0">
            <Link
              href={isAuthenticated ? "/dashboard" : "/"}
              className={`flex items-center gap-2 transition-opacity hover:opacity-90 flex-shrink-0 ${
                isInQuizMode ? "pointer-events-none opacity-60" : ""
              }`}
              onClick={handleDisabledClick}
            >
              <div className="w-8 h-8 bg-[#36b37e] rounded flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold text-[#2d3b45] dark:text-white tracking-tight hidden sm:inline">
                APMaster
              </span>
            </Link>

            {isAuthenticated && breadcrumbs.length > 0 && (
              <div className="hidden lg:flex items-center gap-1.5 text-[13px] font-semibold text-gray-400 min-w-0">
                {breadcrumbs.map((crumb, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <ChevronRight className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 flex-shrink-0" />
                    {crumb.href === "#" ? (
                      <span className="text-gray-500 dark:text-gray-400 whitespace-nowrap truncate max-w-[150px]">
                        {crumb.label}
                      </span>
                    ) : (
                      <Link
                        href={crumb.href}
                        className="hover:text-[#36b37e] transition-colors whitespace-nowrap truncate max-w-[150px]"
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

          {/* RIGHT: Theme + User menu */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className="h-8 w-8 p-0 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4 text-yellow-400" />
              ) : (
                <Moon className="w-4 h-4 text-gray-500" />
              )}
            </Button>

            {loading ? (
              <div className="w-8 h-8 bg-gray-100 animate-pulse rounded-full" />
            ) : isAuthenticated && user ? (
              <>
                {/* Mobile hamburger */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="h-8 w-8 p-0 md:hidden"
                >
                  {mobileMenuOpen ? (
                    <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  ) : (
                    <Menu className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  )}
                </Button>

                {/* Desktop user dropdown */}
                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`h-8 w-8 p-0 rounded-full border border-gray-200 dark:border-gray-700 overflow-hidden hover:bg-gray-50 dark:hover:bg-gray-800 transition-all hidden md:flex ${
                        isInQuizMode ? "opacity-60 pointer-events-none" : ""
                      }`}
                    >
                      <div className="w-full h-full flex items-center justify-center bg-gray-50 dark:bg-gray-800">
                        <User className="w-4 h-4 text-gray-400" />
                      </div>
                    </Button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">
                          {userProfile?.data?.firstName
                            ? `${userProfile.data.firstName}`
                            : "Welcome"}
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
                      onClick={() => router.push("/about")}
                      className="cursor-pointer"
                    >
                      <Info className="w-4 h-4 mr-2" />
                      About Us
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => router.push("/team")}
                      className="cursor-pointer"
                    >
                      <Users className="w-4 h-4 mr-2" />
                      Our Team
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={async () => {
                        await logout();
                        router.push("/");
                      }}
                      className="cursor-pointer text-red-600 focus:text-red-600"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Link href="/about" className="text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-[#36b37e] transition-colors hidden md:block">
                  About
                </Link>
                <Link href="/login">
                  <Button
                    variant="ghost"
                    className="text-gray-600 hover:text-[#36b37e] font-bold text-sm"
                  >
                    Login
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button className="bg-[#36b37e] hover:bg-[#2fa371] text-white font-bold px-5 h-9 rounded shadow-sm text-sm">
                    Sign Up
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {isAuthenticated && mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 space-y-1">
          <Link
            href="/dashboard"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2.5 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            Dashboard
          </Link>
          <Link
            href="/profile"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2.5 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            Profile
          </Link>
          <Link
            href="/about"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2.5 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            About Us
          </Link>
          <Link
            href="/team"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2.5 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            Our Team
          </Link>
          <div className="border-t border-gray-200 dark:border-gray-700 mt-2 pt-2">
            <button
              onClick={async () => {
                setMobileMenuOpen(false);
                await logout();
                router.push("/");
              }}
              className="block w-full text-left px-3 py-2.5 rounded-md text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              Logout
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
