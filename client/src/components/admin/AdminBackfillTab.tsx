"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Loader2, RefreshCcw, Square } from "lucide-react";
import toast from "react-hot-toast";

const CHUNK = 20;
const MAX_BATCHES = 50_000;

type BackfillStatus = Record<string, unknown> | null;
type ReconcileStatus = Record<string, unknown> | null;

type RunProgress = {
  batches: number;
  recomputed: number;
  skipped: number;
  lastUid: string | null;
  phase: string;
};

export function AdminBackfillTab({ token }: { token: string }) {
  const [runningBackfill, setRunningBackfill] = useState(false);
  const [runningReconcile, setRunningReconcile] = useState(false);
  const [backfillStatus, setBackfillStatus] = useState<BackfillStatus>(null);
  const [reconcileStatus, setReconcileStatus] = useState<ReconcileStatus>(null);
  const [ignoreBackfilled, setIgnoreBackfilled] = useState(false);
  const [bfProgress, setBfProgress] = useState<RunProgress | null>(null);
  const [recProgress, setRecProgress] = useState<RunProgress | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  async function refreshStatuses() {
    if (!token) return;
    try {
      const [bfRes, recRes] = await Promise.all([
        fetch("/api/admin/backfill-user-stats", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/admin/reconcile-user-stats", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      const bf = await bfRes.json().catch(() => ({}));
      const rec = await recRes.json().catch(() => ({}));
      setBackfillStatus(bf?.data ?? null);
      setReconcileStatus(rec?.data ?? null);
    } catch {
      // keep last known values
    }
  }

  useEffect(() => {
    void refreshStatuses();
  }, [token]);

  async function runFullBackfill() {
    if (!token || runningBackfill) return;
    const ac = new AbortController();
    abortRef.current = ac;
    setRunningBackfill(true);
    setBfProgress({ batches: 0, recomputed: 0, skipped: 0, lastUid: null, phase: "Starting…" });
    let mode: "restart" | "resume" = "restart";
    let totalRecomputed = 0;
    let totalSkipped = 0;
    let batches = 0;
    try {
      while (batches < MAX_BATCHES) {
        if (ac.signal.aborted) {
          toast("Backfill stopped");
          break;
        }
        const res = await fetch("/api/admin/backfill-user-stats", {
          method: "POST",
          signal: ac.signal,
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            dryRun: false,
            mode,
            chunkSize: CHUNK,
            maxUsers: CHUNK,
            ignoreBackfilled,
          }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          toast.error(typeof json?.error === "string" ? json.error : "Backfill failed");
          break;
        }
        const d = json.data as {
          status?: string;
          processedThisRun?: number;
          skippedThisRun?: number;
          lastUid?: string;
        };
        batches += 1;
        totalRecomputed += d.processedThisRun ?? 0;
        totalSkipped += d.skippedThisRun ?? 0;
        setBfProgress({
          batches,
          recomputed: totalRecomputed,
          skipped: totalSkipped,
          lastUid: typeof d.lastUid === "string" ? d.lastUid : null,
          phase: d.status === "completed" ? "Done" : `Batch ${batches}`,
        });
        setBackfillStatus(json.data ?? null);
        if (d.status === "completed") {
          toast.success(
            `Backfill finished: ${totalRecomputed.toLocaleString()} users updated, ${totalSkipped.toLocaleString()} already done (skipped)`,
          );
          break;
        }
        mode = "resume";
      }
      if (batches >= MAX_BATCHES) toast.error("Backfill stopped: safety limit reached");
      await refreshStatuses();
    } catch (e: unknown) {
      if ((e as Error)?.name === "AbortError") toast("Backfill stopped");
      else toast.error("Backfill request failed");
    } finally {
      abortRef.current = null;
      setRunningBackfill(false);
      setBfProgress(null);
    }
  }

  async function runFullReconcileRepair() {
    if (!token || runningReconcile) return;
    const ac = new AbortController();
    abortRef.current = ac;
    setRunningReconcile(true);
    setRecProgress({ batches: 0, recomputed: 0, skipped: 0, lastUid: null, phase: "Starting…" });
    let runMode: "restart" | "resume" = "restart";
    let totalChecked = 0;
    let totalRepaired = 0;
    let batches = 0;
    try {
      while (batches < MAX_BATCHES) {
        if (ac.signal.aborted) {
          toast("Reconcile stopped");
          break;
        }
        const res = await fetch("/api/admin/reconcile-user-stats", {
          method: "POST",
          signal: ac.signal,
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            mode: "repair",
            runMode,
            chunkSize: CHUNK,
            maxUsers: CHUNK,
            driftThreshold: 0,
          }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          toast.error(typeof json?.error === "string" ? json.error : "Reconcile failed");
          break;
        }
        const d = json.data as {
          status?: string;
          checked?: number;
          repaired?: number;
          lastUid?: string;
        };
        batches += 1;
        totalChecked += d.checked ?? 0;
        totalRepaired += d.repaired ?? 0;
        setRecProgress({
          batches,
          recomputed: totalChecked,
          skipped: totalRepaired,
          lastUid: typeof d.lastUid === "string" ? d.lastUid : null,
          phase: d.status === "completed" ? "Done" : `Batch ${batches}`,
        });
        setReconcileStatus(json.data ?? null);
        if (d.status === "completed") {
          toast.success(
            `Reconcile finished: checked ${totalChecked.toLocaleString()}, repaired ${totalRepaired.toLocaleString()}`,
          );
          break;
        }
        runMode = "resume";
      }
      if (batches >= MAX_BATCHES) toast.error("Reconcile stopped: safety limit reached");
      await refreshStatuses();
    } catch (e: unknown) {
      if ((e as Error)?.name === "AbortError") toast("Reconcile stopped");
      else toast.error("Reconcile request failed");
    } finally {
      abortRef.current = null;
      setRunningReconcile(false);
      setRecProgress(null);
    }
  }

  function stopRun() {
    abortRef.current?.abort();
  }

  const busy = runningBackfill || runningReconcile;

  return (
    <div className="space-y-4">
      <Card className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
        <CardHeader>
          <CardTitle className="dark:text-white">User stats backfill</CardTitle>
          <CardDescription className="dark:text-slate-400">
            One run processes every user in order. Users with{" "}
            <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 rounded">userStatsBackfilled</code> are skipped
            so work is not repeated. Use “ignore marks” only if you need a full recompute again.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
            <Checkbox
              checked={ignoreBackfilled}
              onCheckedChange={(v) => setIgnoreBackfilled(v === true)}
              disabled={busy}
            />
            Recompute everyone (ignore completion marks)
          </label>

          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => void runFullBackfill()} disabled={!token || busy}>
              {runningBackfill ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Run full backfill
            </Button>
            {runningBackfill ? (
              <Button type="button" variant="outline" onClick={stopRun}>
                <Square className="w-4 h-4 mr-2" />
                Stop
              </Button>
            ) : null}
            <Button variant="ghost" size="sm" onClick={() => void refreshStatuses()} disabled={busy}>
              <RefreshCcw className="w-4 h-4 mr-2" />
              Refresh status
            </Button>
          </div>

          {bfProgress ? (
            <div className="space-y-2 rounded-lg border border-slate-200 dark:border-slate-700 p-3 bg-slate-50/80 dark:bg-slate-800/40">
              <div className="flex justify-between text-sm text-slate-600 dark:text-slate-300">
                <span>{bfProgress.phase}</span>
                <span>
                  Updated {bfProgress.recomputed.toLocaleString()} · Skipped {bfProgress.skipped.toLocaleString()}
                </span>
              </div>
              <Progress className={runningBackfill ? "animate-pulse" : ""} value={runningBackfill ? 33 : 100} />
              {bfProgress.lastUid ? (
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono break-all">Last uid: {bfProgress.lastUid}</p>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
        <CardHeader>
          <CardTitle className="text-base dark:text-white">Reconcile (repair)</CardTitle>
          <CardDescription className="dark:text-slate-400">
            Walks all users, compares rollups to source data, and writes repairs. Separate from the backfill completion
            flag.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" onClick={() => void runFullReconcileRepair()} disabled={!token || busy}>
              {runningReconcile ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Run full reconcile (repair)
            </Button>
            {runningReconcile ? (
              <Button type="button" variant="outline" onClick={stopRun}>
                <Square className="w-4 h-4 mr-2" />
                Stop
              </Button>
            ) : null}
          </div>
          {recProgress ? (
            <div className="space-y-2 rounded-lg border border-slate-200 dark:border-slate-700 p-3 bg-slate-50/80 dark:bg-slate-800/40">
              <div className="flex justify-between text-sm text-slate-600 dark:text-slate-300">
                <span>{recProgress.phase}</span>
                <span>
                  Checked {recProgress.recomputed.toLocaleString()} · Repaired {recProgress.skipped.toLocaleString()}
                </span>
              </div>
              <Progress className={runningReconcile ? "animate-pulse" : ""} value={runningReconcile ? 33 : 100} />
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-base dark:text-white">Backfill checkpoint</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs whitespace-pre-wrap break-words text-slate-700 dark:text-slate-200 max-h-64 overflow-auto">
              {JSON.stringify(backfillStatus, null, 2) || "No status yet"}
            </pre>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-base dark:text-white">Reconcile checkpoint</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs whitespace-pre-wrap break-words text-slate-700 dark:text-slate-200 max-h-64 overflow-auto">
              {JSON.stringify(reconcileStatus, null, 2) || "No status yet"}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
