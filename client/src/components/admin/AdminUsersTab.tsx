"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, MoreVertical, User, Key, Ban, Loader2, Users } from "lucide-react";
import toast from "react-hot-toast";

interface AdminUser {
  id: string;
  name: string | null;
  email: string;
  joinDate: string;
  lastLogin: string | null;
  totalCoursesEnrolled: number;
  status: "active" | "banned";
}

export function AdminUsersTab({ token }: { token: string }) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchEmail, setSearchEmail] = useState("");

  const filteredUsers = useMemo(() => {
    if (!searchEmail.trim()) return users;
    const q = searchEmail.trim().toLowerCase();
    return users.filter((u) => u.email.toLowerCase().includes(q));
  }, [users, searchEmail]);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetch("/api/admin/users", { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load users");
        return res.json();
      })
      .then((json) => setUsers(json.data?.users || []))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }, [token]);

  function handleViewProfile(user: AdminUser) {
    toast.success(`View Profile: ${user.email} (shell action)`);
  }

  function handleResetPassword(user: AdminUser) {
    toast.success(`Reset Password: ${user.email} (shell action)`);
  }

  function handleBanUser(user: AdminUser) {
    toast.success(`Ban User: ${user.email} (shell action)`);
  }

  function formatDate(iso: string) {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "—";
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
        <CardHeader>
          <CardTitle className="dark:text-white">User Management</CardTitle>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Search and manage platform users.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by email..."
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              className="pl-9 bg-white dark:bg-slate-900/70 dark:border-slate-800 dark:text-white"
            />
          </div>

          <div className="rounded-md border dark:border-slate-700 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <TableHead className="font-semibold">Name</TableHead>
                  <TableHead className="font-semibold">Email</TableHead>
                  <TableHead className="font-semibold">Join Date</TableHead>
                  <TableHead className="font-semibold">Last Login</TableHead>
                  <TableHead className="font-semibold">Courses Enrolled</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="w-[70px] font-semibold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id} className="dark:border-slate-700">
                    <TableCell className="font-medium dark:text-slate-200">
                      {user.name || "—"}
                    </TableCell>
                    <TableCell className="dark:text-slate-300">{user.email}</TableCell>
                    <TableCell className="dark:text-slate-300">
                      {formatDate(user.joinDate)}
                    </TableCell>
                    <TableCell className="dark:text-slate-300">
                      {user.lastLogin
                        ? formatDate(user.lastLogin)
                        : "—"}
                    </TableCell>
                    <TableCell className="dark:text-slate-300">
                      {user.totalCoursesEnrolled}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          user.status === "active"
                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                        }`}
                      >
                        {user.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => handleViewProfile(user)}>
                            <User className="mr-2 h-4 w-4" />
                            View Profile
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleResetPassword(user)}>
                            <Key className="mr-2 h-4 w-4" />
                            Reset Password
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleBanUser(user)}
                            className="text-red-600 focus:text-red-600 dark:text-red-400"
                          >
                            <Ban className="mr-2 h-4 w-4" />
                            Ban User
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredUsers.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="h-12 w-12 text-slate-500 dark:text-slate-500 mb-4" />
              <p className="text-lg font-medium text-slate-900 dark:text-slate-300">
                {searchEmail.trim()
                  ? "No users match your search"
                  : "No users yet"}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {searchEmail.trim()
                  ? "Try a different email or clear the search."
                  : "Users will appear here once they sign up."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
