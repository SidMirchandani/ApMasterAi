"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Ban,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  MapPin,
  MoreVertical,
  Search,
  Shield,
  ShieldOff,
  Trash2,
  User,
  Users,
} from "lucide-react";
import toast from "react-hot-toast";
import { Skeleton } from "@/components/ui/skeleton";

const UI_PAGE_SIZE = 50;
const FETCH_PAGE_SIZE = 300;
const USERS_CACHE_TTL_MS = 2 * 60 * 1000;

type UsersCacheEntry = { users: AdminUser[]; cachedAt: number };
const usersHydrationCache = new Map<string, UsersCacheEntry>();
const DATE_PRESETS = [
  { key: "7d", label: "Last 7 Days", days: 7 },
  { key: "30d", label: "Last Month", days: 30 },
  { key: "90d", label: "Last 3 Months", days: 90 },
  { key: "365d", label: "Last 1 Year", days: 365 },
] as const;

type DatePresetKey = (typeof DATE_PRESETS)[number]["key"] | "custom";

interface AdminUser {
  id: string;
  firebaseUid: string | null;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string;
  state: string | null;
  country: string | null;
  joinDate: string;
  lastLogin: string | null;
  status: "active" | "banned";
  isAdmin: boolean;
  hasEnvAdmin: boolean;
  hasDbAdmin: boolean;
  subjectCount: number;
  questionCount: number;
  subjectNames: string[];
}

interface AdminUsersPageResponse {
  success: boolean;
  data?: {
    users?: AdminUser[];
    nextCursor?: string | null;
    hasMore?: boolean;
    loadedCount?: number;
  };
  error?: string;
}

