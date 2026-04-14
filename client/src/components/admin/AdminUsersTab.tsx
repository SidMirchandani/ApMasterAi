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
import {
  Search,
  MoreVertical,
  User,
  Ban,
  Loader2,
  Users,
  Shield,
  ShieldOff,
  MapPin,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import toast from "react-hot-toast";

interface AdminUser {
  id: string;
  name: string | null;
  email: string;
  state: string | null;
  joinDate: string;
  totalCoursesEnrolled: number;
  status: "active" | "banned";
  isAdmin: boolean;
  hasEnvAdmin: boolean;
  hasDbAdmin: boolean;
}

type UserSortKey =
  | "name"
  | "email"
  | "state"
  | "joinDate"
  | "totalCoursesEnrolled"
  | "status"
  | "isAdmin";

function parseTime(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : null;
}

/** Null / invalid times sort after real times in both directions */
function compareNullableTime(a: number | null, b: number | null, dir: "asc" | "desc"): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  const diff = a - b;
  return dir === "asc" ? diff : -diff;
}

function compareUsers(a: AdminUser, b: AdminUser, key: UserSortKey, dir: "asc" | "desc"): number {
  let cmp = 0;
  switch (key) {
    case "name":
      cmp = (a.name ?? "").localeCompare(b.name ?? "", undefined, { sensitivity: "base" });
      break;
    case "email":
      cmp = a.email.localeCompare(b.email, undefined, { sensitivity: "base" });
      break;
    case "state": {
      const sa = a.state ?? "International";
      const sb = b.state ?? "International";
      cmp = sa.localeCompare(sb, undefined, { sensitivity: "base" });
      break;
    }
    case "joinDate":
      return compareNullableTime(parseTime(a.joinDate), parseTime(b.joinDate), dir);
    case "totalCoursesEnrolled":
      cmp = a.totalCoursesEnrolled - b.totalCoursesEnrolled;
      break;
    case "status":
      cmp = a.status.localeCompare(b.status);
      break;
    case "isAdmin": {
      const ra = Number(a.isAdmin);
      const rb = Number(b.isAdmin);
      cmp = ra - rb;
      if (cmp === 0) {
        cmp = Number(a.hasEnvAdmin) - Number(b.hasEnvAdmin);
        if (cmp === 0) cmp = Number(a.hasDbAdmin) - Number(b.hasDbAdmin);
      }
      break;
    }
    default:
      cmp = 0;
  }
  return dir === "asc" ? cmp : -cmp;
}

function SortableTableHead({
  label,
  columnKey,
  sortKey,
  sortDir,
  onSort,
}: {
  label: string;
  columnKey: UserSortKey;
  sortKey: UserSortKey;
  sortDir: "asc" | "desc";
  onSort: (k: UserSortKey) => void;
}) {
  const active = sortKey === columnKey;
  return (
    <TableHead className="font-semibold align-middle">
      <button
        type="button"
        className="inline-flex items-center gap-1.5 -ml-1.5 px-1.5 py-0.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700/80 text-left w-full"
        onClick={() => onSort(columnKey)}
        aria-sort={active ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
      >
        <span className="whitespace-normal break-words leading-snug text-left">{label}</span>
        {active ? (
          sortDir === "asc" ? (
            <ArrowUp className="h-3.5 w-3.5 shrink-0 opacity-80" />
          ) : (
            <ArrowDown className="h-3.5 w-3.5 shrink-0 opacity-80" />
          )
        ) : (
          <ArrowUpDown className="h-3.5 w-3.5 shrink-0 opacity-35" />
        )}
      </button>
    </TableHead>
  );
}

export function AdminUsersTab({
  token,
  canMutateUsers,
}: {
  token: string;
  /** Ban, grant/revoke DB admin, set state — env admins only */
  canMutateUsers: boolean;
}) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchEmail, setSearchEmail] = useState("");
  const [sortKey, setSortKey] = useState<UserSortKey>("email");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const filteredUsers = useMemo(() => {
    if (!searchEmail.trim()) return users;
    const q = searchEmail.trim().toLowerCase();
    return users.filter((u) => u.email.toLowerCase().includes(q));
  }, [users, searchEmail]);

  const sortedUsers = useMemo(() => {
    const arr = [...filteredUsers];
    arr.sort((a, b) => compareUsers(a, b, sortKey, sortDir));
    return arr;
  }, [filteredUsers, sortKey, sortDir]);

  function handleSort(key: UserSortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

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
                  <SortableTableHead
                    label="Name"
                    columnKey="name"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={handleSort}
                  />
                  <SortableTableHead
                    label="Email"
                    columnKey="email"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={handleSort}
                  />
                  <SortableTableHead
                    label="State"
                    columnKey="state"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={handleSort}
                  />
                  <SortableTableHead
                    label="Join Date"
                    columnKey="joinDate"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={handleSort}
                  />
                  <SortableTableHead
                    label="Courses Enrolled"
                    columnKey="totalCoursesEnrolled"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={handleSort}
                  />
                  <SortableTableHead
                    label="Status"
                    columnKey="status"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={handleSort}
                  />
                  <SortableTableHead
                    label="Admin"
                    columnKey="isAdmin"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={handleSort}
                  />
                  {canMutateUsers && (
                    <TableHead className="w-[70px] font-semibold text-right align-middle">Actions</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedUsers.map((user) => (
                  <TableRow key={user.id} className="dark:border-slate-700">
                    <TableCell className="font-medium dark:text-slate-200">
                      {user.name || "—"}
                    </TableCell>
                    <TableCell className="dark:text-slate-300">{user.email}</TableCell>
                    <TableCell className="dark:text-slate-300">{user.state || "International"}</TableCell>
                    <TableCell className="dark:text-slate-300">
                      {formatDate(user.joinDate)}
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
                    {canMutateUsers && (
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
                    )}
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
