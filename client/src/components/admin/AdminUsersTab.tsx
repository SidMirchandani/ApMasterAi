"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreVertical,
  User,
  Ban,
  Users,
  Shield,
  ShieldOff,
  MapPin,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

interface AdminUser {
  id: string;
  name: string | null;
  email: string;
  state: string | null;
  joinDate: string;
  totalCoursesEnrolled: number | null;
  /** First-touch `referral` tag from signup attribution (see `lib/attribution`). */
  referralAttribution: string | null;
  status: "active" | "banned";
  isAdmin: boolean;
  hasEnvAdmin: boolean;
  hasDbAdmin: boolean;
}

const US_STATE_CODES = [
  "AL",
  "AK",
  "AZ",
  "AR",
  "CA",
  "CO",
  "CT",
  "DE",
  "FL",
  "GA",
  "HI",
  "ID",
  "IL",
  "IN",
  "IA",
  "KS",
  "KY",
  "LA",
  "ME",
  "MD",
  "MA",
  "MI",
  "MN",
  "MS",
  "MO",
  "MT",
  "NE",
  "NV",
  "NH",
  "NJ",
  "NM",
  "NY",
  "NC",
  "ND",
  "OH",
  "OK",
  "OR",
  "PA",
  "RI",
  "SC",
  "SD",
  "TN",
  "TX",
  "UT",
  "VT",
  "VA",
  "WA",
  "WV",
  "WI",
  "WY",
  "DC",
] as const;

type ColumnFilters = {
  name: string;
  email: string;
  state: string;
  joinFrom: string;
  joinTo: string;
  status: "" | "active" | "banned";
  dbAdmin: "" | "yes" | "no";
};

const INITIAL_COLUMN_FILTERS: ColumnFilters = {
  name: "",
  email: "",
  state: "",
  joinFrom: "",
  joinTo: "",
  status: "",
  dbAdmin: "",
};

function buildFilterQueryParams(filters: ColumnFilters): URLSearchParams {
  const qs = new URLSearchParams({ limit: "100" });
  const email = filters.email.trim().toLowerCase();
  const name = filters.name.trim().toLowerCase();
  if (email) {
    qs.set("filterEmailPrefix", email);
    return qs;
  }
  if (name) {
    qs.set("filterNamePrefix", name);
    return qs;
  }
  if (filters.state.trim()) {
    qs.set("filterState", filters.state.trim().toUpperCase());
    return qs;
  }
  if (filters.status === "active" || filters.status === "banned") {
    qs.set("filterStatus", filters.status);
    return qs;
  }
  if (filters.dbAdmin === "yes") {
    qs.set("filterDbAdmin", "true");
    return qs;
  }
  if (filters.dbAdmin === "no") {
    qs.set("filterDbAdmin", "false");
    return qs;
  }
  const jf = filters.joinFrom.trim();
  const jt = filters.joinTo.trim();
  if (jf || jt) {
    if (jf) qs.set("filterJoinFrom", `${jf}T00:00:00.000Z`);
    if (jt) qs.set("filterJoinTo", `${jt}T23:59:59.999Z`);
    return qs;
  }
  return qs;
}

function columnFiltersAreBrowse(f: ColumnFilters): boolean {
  return (
    !f.name.trim() &&
    !f.email.trim() &&
    !f.state.trim() &&
    !f.joinFrom.trim() &&
    !f.joinTo.trim() &&
    f.status === "" &&
    f.dbAdmin === ""
  );
}

