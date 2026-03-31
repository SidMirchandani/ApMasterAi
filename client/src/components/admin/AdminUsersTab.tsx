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
import { Search, MoreVertical, User, Ban, Loader2, Users, Shield, ShieldOff, MapPin } from "lucide-react";
import toast from "react-hot-toast";

interface AdminUser {
  id: string;
  name: string | null;
  email: string;
  state: string | null;
  joinDate: string;
  lastLogin: string | null;
  totalCoursesEnrolled: number;
  status: "active" | "banned";
  isAdmin: boolean;
  hasEnvAdmin: boolean;
  hasDbAdmin: boolean;
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

  async function setUserBanned(user: AdminUser, banned: boolean) {
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(user.id)}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ banned }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof json?.error === "string" ? json.error : "Failed to update ban status");
        return;
      }
      const status = json.data?.status === "banned" ? "banned" : "active";
      toast.success(banned ? `Banned: ${user.email}` : `Unbanned: ${user.email}`);
      setUsers((prev) =>
        prev.map((u) =>
          u.id === user.id
            ? {
                ...u,
                status,
              }
            : u,
        ),
      );
    } catch {
      toast.error("Failed to update ban status");
    }
  }

  async function setUserDbAdmin(user: AdminUser, isAdmin: boolean) {
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(user.id)}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isAdmin }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof json?.error === "string" ? json.error : "Failed to update admin");
        return;
      }
      toast.success(isAdmin ? `Admin granted: ${user.email}` : `Admin revoked (DB): ${user.email}`);
      setUsers((prev) =>
        prev.map((u) =>
          u.id === user.id
            ? {
                ...u,
                hasDbAdmin: isAdmin,
                isAdmin: u.hasEnvAdmin || isAdmin,
              }
            : u,
        ),
      );
    } catch {
      toast.error("Failed to update admin");
    }
  }

  async function setUserState(user: AdminUser, nextState: string | null) {
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(user.id)}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ inferredState: nextState }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof json?.error === "string" ? json.error : "Failed to update state");
        return;
      }
      setUsers((prev) =>
        prev.map((u) =>
          u.id === user.id
            ? {
                ...u,
                state: json.data?.state ?? null,
              }
            : u,
        ),
      );
      const label = json.data?.state || "cleared";
      toast.success(`State updated: ${user.email} (${label})`);
    } catch {
      toast.error("Failed to update state");
    }
  }

  async function promptAndSetUserState(user: AdminUser) {
    const next = window.prompt("Set 2-letter state code (e.g. NJ). Leave blank to clear.", user.state ?? "");
    if (next == null) return;
    const normalized = next.trim().toUpperCase();
    if (normalized === "") {
      await setUserState(user, null);
      return;
    }
    if (!/^[A-Z]{2}$/.test(normalized)) {
      toast.error("Enter a valid 2-letter state code (example: CA)");
      return;
    }
    await setUserState(user, normalized);
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
    <div className="space-y-4">
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
                  <TableHead className="font-semibold">State</TableHead>
                  <TableHead className="font-semibold">Join Date</TableHead>
                  <TableHead className="font-semibold">Last Login</TableHead>
                  <TableHead className="font-semibold">Courses Enrolled</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold">Admin</TableHead>
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
                    <TableCell className="dark:text-slate-300">{user.state || "—"}</TableCell>
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
                    <TableCell className="text-slate-300 text-sm">
                      {user.isAdmin ? (
                        <span className="text-emerald-700 dark:text-emerald-400">
                          Yes
                          {user.hasEnvAdmin && user.hasDbAdmin && " (env+DB)"}
                          {user.hasEnvAdmin && !user.hasDbAdmin && " (env)"}
                          {!user.hasEnvAdmin && user.hasDbAdmin && " (DB)"}
                        </span>
                      ) : (
                        <span className="text-slate-500">No</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                          <DropdownMenuItem onClick={() => handleViewProfile(user)}>
                            <User className="mr-2 h-4 w-4" />
                            View Profile
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => promptAndSetUserState(user)}>
                            <MapPin className="mr-2 h-4 w-4" />
                            {user.state ? "Update/Clear State" : "Set State"}
                          </DropdownMenuItem>
                          {user.status === "active" ? (
                            <DropdownMenuItem
                              onClick={() => setUserBanned(user, true)}
                              className="text-red-600 focus:text-red-600 dark:text-red-400"
                            >
                              <Ban className="mr-2 h-4 w-4" />
                              Ban User
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => setUserBanned(user, false)}
                              className="text-emerald-700 focus:text-emerald-700 dark:text-emerald-400"
                            >
                              <Ban className="mr-2 h-4 w-4" />
                              Unban User
                            </DropdownMenuItem>
                          )}
                          {!user.hasDbAdmin && (
                            <DropdownMenuItem onClick={() => setUserDbAdmin(user, true)}>
                              <Shield className="mr-2 h-4 w-4" />
                              Grant admin (DB)
                            </DropdownMenuItem>
                          )}
                          {user.hasDbAdmin && (
                            <DropdownMenuItem onClick={() => setUserDbAdmin(user, false)}>
                              <ShieldOff className="mr-2 h-4 w-4" />
                              {user.hasEnvAdmin
                                ? "Clear DB admin (still admin if on ADMIN_EMAILS)"
                                : "Revoke admin (DB)"}
                            </DropdownMenuItem>
                          )}
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