type UserSortKey =
  | "firstName"
  | "lastName"
  | "email"
  | "state"
  | "subjectCount"
  | "questionCount"
  | "joinDate"
  | "status"
  | "admin";

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function toLocalDateKey(value: Date | string | null | undefined): string {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function presetRange(key: DatePresetKey): { start: string; end: string } {
  const today = startOfLocalDay(new Date());
  if (key === "custom") return { start: "", end: "" };
  const preset = DATE_PRESETS.find((p) => p.key === key) ?? DATE_PRESETS[0];
  const start = new Date(today);
  start.setDate(today.getDate() - preset.days + 1);
  return { start: toLocalDateKey(start), end: toLocalDateKey(today) };
}

function parseDateKey(key: string): number | null {
  if (!key) return null;
  const d = new Date(`${key}T00:00:00`);
  return Number.isFinite(d.getTime()) ? d.getTime() : null;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "-";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function monthTokens(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "";
  return [
    d.toLocaleDateString(undefined, { month: "long", year: "numeric" }),
    d.toLocaleDateString(undefined, { month: "short", year: "numeric" }),
    toLocalDateKey(d),
  ].join(" ");
}

function displayNamePart(value: string | null | undefined): string {
  return value && value.trim() ? value.trim() : "-";
}

function userSearchHaystack(user: AdminUser): string {
  return [
    user.id,
    user.firebaseUid,
    user.name,
    user.firstName,
    user.lastName,
    user.email,
    user.state,
    user.country,
    user.joinDate,
    monthTokens(user.joinDate),
    user.status,
    user.isAdmin ? "admin yes" : "admin no",
    user.hasEnvAdmin ? "env admin" : "",
    user.hasDbAdmin ? "db admin" : "",
    String(user.subjectCount),
    String(user.questionCount),
    ...user.subjectNames,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function isWithinJoinRange(user: AdminUser, startKey: string, endKey: string): boolean {
  const joinKey = toLocalDateKey(user.joinDate);
  const joinMs = parseDateKey(joinKey);
  if (joinMs == null) return false;
  const startMs = parseDateKey(startKey);
  const endMs = parseDateKey(endKey);
  if (startMs != null && joinMs < startMs) return false;
  if (endMs != null && joinMs > endMs) return false;
  return true;
}

function statusRank(user: AdminUser): number {
  if (user.status === "banned") return 0;
  return 1;
}

function compareUsers(a: AdminUser, b: AdminUser, key: UserSortKey, dir: "asc" | "desc"): number {
  let cmp = 0;
  switch (key) {
    case "firstName":
      cmp = (a.firstName ?? "").localeCompare(b.firstName ?? "", undefined, {
        sensitivity: "base",
      });
      break;
    case "lastName":
      cmp = (a.lastName ?? "").localeCompare(b.lastName ?? "", undefined, { sensitivity: "base" });
      break;
    case "email":
      cmp = a.email.localeCompare(b.email, undefined, { sensitivity: "base" });
      break;
    case "state":
      cmp = (a.state ?? "").localeCompare(b.state ?? "", undefined, { sensitivity: "base" });
      break;
    case "subjectCount":
      cmp = a.subjectCount - b.subjectCount;
      break;
    case "questionCount":
      cmp = a.questionCount - b.questionCount;
      break;
    case "joinDate":
      cmp = (new Date(a.joinDate).getTime() || 0) - (new Date(b.joinDate).getTime() || 0);
      break;
    case "status":
      cmp = statusRank(a) - statusRank(b);
      break;
    case "admin":
      cmp = Number(a.isAdmin) - Number(b.isAdmin);
      if (cmp === 0) cmp = Number(a.hasEnvAdmin) - Number(b.hasEnvAdmin);
      if (cmp === 0) cmp = Number(a.hasDbAdmin) - Number(b.hasDbAdmin);
      break;
    default:
      cmp = 0;
  }
  return dir === "asc" ? cmp : -cmp;
}

function mergeUsersById(
  existing: AdminUser[],
  incoming: AdminUser[],
  preferExisting: boolean,
): AdminUser[] {
  const merged = new Map<string, AdminUser>();
  for (const user of existing) merged.set(user.id, user);
  for (const user of incoming) {
    const current = merged.get(user.id);
    merged.set(
      user.id,
      preferExisting && current ? { ...user, ...current } : { ...current, ...user },
    );
  }
  return Array.from(merged.values());
}

function SortableHead({
  label,
  columnKey,
  sortKey,
  sortDir,
  onSort,
  className = "",
}: {
  label: string;
  columnKey: UserSortKey;
  sortKey: UserSortKey;
  sortDir: "asc" | "desc";
  onSort: (key: UserSortKey) => void;
  className?: string;
}) {
  const active = sortKey === columnKey;
  return (
    <TableHead className={`font-semibold align-middle ${className}`}>
      <button
        type="button"
        className="inline-flex w-full items-center gap-1 rounded-md px-1 py-0.5 text-left hover:bg-slate-100 dark:hover:bg-slate-800"
        onClick={() => onSort(columnKey)}
        aria-sort={active ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
      >
        <span className="leading-snug">{label}</span>
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
  adminUid,
  canMutateUsers,
}: {
  token: string;
  adminUid: string;
  canMutateUsers: boolean;
}) {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const nextCursorRef = useRef<string | null>(null);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());
  const [datePreset, setDatePreset] = useState<DatePresetKey>("7d");
  const initialRange = useMemo(() => presetRange("7d"), []);
  const [dateStart, setDateStart] = useState(initialRange.start);
  const [dateEnd, setDateEnd] = useState(initialRange.end);
  const [sortKey, setSortKey] = useState<UserSortKey>("joinDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const loaderRunRef = useRef(0);

  const fetchUsersPage = useCallback(
    async (
      cursor: string | null,
      signal?: AbortSignal,
    ): Promise<AdminUsersPageResponse["data"]> => {
      const params = new URLSearchParams({
        limit: String(FETCH_PAGE_SIZE),
        orderBy: "joinDate",
        dir: "desc",
      });
      if (cursor) params.set("cursor", cursor);
      const res = await fetch(`/api/admin/users?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof json?.error === "string" ? json.error : "Failed to load users");
      }
      return (json as AdminUsersPageResponse).data || {};
    },
    [token],
  );

  const hydrateRemainingUsers = useCallback(
    async (
      initialCursor: string | null,
      runId: number,
      controller: AbortController,
      accumulated: AdminUser[],
    ): Promise<AdminUser[]> => {
      let cursor = initialCursor;
      let hasMore = Boolean(cursor);
      let allUsers = accumulated;

      while (hasMore && cursor && !controller.signal.aborted) {
        nextCursorRef.current = cursor;
        const pageData = await fetchUsersPage(cursor, controller.signal);
        if (loaderRunRef.current !== runId || controller.signal.aborted) return allUsers;
        const nextUsers = Array.isArray(pageData?.users) ? pageData.users : [];
        allUsers = mergeUsersById(allUsers, nextUsers, true);
        setUsers(allUsers);
        cursor = pageData?.nextCursor || null;
        hasMore = Boolean(pageData?.hasMore && cursor);
        nextCursorRef.current = cursor;
      }

      if (loaderRunRef.current === runId && !controller.signal.aborted) {
        nextCursorRef.current = null;
      }
      return allUsers;
    },
    [fetchUsersPage],
  );

  const hydrateUsers = useCallback(async () => {
    if (!token) return;
    const cached = usersHydrationCache.get(token);
    if (cached && Date.now() - cached.cachedAt < USERS_CACHE_TTL_MS) {
      setUsers(cached.users);
      setLoading(false);
      setLoadError(null);
      nextCursorRef.current = null;
      return;
    }

    const runId = loaderRunRef.current + 1;
    loaderRunRef.current = runId;
    const controller = new AbortController();

    setLoading(true);
    setLoadError(null);
    nextCursorRef.current = null;
    setUsers([]);

    void (async () => {
      try {
        const firstPage = await fetchUsersPage(null, controller.signal);
        if (loaderRunRef.current !== runId || controller.signal.aborted) return;
        let allUsers = Array.isArray(firstPage?.users) ? firstPage.users : [];
        setUsers(allUsers);
        setLoading(false);
        nextCursorRef.current = firstPage?.nextCursor || null;

        allUsers = await hydrateRemainingUsers(
          firstPage?.nextCursor || null,
          runId,
          controller,
          allUsers,
        );
        if (loaderRunRef.current !== runId || controller.signal.aborted) return;
        usersHydrationCache.set(token, { users: allUsers, cachedAt: Date.now() });
      } catch (err) {
        if (controller.signal.aborted || loaderRunRef.current !== runId) return;
        const message = err instanceof Error ? err.message : "Failed to load users";
        setLoadError(message);
        setLoading(false);
        toast.error(message, { id: "admin-users-load" });
      }
    })();

    return () => {
      controller.abort();
    };
  }, [fetchUsersPage, hydrateRemainingUsers, token]);

  const fetchUsers = useCallback(async () => {
    usersHydrationCache.delete(token);
    const cleanup = await hydrateUsers();
    return cleanup;
  }, [hydrateUsers, token]);

  useEffect(() => {
    let cleanup: void | (() => void);
    void (async () => {
      cleanup = await hydrateUsers();
    })();
    return () => {
      loaderRunRef.current += 1;
      if (cleanup) cleanup();
    };
  }, [hydrateUsers]);

  const retryBackgroundLoad = useCallback(() => {
    const cursor = nextCursorRef.current;
    if (!cursor || users.length === 0) {
      void hydrateUsers();
      return;
    }
    const runId = loaderRunRef.current + 1;
    loaderRunRef.current = runId;
    const controller = new AbortController();
    setLoadError(null);
    void hydrateRemainingUsers(cursor, runId, controller, users)
      .then((allUsers) => {
        if (controller.signal.aborted || loaderRunRef.current !== runId) return;
        usersHydrationCache.set(token, { users: allUsers, cachedAt: Date.now() });
      })
      .catch((err) => {
        if (controller.signal.aborted || loaderRunRef.current !== runId) return;
        const message = err instanceof Error ? err.message : "Failed to load users";
        setLoadError(message);
        toast.error(message, { id: "admin-users-load" });
      });
  }, [hydrateRemainingUsers, hydrateUsers, token, users]);

  useEffect(() => {
    setPage(0);
  }, [deferredSearch, dateStart, dateEnd, sortKey, sortDir]);

  useEffect(() => {
    const validIds = new Set(users.map((u) => u.id));
    setSelectedIds((prev) => new Set(Array.from(prev).filter((id) => validIds.has(id))));
  }, [users]);

  const joinDateUsers = useMemo(
    () => users.filter((u) => isWithinJoinRange(u, dateStart, dateEnd)),
    [users, dateStart, dateEnd],
  );

  const filteredUsers = useMemo(() => {
    const searched = deferredSearch
      ? joinDateUsers.filter((u) => userSearchHaystack(u).includes(deferredSearch))
      : joinDateUsers;
    return [...searched].sort((a, b) => compareUsers(a, b, sortKey, sortDir));
  }, [joinDateUsers, deferredSearch, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / UI_PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageStart = safePage * UI_PAGE_SIZE;
  const pageUsers = filteredUsers.slice(pageStart, pageStart + UI_PAGE_SIZE);
  const pageIds = pageUsers.map((u) => u.id);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
  const somePageSelected = pageIds.some((id) => selectedIds.has(id));

  function handleSort(key: UserSortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(
        key === "joinDate" || key === "questionCount" || key === "subjectCount" ? "desc" : "asc",
      );
    }
  }

  function applyPreset(key: DatePresetKey) {
    setDatePreset(key);
    if (key !== "custom") {
      const range = presetRange(key);
      setDateStart(range.start);
      setDateEnd(range.end);
    }
  }

  function togglePageSelected() {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allPageSelected) {
        pageIds.forEach((id) => next.delete(id));
      } else {
        pageIds.forEach((id) => next.add(id));
      }
      return next;
    });
  }

  function toggleRow(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function patchUser(user: AdminUser, body: Record<string, unknown>) {
    const res = await fetch(`/api/admin/users/${encodeURIComponent(user.id)}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(typeof json?.error === "string" ? json.error : "Failed to update user");
    }
    return json.data || {};
  }

  async function setUserBanned(user: AdminUser, banned: boolean) {
    try {
      const data = await patchUser(user, { banned });
      setUsers((prev) =>
        prev.map((u) =>
          u.id === user.id ? { ...u, status: data.status ?? (banned ? "banned" : "active") } : u,
        ),
      );
      toast.success(banned ? `Banned: ${user.email}` : `Unbanned: ${user.email}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update ban status");
    }
  }

  async function setUserDbAdmin(user: AdminUser, isAdmin: boolean) {
    try {
      const data = await patchUser(user, { isAdmin });
      setUsers((prev) =>
        prev.map((u) =>
          u.id === user.id
            ? {
                ...u,
                hasDbAdmin: data.hasDbAdmin ?? isAdmin,
                isAdmin: data.isAdmin ?? (u.hasEnvAdmin || isAdmin),
              }
            : u,
        ),
      );
      toast.success(isAdmin ? `Admin granted: ${user.email}` : `Admin revoked: ${user.email}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update admin");
    }
  }

  async function setUserState(user: AdminUser, nextState: string | null) {
    try {
      const data = await patchUser(user, { inferredState: nextState });
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, state: data.state ?? null } : u)),
      );
      toast.success(`State updated: ${user.email}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update state");
    }
  }

  async function promptAndSetUserState(user: AdminUser) {
    const next = window.prompt(
      "Set 2-letter state code (example: NJ). Leave blank to clear.",
      user.state ?? "",
    );
    if (next == null) return;
    const normalized = next.trim().toUpperCase();
    if (normalized === "") {
      await setUserState(user, null);
      return;
    }
    if (!/^[A-Z]{2}$/.test(normalized)) {
      toast.error("Enter a valid 2-letter state code.");
      return;
    }
    await setUserState(user, normalized);
  }

  async function clearGarbledLastName(user: AdminUser) {
    try {
      const data = await patchUser(user, { profileAction: "clear_garbled_last_name" });
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, lastName: data.lastName ?? "" } : u)),
      );
      toast.success(`Last name cleaned: ${user.email}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to clean last name");
    }
  }

  async function deleteUser(user: AdminUser) {
    if (user.id === adminUid || user.firebaseUid === adminUid) {
      toast.error("You cannot delete your own account.");
      return;
    }
    if (!window.confirm(`Delete ${user.email}? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(user.id)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof json?.error === "string" ? json.error : "Failed to delete user");
        return;
      }
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(user.id);
        return next;
      });
      toast.success(`Deleted: ${user.email}`);
    } catch {
      toast.error("Failed to delete user");
    }
  }

  async function runBulk(
    action: "ban" | "unban" | "grantAdmin" | "revokeAdmin" | "clearLastName" | "setState",
  ) {
    const selected = users.filter((u) => selectedIds.has(u.id));
    if (!selected.length) return;
    let bodyFor: (user: AdminUser) => Record<string, unknown>;
    if (action === "setState") {
      const next = window.prompt(
        "Set 2-letter state code for selected users. Leave blank to clear.",
        "",
      );
      if (next == null) return;
      const normalized = next.trim().toUpperCase();
      if (normalized !== "" && !/^[A-Z]{2}$/.test(normalized)) {
        toast.error("Enter a valid 2-letter state code.");
        return;
      }
      bodyFor = () => ({ inferredState: normalized || null });
    } else {
      bodyFor = () =>
        action === "ban"
          ? { banned: true }
          : action === "unban"
            ? { banned: false }
            : action === "grantAdmin"
              ? { isAdmin: true }
              : action === "revokeAdmin"
                ? { isAdmin: false }
                : { profileAction: "clear_garbled_last_name" };
    }

    const toastId = `bulk-${action}`;
    toast.loading(`Updating ${selected.length} users...`, { id: toastId });
    let failed = 0;
    for (const user of selected) {
      try {
        await patchUser(user, bodyFor(user));
      } catch {
        failed += 1;
      }
    }
    toast[failed ? "error" : "success"](
      failed ? `Bulk update finished with ${failed} failures.` : "Bulk update complete.",
      { id: toastId },
    );
  }

  const showingFrom = filteredUsers.length === 0 ? 0 : pageStart + 1;
  const showingTo = Math.min(pageStart + pageUsers.length, filteredUsers.length);

  return (
    <div className="space-y-4">
      <Card className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
        <CardHeader>
          <CardTitle className="dark:text-white">User Management</CardTitle>
          <CardDescription>
            Search across name, email, state, and more. Click column headers to sort.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email, state, status..."
              className="h-10 pl-9"
            />
          </div>

          <div className="flex flex-col gap-3 rounded-md border border-slate-200 p-3 dark:border-slate-800 md:flex-row md:items-end md:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                {DATE_PRESETS.map((preset) => (
                  <Button
                    key={preset.key}
                    type="button"
                    size="sm"
                    variant={datePreset === preset.key ? "default" : "outline"}
                    onClick={() => applyPreset(preset.key)}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  type="date"
                  value={dateStart}
                  onChange={(e) => {
                    setDatePreset("custom");
                    setDateStart(e.target.value);
                  }}
                  className="h-9 w-[150px]"
                  aria-label="Join date start"
                />
                <span className="text-sm text-slate-500">to</span>
                <Input
                  type="date"
                  value={dateEnd}
                  onChange={(e) => {
                    setDatePreset("custom");
                    setDateEnd(e.target.value);
                  }}
                  className="h-9 w-[150px]"
                  aria-label="Join date end"
                />
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  {joinDateUsers.length} in range
                </span>
              </div>
            </div>
            {canMutateUsers && selectedIds.size > 0 && (
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    Bulk actions ({selectedIds.size})
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={() => runBulk("setState")}>
                    Set/Clear State
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => runBulk("ban")}>Ban selected</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => runBulk("unban")}>
                    Unban selected
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => runBulk("grantAdmin")}>
                    Grant DB admin
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => runBulk("revokeAdmin")}>
                    Revoke DB admin
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => runBulk("clearLastName")}>
                    Blank garbled last names
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {loadError && (
            <div className="flex flex-col gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200 sm:flex-row sm:items-center sm:justify-between">
              <span>Could not load all users in the background.</span>
              <Button type="button" size="sm" variant="outline" onClick={retryBackgroundLoad}>
                Retry
              </Button>
            </div>
          )}

          <div className="flex flex-col gap-2 text-sm text-slate-600 dark:text-slate-400 sm:flex-row sm:items-center sm:justify-between">
            <span>
              Showing{" "}
              <strong>
                {showingFrom}-{showingTo}
              </strong>{" "}
              of <strong>{filteredUsers.length}</strong>
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={safePage === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Previous 50
              </Button>
              <span className="min-w-[80px] text-center text-xs">
                Page {safePage + 1} / {totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={safePage >= totalPages - 1}
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              >
                Next 50
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-md border dark:border-slate-700">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 dark:bg-slate-800/50">
                  <TableHead className="w-[46px]">
                    <input
                      type="checkbox"
                      checked={allPageSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = !allPageSelected && somePageSelected;
                      }}
                      onChange={togglePageSelected}
                      aria-label="Select current page"
                    />
                  </TableHead>
                  <SortableHead
                    label={`FName (${selectedIds.size})`}
                    columnKey="firstName"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={handleSort}
                  />
                  <SortableHead
                    label="LName"
                    columnKey="lastName"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={handleSort}
                  />
                  <SortableHead
                    label="Email"
                    columnKey="email"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={handleSort}
                  />
                  <SortableHead
                    label="State"
                    columnKey="state"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={handleSort}
                  />
                  <SortableHead
                    label="# Subjects"
                    columnKey="subjectCount"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={handleSort}
                  />
                  <SortableHead
                    label="# Questions"
                    columnKey="questionCount"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={handleSort}
                    className="text-right"
                  />
                  <SortableHead
                    label="Join Date"
                    columnKey="joinDate"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={handleSort}
                  />
                  <SortableHead
                    label="Status"
                    columnKey="status"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={handleSort}
                  />
                  <SortableHead
                    label="Admin"
                    columnKey="admin"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={handleSort}
                  />
                  <TableHead className="w-[70px] text-right font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading &&
                  Array.from({ length: 8 }).map((_, idx) => (
                    <TableRow key={`sk-${idx}`}>
                      {Array.from({ length: 11 }).map((__, cellIdx) => (
                        <TableCell key={cellIdx}>
                          <Skeleton className="h-4 w-full min-w-10" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}

                {!loading &&
                  pageUsers.map((user) => (
                    <TableRow key={user.id} className="dark:border-slate-700">
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(user.id)}
                          onChange={() => toggleRow(user.id)}
                          aria-label={`Select ${user.email}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium dark:text-slate-200">
                        {displayNamePart(user.firstName)}
                      </TableCell>
                      <TableCell className="dark:text-slate-300">
                        {displayNamePart(user.lastName)}
                      </TableCell>
                      <TableCell
                        className="max-w-[240px] truncate dark:text-slate-300"
                        title={user.email}
                      >
                        {user.email}
                      </TableCell>
                      <TableCell className="dark:text-slate-300">{user.state || "-"}</TableCell>
                      <TableCell
                        className="dark:text-slate-300"
                        title={user.subjectNames.join(", ")}
                      >
                        {user.subjectCount}
                        {user.subjectNames.length > 0 && (
                          <span className="ml-1 text-xs text-slate-500">
                            ({user.subjectNames.slice(0, 3).join(", ")}
                            {user.subjectNames.length > 3 ? "..." : ""})
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums dark:text-slate-300">
                        {user.questionCount}
                      </TableCell>
                      <TableCell className="dark:text-slate-300">
                        {formatDate(user.joinDate)}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            user.status === "active"
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                              : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                          }`}
                        >
                          {user.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">
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
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              aria-label={`Actions for ${user.email}`}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuItem
                              onClick={() =>
                                router.push(`/admin/users/${encodeURIComponent(user.id)}/dashboard`)
                              }
                            >
                              <User className="mr-2 h-4 w-4" />
                              See Details
                            </DropdownMenuItem>
                            {canMutateUsers ? (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => promptAndSetUserState(user)}>
                                  <MapPin className="mr-2 h-4 w-4" />
                                  {user.state ? "Update/Clear State" : "Set State"}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => setUserBanned(user, user.status === "active")}
                                >
                                  <Ban className="mr-2 h-4 w-4" />
                                  {user.status === "active" ? "Ban User" : "Unban User"}
                                </DropdownMenuItem>
                                {!user.hasDbAdmin ? (
                                  <DropdownMenuItem onClick={() => setUserDbAdmin(user, true)}>
                                    <Shield className="mr-2 h-4 w-4" />
                                    Grant DB admin
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem onClick={() => setUserDbAdmin(user, false)}>
                                    <ShieldOff className="mr-2 h-4 w-4" />
                                    Revoke DB admin
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={() => clearGarbledLastName(user)}>
                                  <BookOpen className="mr-2 h-4 w-4" />
                                  Blank garbled last name
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => deleteUser(user)}
                                  className="text-red-600 focus:text-red-600 dark:text-red-400"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete user
                                </DropdownMenuItem>
                              </>
                            ) : (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuLabel className="text-xs text-muted-foreground">
                                  Mutations require env admin access
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

          {!loading && filteredUsers.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="mb-4 h-12 w-12 text-slate-400" />
              <p className="text-lg font-medium text-slate-900 dark:text-slate-200">
                No users match this view
              </p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Adjust the join date range or search query.
              </p>
            </div>
          )}

          <div className="rounded-md border border-slate-200 p-3 dark:border-slate-800">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Date Range User Breakdown
            </p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Total users in range: <strong>{joinDateUsers.length}</strong>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
