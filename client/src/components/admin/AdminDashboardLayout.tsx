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
    <div className="min-h-screen bg-khan-background dark:bg-gray-900">
      {/* Header with tab nav */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <Link href="/" className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-khan-green rounded-lg flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-khan-gray-dark dark:text-white">APMaster Admin</h1>
                <p className="text-sm text-khan-gray-medium dark:text-gray-400">Dashboard</p>
              </div>
            </Link>
            <div className="flex items-center gap-4">
              <nav className="flex items-center gap-1 border-b border-gray-200 dark:border-gray-700 -mb-px">
                {TABS.map(({ id, label, icon: Icon }) => {
                  const isActive = tab === id;
                  return (
                    <Link
                      key={id}
                      href={`/admin?tab=${id}`}
                      className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                        isActive
                          ? "border-khan-green text-khan-green dark:text-khan-green dark:border-khan-green"
                          : "border-transparent text-khan-gray-medium hover:text-khan-gray-dark dark:text-gray-400 dark:hover:text-gray-200"
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
                <Label htmlFor="cheat-mode" className="text-sm font-medium cursor-pointer dark:text-gray-300 whitespace-nowrap">
                  Cheat Mode
                </Label>
              </div>
              <span className="text-sm text-khan-gray-medium dark:text-gray-400 truncate max-w-[180px]">
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
