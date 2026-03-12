"use client";

import Link from "next/link";
import { useRouter } from "next/router";
import { BookOpen, LogOut, BarChart3, Library, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { signOut } from "firebase/auth";
import { auth } from "../../../../lib/firebase";

const TABS = [
  { id: "insights", label: "Platform Insights", icon: BarChart3 },
  { id: "library", label: "Content Library", icon: Library },
  { id: "users", label: "User Management", icon: Users },
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
  const router = useRouter();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B0F1A]">
      {/* Header with tab nav */}
      <div className="bg-white dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <Link href="/" className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 dark:bg-blue-500 rounded-xl flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">APMaster Admin</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">Dashboard</p>
              </div>
            </Link>
            <div className="flex items-center gap-4">
              <nav className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800 -mb-px">
                {TABS.map(({ id, label, icon: Icon }) => {
                  const isActive = tab === id;
                  return (
                    <Link
                      key={id}
                      href={`/admin?tab=${id}`}
                      className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors duration-150 ease-out ${
                        isActive
                          ? "border-blue-500 text-blue-600 dark:text-blue-400 dark:border-blue-500"
                          : "border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </Link>
                  );
                })}
              </nav>
              <div className="flex items-center gap-2">
                <Switch
                  id="cheat-mode"
                  checked={cheatMode}
                  onCheckedChange={onCheatModeChange}
                />
                <Label htmlFor="cheat-mode" className="text-sm font-medium cursor-pointer dark:text-slate-300 whitespace-nowrap">
                  Cheat Mode
                </Label>
              </div>
              <span className="text-sm text-slate-500 dark:text-slate-400 truncate max-w-[180px]">
                {userEmail}
              </span>
              <Button
                onClick={() => signOut(auth)}
                variant="outline"
                size="sm"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign out
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </div>
    </div>
  );
}
