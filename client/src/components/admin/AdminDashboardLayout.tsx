"use client";

import Link from "next/link";
import { BookOpen, LogOut, BarChart3, Library, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { signOut } from "firebase/auth";
import { auth } from "../../../../lib/firebase";

const TABS = [
  { id: "insights", label: "Platform Insights", shortLabel: "Insights", icon: BarChart3 },
  { id: "library", label: "Content Library", shortLabel: "Library", icon: Library },
  { id: "users", label: "User Management", shortLabel: "Users", icon: Users },
] as const;

export type AdminTabId = (typeof TABS)[number]["id"];

interface AdminDashboardLayoutProps {
  children: React.ReactNode;
  tab: AdminTabId;
  userEmail: string | null;
  cheatMode: boolean;
  onCheatModeChange: (checked: boolean) => void;
}

export function AdminDashboardLayout({
  children,
  tab,
  userEmail,
  cheatMode,
  onCheatModeChange,
}: AdminDashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B0F1A]">
      {/* Header with tab nav — stacks on small screens; tabs scroll horizontally when needed */}
      <div className="bg-white dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 py-3">
            <div className="flex flex-col gap-3 min-[520px]:flex-row min-[520px]:items-center min-[520px]:justify-between">
              <Link href="/" className="flex items-center gap-2 sm:gap-3 min-w-0 shrink-0">
                <div className="w-9 h-9 sm:w-10 sm:h-10 bg-blue-600 dark:bg-blue-500 rounded-xl flex items-center justify-center shrink-0">
                  <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-white truncate">
                    APMaster Admin
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">Dashboard</p>
                </div>
              </Link>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 min-[520px]:justify-end">
                <div className="flex items-center gap-2">
                  <Switch
                    id="cheat-mode"
                    checked={cheatMode}
                    onCheckedChange={onCheatModeChange}
                  />
                  <Label
                    htmlFor="cheat-mode"
                    className="text-xs sm:text-sm font-medium cursor-pointer dark:text-slate-300 whitespace-nowrap"
                  >
                    Cheat Mode
                  </Label>
                </div>
                <span className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 truncate max-w-[min(100%,12rem)] sm:max-w-[180px]">
                  {userEmail}
                </span>
                <Button
                  onClick={() => signOut(auth)}
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  aria-label="Sign out"
                >
                  <LogOut className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Sign out</span>
                </Button>
              </div>
            </div>
            <nav
              className="-mx-3 px-3 sm:mx-0 sm:px-0 flex gap-0 sm:gap-1 border-b border-slate-200 dark:border-slate-800 overflow-x-auto overscroll-x-contain [scrollbar-width:thin]"
              aria-label="Admin sections"
            >
              {TABS.map(({ id, label, shortLabel, icon: Icon }) => {
                const isActive = tab === id;
                return (
                  <Link
                    key={id}
                    href={`/admin?tab=${id}`}
                    className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 text-sm font-medium border-b-2 -mb-px whitespace-nowrap shrink-0 transition-colors duration-150 ease-out ${
                      isActive
                        ? "border-blue-500 text-blue-600 dark:text-blue-400 dark:border-blue-500"
                        : "border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" aria-hidden />
                    <span className="sm:hidden">{shortLabel}</span>
                    <span className="hidden sm:inline">{label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        {children}
      </div>
    </div>
  );
}
