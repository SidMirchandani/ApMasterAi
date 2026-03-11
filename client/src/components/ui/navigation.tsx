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

export default function Navigation() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, isAuthenticated, loading } = useAuth();
  const { theme, toggleTheme, mounted } = useTheme();
  const location = router.pathname;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isInQuizMode =
    (location === "/quiz" && router.query.unit) ||
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
      bc.push({ label: "Review Questions", href: "#" });
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

    if (location.startsWith("/diagnostic")) {
      if (subject) bc.push({ label: shortName(subject), href: `/study?subject=${subject}` });
      bc.push({ label: "Diagnostic", href: "#" });
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

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? "bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-slate-200/60 dark:border-slate-700/60 shadow-[0_4px_24px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.25)]"
            : "bg-transparent border-b border-transparent"
        }`}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-[4.25rem]">
            {/* LEFT: Logo + Breadcrumbs */}
            <div className="flex items-center gap-4 min-w-0">
              <Link
                href={isAuthenticated ? "/dashboard" : "/"}
                className={`flex items-center gap-2.5 transition-all hover:opacity-90 flex-shrink-0 group ${
                  isInQuizMode ? "pointer-events-none opacity-60" : ""
                }`}
                onClick={handleDisabledClick}
              >
                <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-[0_2px_8px_rgba(16,185,129,0.25)] group-hover:shadow-[0_4px_14px_rgba(16,185,129,0.35)] transition-all duration-300 group-hover:scale-105">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg font-display font-bold text-slate-900 dark:text-white tracking-tight hidden sm:inline">
                  APMaster
                </span>
              </Link>

              {isAuthenticated && breadcrumbs.length > 0 && (
                <div className="hidden md:flex items-center gap-1.5 text-[13px] font-medium text-slate-400 min-w-0 overflow-x-auto overflow-y-hidden flex-nowrap">
                  {breadcrumbs.map((crumb, i) => (
                    <div key={i} className="flex items-center gap-1.5 flex-shrink-0">
                      <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 flex-shrink-0" />
                      {crumb.href === "#" ? (
                        <span className="text-slate-500 dark:text-slate-400 whitespace-nowrap truncate max-w-[150px]">
                          {crumb.label}
                        </span>
                      ) : (
                        <Link
                          href={crumb.href}
                          className="hover:text-emerald-500 transition-colors whitespace-nowrap truncate max-w-[150px]"
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

            {/* RIGHT: Theme + About/Team + User menu */}
            <div className="flex items-center gap-1.5">
              {!isAuthenticated && (
                <>
                  <Link
                    href="/about"
                    onClick={handleDisabledClick}
                    className={`text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors hidden md:block px-3 py-2 rounded-xl hover:bg-slate-100/60 dark:hover:bg-slate-800/60 ${isInQuizMode ? "opacity-60 pointer-events-none" : ""}`}
                  >
                    About
                  </Link>
                  <Link
                    href="/team"
                    onClick={handleDisabledClick}
                    className={`text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors hidden md:block px-3 py-2 rounded-xl hover:bg-slate-100/60 dark:hover:bg-slate-800/60 ${isInQuizMode ? "opacity-60 pointer-events-none" : ""}`}
                  >
                    Team
                  </Link>
                </>
              )}

              {isAuthenticated && (
                <>
                  <Link
                    href="/about"
                    onClick={handleDisabledClick}
                    className={`text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-emerald-500 transition-colors hidden md:block px-3 py-2 rounded-xl hover:bg-slate-100/60 dark:hover:bg-slate-800/60 ${isInQuizMode ? "opacity-60 pointer-events-none" : ""}`}
                  >
                    About
                  </Link>
                  <Link
                    href="/team"
                    onClick={handleDisabledClick}
                    className={`text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-emerald-500 transition-colors hidden md:block px-3 py-2 rounded-xl hover:bg-slate-100/60 dark:hover:bg-slate-800/60 ${isInQuizMode ? "opacity-60 pointer-events-none" : ""}`}
                  >
                    Team
                  </Link>
                </>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={toggleTheme}
                className="h-9 w-9 p-0 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              >
                {mounted && theme === "dark" ? (
                  <Sun className="w-4 h-4 text-amber-400 transition-transform hover:rotate-45" />
                ) : (
                  <Moon className="w-4 h-4 text-slate-500 transition-transform hover:-rotate-12" />
                )}
              </Button>

              {loading ? (
                <div className="w-9 h-9 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-xl" />
              ) : isAuthenticated && user ? (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    className={`h-9 w-9 p-0 md:hidden rounded-xl ${isInQuizMode ? "opacity-60 pointer-events-none" : ""}`}
                  >
                    {mobileMenuOpen ? (
                      <X className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                    ) : (
                      <Menu className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                    )}
                  </Button>

                  <DropdownMenu modal={false}>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`h-9 w-9 p-0 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden hover:border-emerald-300 dark:hover:border-emerald-700 transition-all hidden md:flex ${
                          isInQuizMode ? "opacity-60 pointer-events-none" : ""
                        }`}
                      >
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-500 to-teal-500">
                          {userProfile?.data?.firstName ? (
                            <span className="text-xs font-black text-white">
                              {userProfile.data.firstName.charAt(0).toUpperCase()}
                            </span>
                          ) : (
                            <User className="w-4 h-4 text-white" />
                          )}
                        </div>
                      </Button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2 border border-slate-200 dark:border-slate-700 shadow-[0_8px_30px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.4)]">
                      <DropdownMenuLabel className="font-normal px-3 py-2.5">
                        <div className="flex flex-col space-y-1">
                          <p className="text-sm font-semibold leading-none">
                            {userProfile?.data?.firstName
                              ? `${userProfile.data.firstName}`
                              : "Welcome"}
                          </p>
                          <p className="text-xs leading-none text-muted-foreground">
                            {user?.email}
                          </p>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator className="my-1" />
                      <DropdownMenuItem
                        onClick={() => router.push("/profile")}
                        className="cursor-pointer rounded-xl px-3 py-2.5"
                      >
                        <User className="w-4 h-4 mr-2.5 text-slate-500" />
                        Profile
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => !isInQuizMode && router.push("/about")}
                        className={`cursor-pointer rounded-xl px-3 py-2.5 ${isInQuizMode ? "opacity-60 pointer-events-none" : ""}`}
                      >
                        <Info className="w-4 h-4 mr-2.5 text-slate-500" />
                        About Us
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => !isInQuizMode && router.push("/team")}
                        className={`cursor-pointer rounded-xl px-3 py-2.5 ${isInQuizMode ? "opacity-60 pointer-events-none" : ""}`}
                      >
                        <Users className="w-4 h-4 mr-2.5 text-slate-500" />
                        Our Team
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="my-1" />
                      <DropdownMenuItem
                        onClick={async () => {
                          await logout();
                          router.push("/");
                        }}
                        className="cursor-pointer text-rose-600 focus:text-rose-600 rounded-xl px-3 py-2.5"
                      >
                        <LogOut className="w-4 h-4 mr-2.5" />
                        Logout
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                <div className="flex items-center gap-2 ml-2">
                  <Link href="/login">
                    <Button
                      variant="ghost"
                      className="text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 font-semibold text-sm rounded-xl px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      Log in
                    </Button>
                  </Link>
                  <Link href="/signup">
                    <Button className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold px-5 h-10 rounded-xl shadow-[0_4px_14px_rgba(16,185,129,0.28)] hover:shadow-[0_6px_20px_rgba(16,185,129,0.38)] hover:-translate-y-0.5 transition-all duration-300 text-sm">
                      Get Started
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Mobile breadcrumb strip: always visible on small screens */}
          {isAuthenticated && breadcrumbs.length > 0 && (
            <div className="flex md:hidden items-center gap-1.5 text-[12px] font-medium text-slate-400 min-w-0 overflow-x-auto overflow-y-hidden flex-nowrap py-1.5 -mb-1.5">
              {breadcrumbs.map((crumb, i) => (
                <div key={i} className="flex items-center gap-1.5 flex-shrink-0">
                  {i > 0 && <ChevronRight className="w-3 h-3 text-slate-300 dark:text-slate-600 flex-shrink-0" />}
                  {crumb.href === "#" ? (
                    <span className="text-slate-500 dark:text-slate-400 whitespace-nowrap">{crumb.label}</span>
                  ) : (
                    <Link
                      href={crumb.href}
                      className="hover:text-emerald-500 transition-colors whitespace-nowrap"
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

        {/* Mobile menu dropdown */}
        {isAuthenticated && mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200/50 dark:border-slate-700/50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl px-4 py-4 space-y-0.5 animate-slide-down">
            {breadcrumbs.length > 1 && (
              <div className="flex items-center gap-1.5 px-4 py-2 mb-1 text-[12px] font-medium text-slate-400 flex-wrap">
                {breadcrumbs.map((crumb, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    {i > 0 && <ChevronRight className="w-3 h-3 text-slate-300 dark:text-slate-600 flex-shrink-0" />}
                    {crumb.href === "#" ? (
                      <span className="text-slate-500 dark:text-slate-400">{crumb.label}</span>
                    ) : (
                      <Link
                        href={crumb.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className="hover:text-emerald-500 transition-colors"
                      >
                        {crumb.label}
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            )}
            <Link
              href="/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-500/20"
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </Link>
            <Link
              href="/profile"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <User className="w-4 h-4 text-slate-500" />
              Profile
            </Link>
            <Link
              href="/about"
              onClick={(e) => {
                if (isInQuizMode) e.preventDefault();
                else setMobileMenuOpen(false);
              }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${isInQuizMode ? "opacity-60 pointer-events-none" : ""}`}
            >
              <Info className="w-4 h-4 text-slate-500" />
              About Us
            </Link>
            <Link
              href="/team"
              onClick={(e) => {
                if (isInQuizMode) e.preventDefault();
                else setMobileMenuOpen(false);
              }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${isInQuizMode ? "opacity-60 pointer-events-none" : ""}`}
            >
              <Users className="w-4 h-4 text-slate-500" />
              Our Team
            </Link>
            <div className="border-t border-slate-200 dark:border-slate-700 mt-2 pt-2">
              <button
                onClick={async () => {
                  setMobileMenuOpen(false);
                  await logout();
                  router.push("/");
                }}
                className="flex items-center gap-3 w-full text-left px-4 py-3 rounded-xl text-sm font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        )}
      </nav>
      {/* Spacer to prevent content from hiding behind fixed nav (taller on mobile when breadcrumb strip is shown) */}
      <div className={isAuthenticated && breadcrumbs.length > 0 ? "h-[6rem] md:h-[4.25rem]" : "h-[4.25rem]"} />
    </>
  );
}