type UserSortKey =
  | "name"
  | "email"
  | "state"
  | "joinDate"
  | "referralAttribution"
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
    case "referralAttribution": {
      const ra = (a.referralAttribution ?? "").toLowerCase();
      const rb = (b.referralAttribution ?? "").toLowerCase();
      const ea = a.referralAttribution == null || a.referralAttribution === "";
      const eb = b.referralAttribution == null || b.referralAttribution === "";
      if (ea && eb) cmp = 0;
      else if (ea) cmp = 1;
      else if (eb) cmp = -1;
      else cmp = ra.localeCompare(rb, undefined, { sensitivity: "base" });
      break;
    }
    case "totalCoursesEnrolled": {
      const na = typeof a.totalCoursesEnrolled === "number" ? a.totalCoursesEnrolled : -Infinity;
      const nb = typeof b.totalCoursesEnrolled === "number" ? b.totalCoursesEnrolled : -Infinity;
      cmp = na - nb;
      break;
    }
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
  /** Ban, grant/revoke DB admin, set state — platform admins (session allows). */
  canMutateUsers: boolean;
}) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentCursor, setCurrentCursor] = useState("");
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [cursorStack, setCursorStack] = useState<string[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [sortKey, setSortKey] = useState<UserSortKey>("email");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const [filters, setFilters] = useState<ColumnFilters>(INITIAL_COLUMN_FILTERS);
  const [debouncedFilters, setDebouncedFilters] = useState<ColumnFilters>(INITIAL_COLUMN_FILTERS);

  const sortedUsers = useMemo(() => {
    const arr = [...users];
    arr.sort((a, b) => compareUsers(a, b, sortKey, sortDir));
    return arr;
  }, [users, sortKey, sortDir]);

  function handleSort(key: UserSortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  /** Mutex: switching column clears others; join range keeps both dates together. */
  const setColumnFilter = useCallback((patch: Partial<ColumnFilters>) => {
    setFilters((prev) => {
      const isJoinPatch = Object.prototype.hasOwnProperty.call(patch, "joinFrom") ||
        Object.prototype.hasOwnProperty.call(patch, "joinTo");
      if (isJoinPatch) {
        return {
          ...INITIAL_COLUMN_FILTERS,
          joinFrom: patch.joinFrom !== undefined ? patch.joinFrom : prev.joinFrom,
          joinTo: patch.joinTo !== undefined ? patch.joinTo : prev.joinTo,
        };
      }
      return { ...INITIAL_COLUMN_FILTERS, ...patch };
    });
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedFilters(filters);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [filters]);

  const fetchUsersPage = useCallback(
    async (cursor: string) => {
      const isInitial = !cursor;
      if (isInitial) setLoading(true);
      else setLoadingMore(true);
      try {
        const qs = buildFilterQueryParams(debouncedFilters);
        if (cursor) qs.set("cursor", cursor);
        const res = await fetch(`/api/admin/users?${qs.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          const errText = typeof json?.error === "string" ? json.error : "Failed to load users";
          toast.error(errText, { id: "admin-users-load" });
          if (isInitial) setUsers([]);
          setNextCursor(null);
          setHasMore(false);
          if (isInitial) {
            setCursorStack([]);
            setCurrentCursor("");
          }
          return;
        }
        const rawUsers = json.data?.users || [];
        setUsers(
          rawUsers.map((u: AdminUser) => ({
            ...u,
            referralAttribution:
              typeof u.referralAttribution === "string" && u.referralAttribution.trim()
                ? u.referralAttribution.trim()
                : null,
          })),
        );
        const newNextCursor =
          typeof json.data?.nextCursor === "string" && json.data.nextCursor.trim()
            ? json.data.nextCursor.trim()
            : null;
        setNextCursor(newNextCursor);
        setHasMore(Boolean(newNextCursor));
        if (isInitial) {
          setCursorStack([]);
          setCurrentCursor("");
        }
        setCurrentCursor(cursor);
      } catch {
        toast.error("Failed to load users", { id: "admin-users-load" });
        setUsers([]);
        setNextCursor(null);
        setHasMore(false);
        if (isInitial) {
          setCursorStack([]);
          setCurrentCursor("");
        }
      } finally {
        if (isInitial) setLoading(false);
        else setLoadingMore(false);
      }
    },
    [token, debouncedFilters],
  );

  useEffect(() => {
    if (!token) return;
    void fetchUsersPage("");
  }, [token, debouncedFilters, fetchUsersPage]);

  async function handleNextPage() {
    if (!nextCursor || loading || loadingMore) return;
    setCursorStack((prev) => [...prev, currentCursor]);
    await fetchUsersPage(nextCursor);
  }

  async function handlePrevPage() {
    if (cursorStack.length === 0 || loading || loadingMore) return;
    const prevStack = [...cursorStack];
    const prevCursor = prevStack.pop() ?? "";
    setCursorStack(prevStack);
    await fetchUsersPage(prevCursor);
  }

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

  return (
    <div className="space-y-4">
      <Card className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
        <CardHeader>
          <CardTitle className="dark:text-white">User Management</CardTitle>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            One column filter at a time. Name and Email use starts-with (prefix). DB Admin filter checks Firestore
            only (env-listed admins still appear unless they carry the DB flag).
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-sm">
            <span className="text-slate-500 dark:text-slate-400">
              Showing up to 100 users per page • optional{" "}
              <code className="rounded bg-slate-100 px-1 text-xs dark:bg-slate-800">
                npm run backfill:admin-user-list
              </code>{" "}
              to denormalize search fields on existing docs
            </span>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void fetchUsersPage("")}
                disabled={loading || loadingMore}
              >
                Reset paging
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handlePrevPage}
                disabled={loading || loadingMore || cursorStack.length === 0}
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                disabled={loading || loadingMore || !hasMore || !nextCursor}
              >
                Next
              </Button>
            </div>
          </div>

          <div className="rounded-md border dark:border-slate-700 overflow-x-auto">
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
                    label="Referral"
                    columnKey="referralAttribution"
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
                  <TableHead rowSpan={2} className="w-[70px] font-semibold text-right align-bottom pb-2">
                    Actions
                  </TableHead>
                </TableRow>
                <TableRow className="bg-slate-50/80 dark:bg-slate-800/40 border-t dark:border-slate-700">
                  <TableHead className="align-top py-2 min-w-[140px]">
                    <Input
                      placeholder="Prefix…"
                      value={filters.name}
                      onChange={(e) => setColumnFilter({ name: e.target.value })}
                      disabled={loading && users.length === 0}
                      className="h-8 text-xs bg-white dark:bg-slate-900/70 dark:border-slate-800"
                      aria-label="Filter by display name prefix"
                    />
                  </TableHead>
                  <TableHead className="align-top py-2 min-w-[160px]">
                    <Input
                      placeholder="Prefix…"
                      value={filters.email}
                      onChange={(e) => setColumnFilter({ email: e.target.value })}
                      disabled={loading && users.length === 0}
                      className="h-8 text-xs bg-white dark:bg-slate-900/70 dark:border-slate-800"
                      aria-label="Filter by email prefix"
                    />
                  </TableHead>
                  <TableHead className="align-top py-2 min-w-[108px]">
                    <Select
                      value={filters.state || "__all__"}
                      onValueChange={(v) => setColumnFilter({ state: v === "__all__" ? "" : v })}
                      disabled={loading && users.length === 0}
                    >
                      <SelectTrigger className="h-8 text-xs" aria-label="Filter by state">
                        <SelectValue placeholder="State" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">Any state</SelectItem>
                        {US_STATE_CODES.map((code) => (
                          <SelectItem key={code} value={code}>
                            {code}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableHead>
                  <TableHead className="align-top py-2 min-w-[220px]">
                    <div className="flex flex-col gap-1">
                      <Input
                        type="date"
                        value={filters.joinFrom}
                        onChange={(e) => setColumnFilter({ joinFrom: e.target.value })}
                        disabled={loading && users.length === 0}
                        className="h-8 text-xs bg-white dark:bg-slate-900/70 dark:border-slate-800"
                        aria-label="Joined on or after"
                      />
                      <Input
                        type="date"
                        value={filters.joinTo}
                        onChange={(e) => setColumnFilter({ joinTo: e.target.value })}
                        disabled={loading && users.length === 0}
                        className="h-8 text-xs bg-white dark:bg-slate-900/70 dark:border-slate-800"
                        aria-label="Joined on or before"
                      />
                    </div>
                  </TableHead>
                  <TableHead className="align-middle py-2 text-xs text-muted-foreground">
                    —
                  </TableHead>
                  <TableHead className="align-middle py-2 text-xs text-muted-foreground">
                    —
                  </TableHead>
                  <TableHead className="align-top py-2 min-w-[120px]">
                    <Select
                      value={filters.status || "__all__"}
                      onValueChange={(v) =>
                        setColumnFilter({
                          status: v === "__all__" ? "" : (v as "active" | "banned"),
                        })
                      }
                      disabled={loading && users.length === 0}
                    >
                      <SelectTrigger className="h-8 text-xs" aria-label="Filter by ban status">
                        <SelectValue placeholder="Any" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">Any</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="banned">Banned</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableHead>
                  <TableHead className="align-top py-2 min-w-[140px]">
                    <Select
                      value={filters.dbAdmin || "__all__"}
                      onValueChange={(v) =>
                        setColumnFilter({
                          dbAdmin: v === "__all__" ? "" : v === "yes" ? "yes" : "no",
                        })
                      }
                      disabled={loading && users.length === 0}
                    >
                      <SelectTrigger className="h-8 text-xs" aria-label="Filter by Firestore admin flag">
                        <SelectValue placeholder="Any" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">Any</SelectItem>
                        <SelectItem value="yes">DB admin</SelectItem>
                        <SelectItem value="no">Not DB admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(loading || loadingMore) &&
                  Array.from({ length: 8 }).map((_, idx) => (
                    <TableRow key={`sk-${idx}`} className="dark:border-slate-700">
                      <TableCell>
                        <Skeleton className="h-4 w-28" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-44 max-w-[min(100%,280px)]" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-12" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-20 max-w-[140px]" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-8" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-14 rounded-full" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-8" />
                      </TableCell>
                      <TableCell className="text-right">
                        <Skeleton className="ml-auto h-8 w-8 rounded-md" />
                      </TableCell>
                    </TableRow>
                  ))}
                {!loading && !loadingMore &&
                  sortedUsers.map((user) => (
                  <TableRow key={user.id} className="dark:border-slate-700">
                    <TableCell className="font-medium dark:text-slate-200">
                      {user.name || "—"}
                    </TableCell>
                    <TableCell className="dark:text-slate-300">{user.email}</TableCell>
                    <TableCell className="dark:text-slate-300">{user.state || "International"}</TableCell>
                    <TableCell className="dark:text-slate-300">
                      {formatDate(user.joinDate)}
                    </TableCell>
                    <TableCell className="dark:text-slate-300 max-w-[180px]">
                      <span className="break-words" title={user.referralAttribution ?? undefined}>
                        {user.referralAttribution ?? "—"}
                      </span>
                    </TableCell>
                    <TableCell className="dark:text-slate-300">
                      {user.totalCoursesEnrolled == null ? "—" : user.totalCoursesEnrolled}
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
                      <DropdownMenu modal={false}>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Actions for ${user.email}`}>
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                          <DropdownMenuItem onClick={() => handleViewProfile(user)}>
                            <User className="mr-2 h-4 w-4" />
                            View Profile
                          </DropdownMenuItem>
                          {canMutateUsers ? (
                            <>
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
                            </>
                          ) : (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuLabel className="text-xs text-muted-foreground">
                                More actions require admin access
                              </DropdownMenuLabel>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {!loading && !loadingMore && sortedUsers.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="h-12 w-12 text-slate-500 dark:text-slate-500 mb-4" />
              <p className="text-lg font-medium text-slate-900 dark:text-slate-300">
                {!columnFiltersAreBrowse(debouncedFilters) ? "No users match this filter" : "No users yet"}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {!columnFiltersAreBrowse(debouncedFilters)
                  ? "Try clearing filters or a different column. Runs backfill script if admins see an empty browse list."
                  : "Users appear after sign-up once Firestore indexes and backfill are applied."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
