import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { LayoutDashboard, LogOut, User, ChevronRight, Sun, Moon, Menu, X, Info, Users, Sparkles } from "lucide-react";
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
import { getSubjectShortName } from "../../../../lib/subject-display-names";
import { getApiCodeForSubject } from "@/subjects";

export default function Navigation() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, isAuthenticated, loading } = useAuth();
  const { theme, toggleTheme, mounted } = useTheme();
  const location = router.pathname;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isInQuizMode =
    (location === "/quiz" && router.query.unit && router.query.review !== "1") ||
    (location === "/diagnostic" && router.query.subject);

  const handleDisabledClick = (e: React.MouseEvent) => {
    if (isInQuizMode) {
      e.preventDefault();
      const isDiagnostic = location === "/diagnostic";
      toast({
        title: isDiagnostic ? "Diagnostic In Progress" : "Practice Quiz in Progress",
        description: isDiagnostic
          ? "You cannot navigate away. Use 'Save & Exit' to leave."
          : "You cannot navigate away. Use 'Exit Quiz' to leave.",
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

  const getBreadcrumbs = () => {
    const bc: { label: string; href: string }[] = [];
    bc.push({ label: "Dashboard", href: "/dashboard" });

    if (location === "/dashboard") return bc;

    const subject = router.query.subject as string;
    const courseLabel = subject ? getSubjectShortName(getApiCodeForSubject(subject) ?? subject) : "AP Course";

    if (location.startsWith("/study")) {
      bc.push({ label: courseLabel, href: subject ? `/study?subject=${subject}` : "/study" });
    }
    if (location.startsWith("/quiz")) {
      const unit = router.query.unit as string;
      if (subject) bc.push({ label: courseLabel, href: `/study?subject=${subject}` });
      if (unit) bc.push({ label: unit.replace("unit", "Unit ").replace("bigidea", "Unit "), href: "#" });
    }
    if (location.startsWith("/bookmarks")) {
      if (subject) bc.push({ label: courseLabel, href: `/study?subject=${subject}` });
      bc.push({ label: "Saved Questions", href: "#" });
    }
    if (location.startsWith("/review")) {
      if (subject) bc.push({ label: courseLabel, href: `/study?subject=${subject}` });
      bc.push({ label: "Review Questions", href: "#" });
    }
    if (location.startsWith("/analytics")) {
      if (subject) bc.push({ label: courseLabel, href: `/study?subject=${subject}` });
      bc.push({ label: "Analytics", href: "#" });
    }
    if (location.startsWith("/full-length-history")) {
      if (subject) bc.push({ label: courseLabel, href: `/study?subject=${subject}` });
      bc.push({ label: "Quiz/Test History", href: "#" });
    }
    if (location.startsWith("/full-length-results")) {
      if (subject) bc.push({ label: courseLabel, href: `/study?subject=${subject}` });
      bc.push({ label: "Quiz/Test History", href: `/full-length-history?subject=${subject}` });
      bc.push({ label: "Test Results", href: "#" });
    }
    if (location.startsWith("/section-review")) {
      const testId = router.query.testId as string;
      const section = router.query.section as string;
      if (subject) bc.push({ label: courseLabel, href: `/study?subject=${subject}` });
      bc.push({ label: "Quiz/Test History", href: `/full-length-history?subject=${subject}` });
      bc.push({ label: "Test Results", href: `/full-length-results?subject=${subject}&testId=${testId}` });
      bc.push({ label: section === "all" ? "Full Test Review" : "Unit Review", href: "#" });
    }
    if (location === "/profile") {
      bc.push({ label: "Profile", href: "#" });
    }
    if (location.startsWith("/diagnostic")) {
      if (subject) bc.push({ label: courseLabel, href: `/study?subject=${subject}` });
      bc.push({ label: "Diagnostic", href: "#" });
    }
    if (location.startsWith("/dualpath")) {
      if (subject) bc.push({ label: courseLabel, href: `/study?subject=${subject}` });
      bc.push({ label: "DualPath", href: "#" });
    }
    if (location === "/about") {
      bc.push({ label: "About", href: "#" });
    }
    if (location === "/team") {
      bc.push({ label: "Team", href: "#" });
    }

    return bc;
  };

  const breadcrumbs = getBreadcrumbs();
  const initials = userProfile?.data?.firstName
    ? userProfile.data.firstName.charAt(0).toUpperCase()
    : null;

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ease-out ${
          scrolled
            ? "bg-white/95 dark:bg-[#0B0F1A]/95 backdrop-blur-xl shadow-sm border-b border-slate-200/80 dark:border-slate-800/80"
            : "bg-white/80 dark:bg-[#0B0F1A]/80 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-800/60"
        }`}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-[3.75rem]">

            {/* LEFT: Logo + Breadcrumbs */}
            <div className="flex items-center gap-3 min-w-0">
              <Link
                href={isAuthenticated ? "/dashboard" : "/"}
                className={`flex items-center gap-2 transition-all hover:opacity-85 flex-shrink-0 group ${
                  isInQuizMode ? "pointer-events-none opacity-50" : ""
                }`}
                onClick={handleDisabledClick}
              >
                <div className="w-8 h-8 bg-blue-600 dark:bg-blue-500 rounded-lg flex items-center justify-center shadow-sm group-hover:shadow-md transition-all duration-150 group-hover:scale-[1.03]">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <span className="text-[15px] font-bold text-slate-900 dark:text-white tracking-tight hidden sm:inline">
                  APMaster
                </span>
              </Link>

              {isAuthenticated && breadcrumbs.length > 0 && (
                <div className="hidden md:flex items-center gap-1 text-[12.5px] font-medium text-slate-400 min-w-0 overflow-x-auto overflow-y-hidden flex-nowrap">
                  {breadcrumbs.map((crumb, i) => (
                    <div key={i} className="flex items-center gap-1 flex-shrink-0">
                      <ChevronRight className="w-3 h-3 text-slate-300 dark:text-slate-700 flex-shrink-0" />
                      {crumb.href === "#" ? (
                        <span className="text-slate-600 dark:text-slate-300 font-semibold whitespace-nowrap truncate max-w-[140px]">
                          {crumb.label}
                        </span>
                      ) : (
                        <Link
                          href={crumb.href}
                          className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-100 whitespace-nowrap truncate max-w-[140px]"
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

            {/* RIGHT: Theme + Nav links + User menu */}
            <div className="flex items-center gap-1">
              {/* Public nav links */}
              <Link
                href="/about"
                onClick={handleDisabledClick}
                className={`text-[13.5px] font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors duration-100 hidden md:block px-2.5 py-1.5 rounded-md hover:bg-slate-100/70 dark:hover:bg-slate-800/70 ${isInQuizMode ? "opacity-50 pointer-events-none" : ""}`}
              >
                About
              </Link>
              <Link
                href="/team"
                onClick={handleDisabledClick}
                className={`text-[13.5px] font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors duration-100 hidden md:block px-2.5 py-1.5 rounded-md hover:bg-slate-100/70 dark:hover:bg-slate-800/70 ${isInQuizMode ? "opacity-50 pointer-events-none" : ""}`}
              >
                Team
              </Link>

              {/* Theme toggle */}
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleTheme}
                className="h-8 w-8 p-0 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-all ml-0.5"
                title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              >
                {mounted && theme === "dark" ? (
                  <Sun className="w-[15px] h-[15px] text-amber-400" />
                ) : (
                  <Moon className="w-[15px] h-[15px] text-slate-500" />
                )}
              </Button>

              {loading ? (
                <div className="w-8 h-8 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-md ml-1" />
              ) : isAuthenticated && user ? (
                <>
                  {/* Mobile hamburger */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    className={`h-8 w-8 p-0 md:hidden rounded-md ml-1 ${isInQuizMode ? "opacity-50 pointer-events-none" : ""}`}
                  >
                    {mobileMenuOpen ? (
                      <X className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                    ) : (
                      <Menu className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                    )}
                  </Button>

                  {/* Desktop user dropdown */}
                  <DropdownMenu modal={false}>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`h-8 w-8 p-0 rounded-md ml-1 overflow-hidden border border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-600 transition-all duration-150 hidden md:flex ${
                          isInQuizMode ? "opacity-50 pointer-events-none" : ""
                        }`}
                      >
                        <div className="w-full h-full flex items-center justify-center bg-blue-600 dark:bg-blue-500">
                          {initials ? (
                            <span className="text-[11px] font-black text-white">{initials}</span>
                          ) : (
                            <User className="w-3.5 h-3.5 text-white" />
                          )}
                        </div>
                      </Button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent
                      align="end"
                      className="w-52 rounded-xl p-1.5 border border-slate-200 dark:border-slate-800 shadow-lg bg-white dark:bg-slate-900 mt-1"
                    >
                      <DropdownMenuLabel className="font-normal px-2.5 py-2">
                        <div className="flex flex-col gap-0.5">
                          <p className="text-[13px] font-semibold text-slate-900 dark:text-white leading-none">
                            {userProfile?.data?.firstName ?? "Welcome"}
                          </p>
                          <p className="text-[11px] leading-none text-slate-400 dark:text-slate-500 mt-0.5">
                            {user?.email}
                          </p>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator className="my-1 bg-slate-100 dark:bg-slate-800" />
                      <DropdownMenuItem
                        onClick={() => router.push("/profile")}
                        className="cursor-pointer rounded-lg px-2.5 py-2 text-[13px] text-slate-700 dark:text-slate-300"
                      >
                        <User className="w-3.5 h-3.5 mr-2 text-slate-400" />
                        Profile
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => !isInQuizMode && router.push("/about")}
                        className={`cursor-pointer rounded-lg px-2.5 py-2 text-[13px] text-slate-700 dark:text-slate-300 ${isInQuizMode ? "opacity-50 pointer-events-none" : ""}`}
                      >
                        <Info className="w-3.5 h-3.5 mr-2 text-slate-400" />
                        About Us
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => !isInQuizMode && router.push("/team")}
                        className={`cursor-pointer rounded-lg px-2.5 py-2 text-[13px] text-slate-700 dark:text-slate-300 ${isInQuizMode ? "opacity-50 pointer-events-none" : ""}`}
                      >
                        <Users className="w-3.5 h-3.5 mr-2 text-slate-400" />
                        Our Team
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="my-1 bg-slate-100 dark:bg-slate-800" />
                      <DropdownMenuItem
                        onClick={async () => {
                          await logout();
                          router.push("/");
                        }}
                        className="cursor-pointer text-red-600 dark:text-red-400 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-500/10 rounded-lg px-2.5 py-2 text-[13px]"
                      >
                        <LogOut className="w-3.5 h-3.5 mr-2" />
                        Sign out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                <div className="flex items-center gap-1.5 ml-1">
                  <Link href="/login">
                    <Button
                      variant="ghost"
                      className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-medium text-[13.5px] rounded-md px-3 h-8 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-100"
                    >
                      Log in
                    </Button>
                  </Link>
                  <Link href="/signup">
                    <Button className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-semibold px-4 h-8 rounded-md shadow-sm hover:shadow-md transition-all duration-150 hover:scale-[1.02] active:scale-[0.98] text-[13.5px]">
                      Get Started
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Mobile breadcrumb strip */}
          {isAuthenticated && breadcrumbs.length > 0 && (
            <div className="flex md:hidden items-center gap-1 text-[11.5px] font-medium text-slate-400 min-w-0 overflow-x-auto overflow-y-hidden flex-nowrap py-1.5 -mb-1.5">
              {breadcrumbs.map((crumb, i) => (
                <div key={i} className="flex items-center gap-1 flex-shrink-0">
                  {i > 0 && <ChevronRight className="w-2.5 h-2.5 text-slate-300 dark:text-slate-700 flex-shrink-0" />}
                  {crumb.href === "#" ? (
                    <span className="text-slate-600 dark:text-slate-300 font-semibold whitespace-nowrap">{crumb.label}</span>
                  ) : (
                    <Link
                      href={crumb.href}
                      className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors whitespace-nowrap"
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

        {/* Mobile menu */}
        {isAuthenticated && mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B0F1A] px-4 py-3 space-y-0.5 animate-slide-down">
            <Link
              href="/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13.5px] font-semibold bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400"
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </Link>
            <Link
              href="/profile"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13.5px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <User className="w-4 h-4 text-slate-400" />
              Profile
            </Link>
            <Link
              href="/about"
              onClick={(e) => {
                if (isInQuizMode) e.preventDefault();
                else setMobileMenuOpen(false);
              }}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13.5px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${isInQuizMode ? "opacity-50 pointer-events-none" : ""}`}
            >
              <Info className="w-4 h-4 text-slate-400" />
              About Us
            </Link>
            <Link
              href="/team"
              onClick={(e) => {
                if (isInQuizMode) e.preventDefault();
                else setMobileMenuOpen(false);
              }}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13.5px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${isInQuizMode ? "opacity-50 pointer-events-none" : ""}`}
            >
              <Users className="w-4 h-4 text-slate-400" />
              Our Team
            </Link>
            <div className="border-t border-slate-100 dark:border-slate-800 mt-1.5 pt-1.5">
              <button
                onClick={async () => {
                  setMobileMenuOpen(false);
                  await logout();
                  router.push("/");
                }}
                className="flex items-center gap-3 w-full text-left px-3 py-2.5 rounded-lg text-[13.5px] font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Spacer */}
      <div className={isAuthenticated && breadcrumbs.length > 0 ? "h-[5.5rem] md:h-[3.75rem]" : "h-[3.75rem]"} />
    </>
  );
}
