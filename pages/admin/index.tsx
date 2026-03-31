"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useRouter } from "next/router";
import { auth } from "../../lib/firebase";
import {
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  User,
  browserPopupRedirectResolver,
} from "firebase/auth";
import toast, { Toaster } from "react-hot-toast";
import { BookOpen, Search, LogOut, AlertCircle, Loader2, Zap, Play, Square, Pencil } from "lucide-react";
import { Progress } from "../../client/src/components/ui/progress";
import Link from "next/link";
import { Button } from "../../client/src/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../client/src/components/ui/card";
import { Input } from "../../client/src/components/ui/input";
import { Alert, AlertDescription } from "../../client/src/components/ui/alert";
import { Checkbox } from "../../client/src/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "../../client/src/components/ui/switch";
import { Label } from "../../client/src/components/ui/label";
import { AdminDashboardLayout } from "../../client/src/components/admin/AdminDashboardLayout";
import { AdminInsightsTab } from "../../client/src/components/admin/AdminInsightsTab";
import { AdminUsersTab } from "../../client/src/components/admin/AdminUsersTab";
import { getSubjectDisplayName, SUBJECT_DISPLAY_NAMES } from "../../lib/subject-display-names";
import { ExplanationMarkdown } from "../../client/src/components/ui/ExplanationMarkdown";

const googleProvider = new GoogleAuthProvider();

const AP_SUBJECT_CODES: string[] = [
  "APMACRO", "APMICRO", "APCSP", "APCHEM", "APGOV", "APPSYCH", "APBIO",
  "APCALCAB", "APCALCBC", "APCSA", "APUSH", "APWH", "APEURO",
  "APLANG", "APLIT", "APSTATS", "APPHYS1", "APPHYS2", "APES", "APHUG",
];

const VALID_TABS = ["insights", "library", "users"] as const;
type AdminTab = (typeof VALID_TABS)[number];

type Block =
  | { type: "text"; value: string }
  | { type: "image"; url: string };

type Question = {
  id: string;
  question_id?: number;
  subject_code?: string;
  section_code?: string;
  prompt_blocks?: Block[];
  choices?: Record<"A" | "B" | "C" | "D" | "E", Block[]>;
  answerIndex: number;
  correct_answer?: string;
  explanation?: string;
  tags?: string[];
  test_slug?: string | null;
  course?: string | null;
  chapter?: string | null;
  difficulty?: string | null;
  // Legacy fields for backward compatibility
  prompt?: string;
  image_urls?: {
    question?: string[];
    A?: string[];
    B?: string[];
    C?: string[];
    D?: string[];
    E?: string[];
  };
  lastVerification?: {
    verifiedAt?: { seconds?: number; nanoseconds?: number } | Date | string;
    source?: string;
    model?: string | null;
    status?: string;
    lintErrors?: string[];
    lintWarnings?: string[];
    imageErrors?: string[];
    issues?: string[];
    checks?: Record<string, boolean>;
    confidence?: string | null;
  };
};

function getDifficultyFromQuestion(q: Question): string {
  if (q.difficulty) return q.difficulty;
  const tag = (q.tags || []).find(t => typeof t === "string" && t.startsWith("difficulty:"));
  return tag ? String(tag).replace(/^difficulty:/, "").trim() : "";
}

function getReasoningFromQuestion(q: Question): string {
  const tag = (q.tags || []).find(t => typeof t === "string" && t.startsWith("reasoning:"));
  return tag ? String(tag).replace(/^reasoning:/, "").trim() : "";
}

function getErrorReasonFromQuestion(q: Question): string {
  const tag = (q.tags || []).find(t => typeof t === "string" && t.startsWith("error_reason:"));
  return tag ? String(tag).replace(/^error_reason:/, "").trim() : "";
}

function renderVerificationStatus(q: Question) {
  const v = q.lastVerification;
  if (!v?.status) {
    return <span className="text-slate-400 dark:text-slate-500">—</span>;
  }
  const label =
    v.status === "pass"
      ? "OK"
      : v.status === "needs_review"
        ? "Review"
        : v.status === "fail" || v.status === "error"
          ? "Fail"
          : v.status;
  const title = (v.issues && v.issues.length > 0 ? v.issues : [v.status]).join("\n");
  const cls =
    v.status === "pass"
      ? "text-green-600 dark:text-green-400"
      : v.status === "needs_review"
        ? "text-amber-600 dark:text-amber-400"
        : "text-red-600 dark:text-red-400";
  return (
    <span className={`font-medium text-xs ${cls}`} title={title}>
      {label}
    </span>
  );
}

function getStudyNoteFromQuestion(q: Question): string {
  const fromSlug = (q.test_slug ?? "").trim();
  if (fromSlug) return fromSlug;
  const tag = (q.tags || []).find(t => typeof t === "string" && t.startsWith("study_note:"));
  return tag ? String(tag).replace(/^study_note:\s*/, "").trim() : "";
}

function extractPromptText(q: Question): string {
  if (q.prompt_blocks && q.prompt_blocks.length > 0) {
    return q.prompt_blocks
      .filter((block): block is { type: "text"; value: string } => block.type === "text")
      .map(block => block.value)
      .join(" ");
  }
  return q.prompt || "";
}

function extractChoicesText(q: Question): string {
  if (q.choices && typeof q.choices === "object" && !Array.isArray(q.choices)) {
    const keys: Array<"A" | "B" | "C" | "D" | "E"> = ["A", "B", "C", "D", "E"];
    return keys
      .map(key => {
        const blocks = q.choices![key];
        if (!blocks) return "";
        const text = blocks
          .filter((block): block is { type: "text"; value: string } => block.type === "text")
          .map(block => block.value)
          .join(" ");
        return text.trim();
      })
      .filter(Boolean)
      .join("\n");
  }
  if (Array.isArray(q.choices)) {
    return q.choices.join("\n");
  }
  return "";
}

function extractChoicesData(q: Question): Record<'A' | 'B' | 'C' | 'D' | 'E', string> {
  const result: Record<'A' | 'B' | 'C' | 'D' | 'E', string> = {
    A: "", B: "", C: "", D: "", E: ""
  };

  if (q.choices && typeof q.choices === "object" && !Array.isArray(q.choices)) {
    const keys: Array<"A" | "B" | "C" | "D" | "E"> = ["A", "B", "C", "D", "E"];
    keys.forEach(key => {
      const blocks = q.choices![key];
      if (!blocks) {
        result[key] = "";
        return;
      }
      const text = blocks
        .filter((block): block is { type: "text"; value: string } => block.type === "text")
        .map(block => block.value)
        .join(" ");
      result[key] = text.trim();
    });
  } else if (Array.isArray(q.choices)) {
    const keys: Array<"A" | "B" | "C" | "D" | "E"> = ["A", "B", "C", "D", "E"];
    q.choices.forEach((choice, idx) => {
      if (idx < keys.length) {
        result[keys[idx]] = choice || "";
      }
    });
  }

  return result;
}

function truncateText(text: string, maxWords: number = 10): string {
  if (!text || text.trim() === "") return "";
  const words = text.trim().split(/\s+/);
  if (words.length <= maxWords) return text;
  return words.slice(0, maxWords).join(" ") + "...";
}

/** Escapes HTML and converts **text** to <strong> for Explanation column. */
function renderSimpleMarkdownHtml(text: string): string {
  if (!text) return "";
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return escaped.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

/** Pretty-prints study notes: escape HTML, **bold**, newlines → <br />, trim long runs of spaces. */
function renderStudyNotesHtml(text: string): string {
  if (!text) return "";
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const withBold = escaped.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  const withBreaks = withBold.replace(/\n/g, "<br />");
  return withBreaks.replace(/[ \t]+/g, " ").trim();
}

export default function AdminPage() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string>("");
  const [loading, setLoading] = useState(true);
  /** Admin access: derived from API (subject-status). No client-side admin list. */
  const [adminStatus, setAdminStatus] = useState<"pending" | "allowed" | "forbidden">("pending");

  // Data
  const [items, setItems] = useState<Question[]>([]);

  // Filters
  const [subject, setSubject] = useState("");
  const [section, setSection] = useState("");
  const [showOnlyMissingExplanation, setShowOnlyMissingExplanation] = useState(false);
  const [showOnlyErrorReports, setShowOnlyErrorReports] = useState(false);
  const [showOnlyUnverified, setShowOnlyUnverified] = useState(false);
  const [showOnlyVerificationFailed, setShowOnlyVerificationFailed] = useState(false);

  const allApSubjectsRef = AP_SUBJECT_CODES.map((code) => ({
    code,
    label: getSubjectDisplayName(code),
  })).sort((a, b) => a.label.localeCompare(b.label));
  const availableSubjects = allApSubjectsRef.map(s => s.code);
  const [availableSections, setAvailableSections] = useState<string[]>([]);

  const displayedItems = useMemo(() => {
    let list = items;
    if (showOnlyMissingExplanation) {
      list = list.filter(q => !q.explanation || q.explanation.trim() === "");
    }
    if (showOnlyErrorReports) {
      list = list.filter(q => (q.tags || []).includes("error_reported"));
    }
    if (showOnlyUnverified) {
      list = list.filter((q) => !q.lastVerification?.status);
    }
    if (showOnlyVerificationFailed) {
      list = list.filter((q) => {
        const s = q.lastVerification?.status;
        return s === "fail" || s === "error";
      });
    }
    return list;
  }, [items, showOnlyMissingExplanation, showOnlyErrorReports, showOnlyUnverified, showOnlyVerificationFailed]);

  // AI explanation generation state
  const [generatingExplanations, setGeneratingExplanations] = useState(false);
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(
    new Set(),
  );
  const [selectedAction, setSelectedAction] = useState<string>("fix-prompts");
  const [cheatMode, setCheatMode] = useState(false);
  const aiActionAbortRef = useRef<AbortController | null>(null);
  const [explanationProgress, setExplanationProgress] = useState<{
    current: number;
    total: number;
    updated: number;
    skipped: number;
    failed: number;
    message: string;
    passed?: number;
    flagged?: number;
    verifyFailed?: number;
  } | null>(null);

  // Add Subject state
  const [addSubjectCode, setAddSubjectCode] = useState("");
  const [addingSubject, setAddingSubject] = useState(false);
  const [addSubjectProgress, setAddSubjectProgress] = useState<{
    current: number;
    total: number;
    imported: number;
    skipped: number;
    errors: number;
    message: string;
    phase: string;
  } | null>(null);
  const [addSubjectLog, setAddSubjectLog] = useState<string[]>([]);
  const addSubjectAbortRef = useRef<AbortController | null>(null);
  const [subjectStatus, setSubjectStatus] = useState<Record<string, { hasQuestions: boolean; questionCount: number }>>({});
  const [loadingStatus, setLoadingStatus] = useState(false);

  const [migratingImages, setMigratingImages] = useState(false);
  const [migrateSubjectCode, setMigrateSubjectCode] = useState("");
  const migrateAbortRef = useRef<AbortController | null>(null);
  const [migrateProgress, setMigrateProgress] = useState<{
    current: number;
    total: number;
    made_public: number;
    failed: number;
    skipped: number;
    message: string;
  } | null>(null);

  const [migratingExternalImages, setMigratingExternalImages] = useState(false);
  const migrateExternalAbortRef = useRef<AbortController | null>(null);
  const [migrateExternalProgress, setMigrateExternalProgress] = useState<{
    current: number;
    total: number;
    questions_processed: number;
    images_migrated: number;
    failed: number;
    message: string;
  } | null>(null);

  const availableToAdd = allApSubjectsRef.filter(s => !subjectStatus[s.code]?.hasQuestions);
  const alreadyAdded = allApSubjectsRef.filter(s => subjectStatus[s.code]?.hasQuestions);

  async function fetchSubjectStatus() {
    if (!token) return;
    setLoadingStatus(true);
    try {
      const res = await fetch("/api/admin/subject-status", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 403) {
        setAdminStatus("forbidden");
      } else if (res.ok) {
        setAdminStatus("allowed");
        const data = await res.json();
        setSubjectStatus(data.data || {});
      } else {
        setAdminStatus("forbidden");
      }
    } catch (err) {
      console.error("Failed to fetch subject status:", err);
      setAdminStatus("forbidden");
    } finally {
      setLoadingStatus(false);
    }
  }

  async function startAddSubject() {
    if (!token || !addSubjectCode) return;
    setAddingSubject(true);
    setAddSubjectLog([]);
    const subjectLabel = allApSubjectsRef.find(s => s.code === addSubjectCode)?.label || addSubjectCode;
    setAddSubjectProgress({
      current: 0,
      total: 0,
      imported: 0,
      skipped: 0,
      errors: 0,
      message: `Starting import for ${subjectLabel}...`,
      phase: "probing",
    });

    const controller = new AbortController();
    addSubjectAbortRef.current = controller;

    try {
      const res = await fetch("/api/admin/add-subject", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ subjectCode: addSubjectCode }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Failed to add subject");
        setAddingSubject(false);
        return;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        toast.error("No response stream");
        setAddingSubject(false);
        return;
      }

      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === "progress" || event.type === "batch" || event.type === "status") {
              setAddSubjectProgress({
                current: event.current || 0,
                total: event.total || 0,
                imported: event.imported || 0,
                skipped: event.skipped || 0,
                errors: event.errors || 0,
                message: event.message || "",
                phase: event.phase || "scraping",
              });
            }
            if (event.type === "complete") {
              toast.success(event.message);
              fetchSubjectStatus();
              setAddSubjectCode("");
            }
          } catch {}
        }
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        toast.error("Failed: " + err.message);
      }
    } finally {
      setAddingSubject(false);
      addSubjectAbortRef.current = null;
    }
  }

  function stopAddSubject() {
    addSubjectAbortRef.current?.abort();
    setAddingSubject(false);
    toast("Import cancelled");
  }

  const [removingSubject, setRemovingSubject] = useState<string | null>(null);

  async function removeSubject(code: string) {
    if (!token) return;
    if (!confirm(`Remove all questions for ${code}? This cannot be undone.`)) return;
    setRemovingSubject(code);
    try {
      const res = await fetch("/api/admin/questions/delete-subject", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ subjectCode: code }),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(`Removed ${data.deleted} questions for ${code}`);
        fetchSubjectStatus();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to remove subject");
      }
    } catch (err: any) {
      toast.error("Remove failed: " + err.message);
    } finally {
      setRemovingSubject(null);
    }
  }

  async function startImageMigration() {
    if (!token) return;
    setMigratingImages(true);
    setMigrateExternalProgress(null);
    setMigrateProgress({ current: 0, total: 0, made_public: 0, failed: 0, skipped: 0, message: "Starting migration..." });

    const controller = new AbortController();
    migrateAbortRef.current = controller;

    try {
      const res = await fetch("/api/admin/migrate-images", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ subjectCode: migrateSubjectCode && migrateSubjectCode !== "all" ? migrateSubjectCode : undefined }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Failed to start migration");
        setMigratingImages(false);
        return;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        toast.error("No response stream");
        setMigratingImages(false);
        return;
      }

      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === "progress") {
              setMigrateProgress({
                current: event.current || 0,
                total: event.total || 0,
                made_public: event.made_public || 0,
                failed: event.failed || 0,
                skipped: event.skipped || 0,
                message: event.message || "",
              });
            }
            if (event.type === "complete") {
              toast.success(event.message);
              setMigrateProgress({
                current: event.total || 0,
                total: event.total || 0,
                made_public: event.made_public || 0,
                failed: event.failed || 0,
                skipped: event.skipped || 0,
                message: event.message || "",
              });
            }
            if (event.type === "error") {
              toast.error(event.message);
            }
          } catch {}
        }
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        toast.error("Migration failed: " + err.message);
      }
    } finally {
      setMigratingImages(false);
      migrateAbortRef.current = null;
    }
  }

  function stopImageMigration() {
    migrateAbortRef.current?.abort();
    setMigratingImages(false);
    toast("Migration cancelled");
  }

  async function startExternalImageMigration() {
    if (!token) return;
    setMigratingExternalImages(true);
    setMigrateProgress(null);
    setMigrateExternalProgress({
      current: 0,
      total: 0,
      questions_processed: 0,
      images_migrated: 0,
      failed: 0,
      message: "Starting...",
    });

    const controller = new AbortController();
    migrateExternalAbortRef.current = controller;

    try {
      const res = await fetch("/api/admin/migrate-external-images", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          subjectCode: migrateSubjectCode && migrateSubjectCode !== "all" ? migrateSubjectCode : undefined,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error((err as any).error || "Failed to start migration");
        setMigratingExternalImages(false);
        return;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) {
        toast.error("No response stream");
        setMigratingExternalImages(false);
        return;
      }

      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === "progress") {
              setMigrateExternalProgress({
                current: event.current ?? 0,
                total: event.total ?? 0,
                questions_processed: event.questions_processed ?? 0,
                images_migrated: event.images_migrated ?? 0,
                failed: event.failed ?? 0,
                message: event.message ?? "",
              });
            }
            if (event.type === "complete") {
              toast.success(event.message);
              setMigrateExternalProgress({
                current: event.current ?? event.total ?? 0,
                total: event.total ?? 0,
                questions_processed: event.questions_processed ?? 0,
                images_migrated: event.images_migrated ?? 0,
                failed: event.failed ?? 0,
                message: event.message ?? "",
              });
            }
            if (event.type === "error") {
              toast.error(event.message);
            }
          } catch {}
        }
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        toast.error("Migration failed: " + err.message);
      }
    } finally {
      setMigratingExternalImages(false);
      migrateExternalAbortRef.current = null;
    }
  }

  function stopExternalImageMigration() {
    migrateExternalAbortRef.current?.abort();
    setMigratingExternalImages(false);
    toast("Migration cancelled");
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const t = await u.getIdToken();
        setToken(t);
      } else {
        setToken("");
        setAdminStatus("pending");
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (token) fetchSubjectStatus();
  }, [token]);

  useEffect(() => {
    const savedCheatMode = localStorage.getItem('adminCheatMode');
    if (savedCheatMode) {
      setCheatMode(savedCheatMode === 'true');
    }
  }, []);

  // Update sections when subject changes
  useEffect(() => {
    if (!subject) {
      setAvailableSections([]);
      setSection("");
      return;
    }

    const subjectSections: Record<string, string[]> = {
      APMACRO: ["BEC", "EI", "NI", "FS", "LR", "OT"],
      APMICRO: ["BEC", "SD", "PC", "IMP", "FM", "MF"],
      APCSP: ["CRD", "DAT", "AAP", "CSN", "IOC"],
      APCHEM: ["AMS", "MIP", "IMF", "CR", "KIN", "THE", "EQ", "AB", "ATD"],
      APGOV: ["FOP", "ILR", "CLR", "APB", "PPP"],
      APPSYCH: ["BIO", "COG", "DEV", "SOC", "MPH"],
      APBIO: ["CL", "CSF", "CE", "CCC", "HER", "GER", "NS", "ECO"],
      APCALCAB: ["LIM", "DDF", "DCI", "CAD", "AAD", "IAC", "DE", "AI"],
      APCALCBC: ["LIM", "DDF", "DCI", "CAD", "AAD", "IAC", "DE", "AI", "PPV", "ISS"],
      APCSA: ["U1", "U2", "U3", "U4"],
      APUSH: ["P1", "P2", "P3", "P4", "P5", "P6", "P7", "P8", "P9"],
      APWH: ["GT", "NE", "LBE", "TI", "REV", "COI", "GC", "CWD", "GLO"],
      APEURO: ["RE", "AR", "AC", "SPP", "CRR", "IND", "NPP", "GCF", "CCE"],
      APLANG: ["CRE", "SS", "RS", "OC", "ARG"],
      APLIT: ["SF1", "PO1", "LF1", "SF2", "PO2", "LF2", "SF3", "PO3", "LF3"],
      APSTATS: ["EOV", "ETV", "CD", "PRD", "SD", "ICP", "IQM", "ICC", "IQS"],
      APPHYS1: ["KIN", "FTD", "WEP", "LMO", "TRD", "EMR", "OSC", "FLU"],
      APPHYS2: ["THD", "EFP", "EC", "MEI", "GPO", "WPO", "MOD"],
      APES: ["LWE", "LWB", "POP", "ESR", "LWU", "ERC", "APL", "ATP", "GCH"],
      APHUG: ["TG", "PMP", "CPP", "PPP", "ARL", "CUL", "IED"],
    };

    setAvailableSections(subjectSections[subject] || []);
    setSection("all"); // Reset section when subject changes
  }, [subject]);

  /** Admin access is determined by API (subject-status); no client-exposed admin list. */
  const isAllowed = adminStatus === "allowed";

  const router = useRouter();
  const tabFromQuery = router.query.tab;
  const tab: AdminTab =
    typeof tabFromQuery === "string" && VALID_TABS.includes(tabFromQuery as AdminTab)
      ? (tabFromQuery as AdminTab)
      : "insights";

  useEffect(() => {
    if (!router.isReady) return;
    const q = router.query.tab;
    if (q !== "insights" && q !== "library" && q !== "users") {
      router.replace("/admin?tab=insights", undefined, { shallow: true });
    }
  }, [router.isReady, router.query.tab]);

  async function fetchFiltered() {
    if (!token) return;
    const sectionParam = section === "all" ? "" : section;
    const res = await fetch(
      `/api/admin/questions/query?subject=${subject}&section=${sectionParam}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const data = await res.json();
    setItems(data.items || []);
    setSelectedQuestions(new Set());
  }

  async function updateQuestion(id: string, patch: Partial<Question>) {
    if (!token) return;
    const updatePromise = fetch(`/api/admin/questions/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(patch),
    }).then((res) => {
      if (!res.ok) throw new Error("Update failed");
      return res;
    });

    toast.promise(updatePromise, {
      loading: "Updating question...",
      success: "Question updated successfully!",
      error: "Failed to update question",
    });

    await updatePromise.then(() => fetchFiltered()).catch(() => {});
  }

  async function deleteQuestion(id: string) {
    if (!token) return;

    const deletePromise = fetch(`/api/admin/questions/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }).then((res) => {
      if (!res.ok) throw new Error("Delete failed");
      setItems((prev) => prev.filter((q) => q.id !== id));
      setSelectedQuestions((prev) => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
      return res;
    });

    toast.promise(deletePromise, {
      loading: "Deleting question...",
      success: "Question deleted successfully!",
      error: "Failed to delete question",
    });
  }

  async function executeAIAction() {
    if (!token || selectedQuestions.size === 0) {
      toast.error("Please select at least one question");
      return;
    }

    setGeneratingExplanations(true);
    const questionIds = Array.from(selectedQuestions);

    let endpoint = "/api/generateExplanations";

    switch (selectedAction) {
      case "explanations":
        endpoint = "/api/generateExplanations";
        break;
      case "re-generate-explanations":
        endpoint = "/api/reGenerateExplanations";
        break;
      case "fix-prompts":
        endpoint = "/api/fixPromptsChoices";
        break;
      case "grade-difficulty":
        endpoint = "/api/admin/auto-tag-difficulty";
        break;
      case "study-notes":
        endpoint = "/api/admin/generate-study-notes";
        break;
      case "re-generate-study-notes":
        endpoint = "/api/admin/re-generate-study-notes";
        break;
      case "verify-questions":
        endpoint = "/api/admin/verify-questions";
        break;
    }

    const actionLabel = selectedAction === "explanations" ? "Explanation Generation"
      : selectedAction === "re-generate-explanations" ? "Explanation Re-Generation"
      : selectedAction === "fix-prompts" ? "Prompt Fixing"
      : selectedAction === "study-notes" ? "Study Notes Generation"
      : selectedAction === "re-generate-study-notes" ? "Study Notes Re-Generation"
      : selectedAction === "verify-questions" ? "Question Verification"
      : "Difficulty Tagging";

    setExplanationProgress({
      current: 0,
      total: questionIds.length,
      updated: 0,
      skipped: 0,
      failed: 0,
      passed: selectedAction === "verify-questions" ? 0 : undefined,
      flagged: selectedAction === "verify-questions" ? 0 : undefined,
      verifyFailed: selectedAction === "verify-questions" ? 0 : undefined,
      message: `Starting ${actionLabel} for ${questionIds.length} questions...`,
    });

    const controller = new AbortController();
    aiActionAbortRef.current = controller;

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(
          selectedAction === "re-generate-study-notes"
            ? { questionIds }
            : { questionIds, model: "2.5lite" }
        ),
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || `Failed to start ${actionLabel}`);
        setGeneratingExplanations(false);
        setExplanationProgress(null);
        return;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        toast.error("No response stream");
        setGeneratingExplanations(false);
        setExplanationProgress(null);
        return;
      }

      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === "progress" || event.type === "rate_limit" || event.type === "error") {
              setExplanationProgress({
                current: event.current || 0,
                total: event.total || questionIds.length,
                updated: event.updated || 0,
                skipped: event.skipped || 0,
                failed: event.failed || 0,
                message: event.message || "",
                passed: typeof event.passed === "number" ? event.passed : undefined,
                flagged: typeof event.flagged === "number" ? event.flagged : undefined,
                verifyFailed: typeof event.verifyFailed === "number" ? event.verifyFailed : undefined,
              });
            }
            if (event.type === "complete") {
              setExplanationProgress((prev) =>
                prev && typeof event.passed === "number"
                  ? {
                      ...prev,
                      current: event.total || prev.total,
                      skipped: event.skipped ?? prev.skipped,
                      failed: event.failed ?? prev.failed,
                      passed: event.passed,
                      flagged: event.flagged ?? prev.flagged,
                      verifyFailed: event.verifyFailed ?? prev.verifyFailed,
                      message: event.message || prev.message,
                    }
                  : prev,
              );
              toast.success(event.message);
              fetchFiltered();
            }
          } catch {}
        }
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        toast.error("Failed: " + err.message);
      }
    } finally {
      setGeneratingExplanations(false);
      aiActionAbortRef.current = null;
      setTimeout(() => setExplanationProgress(null), 5000);
    }
  }

  function stopAIAction() {
    aiActionAbortRef.current?.abort();
    setGeneratingExplanations(false);
    toast("AI action cancelled");
    setTimeout(() => setExplanationProgress(null), 2000);
  }

  function toggleQuestion(id: string) {
    setSelectedQuestions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }

  function toggleSelectAll() {
    const allDisplayedSelected = displayedItems.length > 0 && displayedItems.every(q => selectedQuestions.has(q.id));
    if (allDisplayedSelected) {
      setSelectedQuestions(new Set());
    } else {
      setSelectedQuestions(new Set(displayedItems.map(q => q.id)));
    }
  }

  const handleCheatModeToggle = (checked: boolean) => {
    setCheatMode(checked);
    localStorage.setItem('adminCheatMode', checked.toString());
    toast.success(checked ? 'Cheat mode enabled' : 'Cheat mode disabled');
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0B0F1A] flex items-center justify-center">
        <div className="text-slate-900 dark:text-slate-300">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0B0F1A] flex items-center justify-center px-4">
        <Card className="w-full max-w-md dark:bg-slate-900/60 dark:border-slate-800">
          <CardHeader className="text-center">
            <Link href="/" className="inline-flex items-center justify-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
                <BookOpen className="w-7 h-7 text-white" />
              </div>
              <span className="text-3xl font-bold text-slate-900 dark:text-white">APMaster</span>
            </Link>
            <CardTitle className="text-2xl">Admin Login</CardTitle>
            <CardDescription>Sign in to access the admin dashboard</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => signInWithPopup(auth, googleProvider, browserPopupRedirectResolver)}
              className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white"
            >
              Sign in with Google
            </Button>
            <div className="mt-4 text-center">
              <Link href="/" className="text-blue-600 hover:text-blue-500 transition-colors text-sm">
                ← Back to home
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (adminStatus === "pending") {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0B0F1A] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-900 dark:text-slate-300">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span>Checking access...</span>
        </div>
      </div>
    );
  }

  if (!isAllowed) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0B0F1A] flex items-center justify-center px-4">
        <Card className="w-full max-w-md dark:bg-slate-900/60 dark:border-slate-800">
          <CardHeader className="text-center">
            <Link href="/" className="inline-flex items-center justify-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
                <BookOpen className="w-7 h-7 text-white" />
              </div>
              <span className="text-3xl font-bold text-slate-900 dark:text-white">APMaster</span>
            </Link>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Access denied</strong>
                <br />
                You are not authorized to access the admin dashboard. Contact your administrator to request access.
              </AlertDescription>
            </Alert>
            <div className="flex flex-col gap-2">
              <Button
                onClick={() => signOut(auth)}
                variant="outline"
                className="w-full"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign out
              </Button>
              <Link href="/" className="w-full">
                <Button variant="default" className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600">
                  Go to Home
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B0F1A]">
      <Toaster position="top-right" />
      <AdminDashboardLayout
        tab={tab}
        userEmail={user?.email ?? null}
        cheatMode={cheatMode}
        onCheatModeChange={handleCheatModeToggle}
      >
        {tab === "insights" && <AdminInsightsTab token={token} />}
        {tab === "library" && (
      <div className="space-y-4">
        {/* Subjects Overview */}
        <Card className="dark:bg-slate-900/60 dark:border-slate-800">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-xl dark:text-white">
                  <BookOpen className="w-5 h-5 text-blue-500" />
                  Subjects Overview
                </CardTitle>
                <CardDescription className="dark:text-slate-400">
                  {loadingStatus ? "Loading..." : `${alreadyAdded.length} of ${allApSubjectsRef.length} subjects imported`}
                </CardDescription>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-slate-900 dark:text-white">
                  {Object.values(subjectStatus).reduce((sum, s) => sum + (s.questionCount || 0), 0).toLocaleString()}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Total Questions</div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loadingStatus ? (
              <div className="flex items-center justify-center py-5">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {allApSubjectsRef.map(s => {
                  const status = subjectStatus[s.code];
                  const hasQuestions = status?.hasQuestions;
                  const count = status?.questionCount || 0;
                  return (
                    <div
                      key={s.code}
                      className={`relative group rounded-lg border-2 p-3 transition-all ${
                        hasQuestions
                          ? "border-green-200 bg-green-50 hover:border-green-300 dark:border-green-700 dark:bg-green-900/30"
                          : "border-slate-200 bg-slate-50 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-1">
                        <span className={`text-xs font-bold ${hasQuestions ? "text-green-700 dark:text-green-400" : "text-slate-400 dark:text-slate-500"}`}>
                          {s.code}
                        </span>
                        {hasQuestions && (
                          <button
                            onClick={() => removeSubject(s.code)}
                            disabled={removingSubject === s.code}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-600 text-xs font-bold leading-none"
                            title={`Remove ${s.label}`}
                          >
                            {removingSubject === s.code ? <Loader2 className="w-3 h-3 animate-spin" /> : "x"}
                          </button>
                        )}
                      </div>
                      <div className={`text-xs font-medium leading-tight mb-1 ${hasQuestions ? "text-slate-800 dark:text-slate-200" : "text-slate-500 dark:text-slate-400"}`}>
                        {s.label.replace("AP ", "")}
                      </div>
                      {hasQuestions ? (
                        <div className="text-lg font-bold text-green-700 dark:text-green-400">{count.toLocaleString()}</div>
                      ) : (
                        <div className="text-xs text-slate-400 dark:text-slate-500 italic">Not imported</div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add Subject Card */}
        <Card className="border-2 border-dashed border-blue-500/30 dark:bg-slate-900/60 dark:border-blue-600/30 rounded-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 dark:text-white">
              <Zap className="w-5 h-5 text-blue-500" />
              Add Subject
            </CardTitle>
            <CardDescription className="dark:text-slate-400">
              Select an AP subject to automatically scrape questions from CrackAP, classify by unit, and import
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="flex-1">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">Subject to Add</label>
                <Select value={addSubjectCode} onValueChange={setAddSubjectCode} disabled={addingSubject}>
                  <SelectTrigger className="bg-white dark:bg-slate-800 dark:text-white dark:border-slate-700">
                    <SelectValue placeholder={loadingStatus ? "Loading subjects..." : availableToAdd.length > 0 ? "Select AP Subject" : "All subjects imported"} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableToAdd.map((s) => (
                      <SelectItem key={s.code} value={s.code}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {addingSubject ? (
                <Button onClick={stopAddSubject} variant="destructive" className="min-w-[140px]">
                  <Square className="w-4 h-4 mr-2" />
                  Stop Import
                </Button>
              ) : (
                <Button
                  onClick={startAddSubject}
                  disabled={!addSubjectCode || loadingStatus}
                  className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white min-w-[140px]"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Add Subject
                </Button>
              )}
            </div>

            {addSubjectProgress && (
              <div className="space-y-3 pt-2">
                <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400">
                  <span>{addSubjectProgress.message}</span>
                  {addSubjectProgress.total > 0 && (
                    <span>{Math.round((addSubjectProgress.current / Math.max(addSubjectProgress.total, 1)) * 100)}%</span>
                  )}
                </div>
                <Progress
                  value={(addSubjectProgress.current / Math.max(addSubjectProgress.total, 1)) * 100}
                  className="h-2"
                />
                <div className="flex gap-4 text-xs text-slate-500 dark:text-slate-400">
                  <span className="text-green-600 font-medium">Imported: {addSubjectProgress.imported}</span>
                  <span className="text-amber-500">Skipped: {addSubjectProgress.skipped}</span>
                  <span className="text-red-600">Errors: {addSubjectProgress.errors}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Image Migration Card */}
        <Card className="border-2 border-dashed border-amber-300 dark:border-amber-600 dark:bg-slate-900/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 dark:text-white">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              Migrate Firebase Storage Images
            </CardTitle>
            <CardDescription className="dark:text-slate-400">
              Make Firebase Storage images publicly accessible so they load without the proxy. Or migrate external images (e.g. CrackAP) into Firebase Storage so all subjects store images like APMICRO.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="flex-1">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">Subject (optional)</label>
                <Select
                  value={migrateSubjectCode}
                  onValueChange={setMigrateSubjectCode}
                  disabled={migratingImages || migratingExternalImages}
                >
                  <SelectTrigger className="bg-white dark:bg-slate-800 dark:text-white dark:border-slate-700">
                    <SelectValue placeholder="All subjects with Firebase images" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Subjects</SelectItem>
                    {allApSubjectsRef
                      .slice()
                      .sort((a, b) => a.label.localeCompare(b.label))
                      .map((s) => (
                        <SelectItem key={s.code} value={s.code}>
                          {s.label}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              {migratingImages ? (
                <Button onClick={stopImageMigration} variant="destructive" className="min-w-[160px]">
                  <Square className="w-4 h-4 mr-2" />
                  Stop
                </Button>
              ) : (
                <Button
                  onClick={startImageMigration}
                  className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white min-w-[160px] rounded-xl transition-all duration-150 ease-out"
                  disabled={migratingExternalImages}
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Make Images Public
                </Button>
              )}
              {migratingExternalImages ? (
                <Button onClick={stopExternalImageMigration} variant="destructive" className="min-w-[200px]">
                  <Square className="w-4 h-4 mr-2" />
                  Stop
                </Button>
              ) : (
                <Button
                  onClick={startExternalImageMigration}
                  variant="secondary"
                  className="min-w-[200px] border border-blue-400 text-blue-700 dark:text-blue-300 dark:border-blue-500 rounded-xl"
                  disabled={migratingImages}
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Migrate External to Firebase
                </Button>
              )}
            </div>

            {migrateProgress && (
              <div className="space-y-3 pt-2">
                <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400">
                  <span>{migrateProgress.message}</span>
                  {migrateProgress.total > 0 && (
                    <span>{Math.round((migrateProgress.current / Math.max(migrateProgress.total, 1)) * 100)}%</span>
                  )}
                </div>
                <Progress
                  value={migrateProgress.total > 0 ? (migrateProgress.current / Math.max(migrateProgress.total, 1)) * 100 : 0}
                  className="h-2"
                />
                <div className="flex gap-4 text-xs text-slate-500 dark:text-slate-400">
                  <span className="text-green-600 font-medium">Made Public: {migrateProgress.made_public}</span>
                  <span className="text-slate-500">Skipped (already public): {migrateProgress.skipped}</span>
                  <span className="text-red-600">Failed: {migrateProgress.failed}</span>
                </div>
              </div>
            )}

            {migrateExternalProgress && (
              <div className="space-y-3 pt-2 border-t border-amber-200 dark:border-amber-800">
                <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400">
                  <span>{migrateExternalProgress.message}</span>
                  {migrateExternalProgress.total > 0 && (
                    <span>
                      {Math.round(
                        (migrateExternalProgress.current / Math.max(migrateExternalProgress.total, 1)) * 100
                      )}
                      %
                    </span>
                  )}
                </div>
                <Progress
                  value={
                    migrateExternalProgress.total > 0
                      ? (migrateExternalProgress.current / Math.max(migrateExternalProgress.total, 1)) * 100
                      : 0
                  }
                  className="h-2"
                />
                <div className="flex gap-4 text-xs text-slate-500 dark:text-slate-400">
                  <span className="text-green-600 font-medium">
                    Migrated: {migrateExternalProgress.images_migrated}
                  </span>
                  <span>Questions: {migrateExternalProgress.questions_processed}</span>
                  <span className="text-red-600">Failed: {migrateExternalProgress.failed}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Filter Card */}
        <Card className="dark:bg-slate-900/60 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 dark:text-white">
              <Search className="w-5 w-5" />
              Filter Questions
            </CardTitle>
            <CardDescription className="dark:text-slate-400">Search by subject and section code</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <Select value={subject} onValueChange={setSubject}>
                <SelectTrigger className="flex-1 bg-white dark:bg-slate-800 dark:text-white dark:border-slate-700">
                  <SelectValue placeholder="Select Subject" />
                </SelectTrigger>
                <SelectContent>
                  {availableSubjects
                    .slice()
                    .sort((a, b) => getSubjectDisplayName(a).localeCompare(getSubjectDisplayName(b)))
                    .map((subj) => (
                      <SelectItem key={subj} value={subj}>
                        {subj}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>

              <Select 
                value={section} 
                onValueChange={setSection}
                disabled={!subject}
              >
                <SelectTrigger className="flex-1 bg-white dark:bg-slate-800 dark:text-white dark:border-slate-700">
                  <SelectValue placeholder={subject ? "All Sections" : "Select subject first"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sections</SelectItem>
                  {availableSections.map((sect) => (
                    <SelectItem key={sect} value={sect}>
                      {sect}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                onClick={fetchFiltered}
                disabled={!subject}
                className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Search className="w-4 h-4 mr-2" />
                Search
              </Button>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="missing-explanation-only"
                  checked={showOnlyMissingExplanation}
                  onCheckedChange={(v) => setShowOnlyMissingExplanation(!!v)}
                />
                <Label htmlFor="missing-explanation-only" className="text-sm font-medium cursor-pointer dark:text-slate-300">
                  UnExplained Questions
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="error-reports-only"
                  checked={showOnlyErrorReports}
                  onCheckedChange={(v) => setShowOnlyErrorReports(!!v)}
                />
                <Label htmlFor="error-reports-only" className="text-sm font-medium cursor-pointer dark:text-slate-300">
                  Errorneous Questions
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="unverified-only"
                  checked={showOnlyUnverified}
                  onCheckedChange={(v) => setShowOnlyUnverified(!!v)}
                />
                <Label htmlFor="unverified-only" className="text-sm font-medium cursor-pointer dark:text-slate-300">
                  Unverified Questions
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="verification-failed-only"
                  checked={showOnlyVerificationFailed}
                  onCheckedChange={(v) => setShowOnlyVerificationFailed(!!v)}
                />
                <Label htmlFor="verification-failed-only" className="text-sm font-medium cursor-pointer dark:text-slate-300">
                  Verification Failed Questions
                </Label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Questions Table Card */}
        <Card className="dark:bg-slate-900/60 dark:border-slate-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="dark:text-white">
                  Questions ({displayedItems.length})
                </CardTitle>
                <CardDescription>
                  {showOnlyMissingExplanation && items.length > 0 && "Filter: UnExplained Questions. "}
                  {showOnlyErrorReports && items.length > 0 && "Filter: Errorneous Questions. "}
                  {showOnlyUnverified && items.length > 0 && "Filter: Unverified Questions. "}
                  {showOnlyVerificationFailed && items.length > 0 && "Filter: Verification Failed Questions. "}
                  {selectedQuestions.size > 0 && `${selectedQuestions.size} selected`}
                </CardDescription>
              </div>
              <div className="flex gap-2 items-center">
                <Select value={selectedAction} onValueChange={setSelectedAction}>
                  <SelectTrigger className="w-[250px] bg-white dark:bg-slate-800 dark:text-white dark:border-slate-700">
                    <SelectValue placeholder="Select Action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fix-prompts">Fix Prompts & Choices</SelectItem>
                    <SelectItem value="explanations">Generate Explanations</SelectItem>
                    <SelectItem value="re-generate-explanations">Re-Generate Explanations</SelectItem>
                    <SelectItem value="study-notes">Generate Study Notes</SelectItem>
                    <SelectItem value="re-generate-study-notes">Re-Generate Study Notes</SelectItem>
                    <SelectItem value="grade-difficulty">Auto-Tag Question Difficulty</SelectItem>
                    <SelectItem value="verify-questions">Verify Questions</SelectItem>
                  </SelectContent>
                </Select>
                {generatingExplanations ? (
                  <Button
                    onClick={stopAIAction}
                    variant="destructive"
                  >
                    <Square className="w-4 h-4 mr-2" />
                    Abort
                  </Button>
                ) : (
                  <Button
                    onClick={executeAIAction}
                    disabled={selectedQuestions.size === 0}
                    className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white"
                  >
                    {`Execute (${selectedQuestions.size})`}
                  </Button>
                )}
              </div>
              {explanationProgress && (
                <div className="mt-3 space-y-2">
                  <div className="flex justify-between text-sm text-slate-600">
                    <span>{explanationProgress.message}</span>
                    {explanationProgress.total > 0 && (
                      <span>{Math.round((explanationProgress.current / Math.max(explanationProgress.total, 1)) * 100)}%</span>
                    )}
                  </div>
                  <Progress
                    value={(explanationProgress.current / Math.max(explanationProgress.total, 1)) * 100}
                    className="h-2"
                  />
                  <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                    <span className="text-green-600 font-medium">Done: {explanationProgress.updated}</span>
                    <span className="text-amber-500">Skipped: {explanationProgress.skipped}</span>
                    <span className="text-red-600">Failed: {explanationProgress.failed}</span>
                    {typeof explanationProgress.passed === "number" && (
                      <>
                        <span className="text-green-700 dark:text-green-400 font-medium">Pass: {explanationProgress.passed}</span>
                        <span className="text-amber-700 dark:text-amber-400 font-medium">Review: {explanationProgress.flagged}</span>
                        <span className="text-red-700 dark:text-red-400 font-medium">Fail: {explanationProgress.verifyFailed}</span>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm table-fixed">
                <colgroup>
                  <col className="w-10" />
                  <col className="w-16" />
                  <col className="w-14" />
                  <col style={{ minWidth: 150, maxWidth: 200 }} />
                  <col style={{ minWidth: 150, maxWidth: 200 }} />
                  <col className="w-14" />
                  <col style={{ minWidth: 150, maxWidth: 220 }} />
                  <col style={{ minWidth: 150, maxWidth: 220 }} />
                  <col className="w-20" />
                  <col className="w-16" />
                  <col style={{ minWidth: 120, maxWidth: 180 }} />
                  <col style={{ width: '13%' }} />
                </colgroup>
                <thead className="bg-slate-50 dark:bg-slate-800 border-b dark:border-slate-700">
                  <tr>
                    <th className="p-2 text-center">
                      <Checkbox
                        checked={displayedItems.length > 0 && displayedItems.every(q => selectedQuestions.has(q.id))}
                        onCheckedChange={toggleSelectAll}
                      />
                    </th>
                    <th className="p-2 text-left font-semibold text-slate-900 dark:text-slate-300 text-xs">Subject</th>
                    <th className="p-2 text-left font-semibold text-slate-900 dark:text-slate-300 text-xs">Section</th>
                    <th className="p-2 text-left font-semibold text-slate-900 dark:text-slate-300 text-xs">Prompt</th>
                    <th className="p-2 text-left font-semibold text-slate-900 dark:text-slate-300 text-xs">Choices</th>
                    <th className="p-2 text-center font-semibold text-slate-900 dark:text-slate-300 text-xs">Ans</th>
                    <th className="p-2 text-left font-semibold text-slate-900 dark:text-slate-300 text-xs">Explanation</th>
                    <th className="p-2 text-left font-semibold text-slate-900 dark:text-slate-300 text-xs">Study Notes</th>
                    <th className="p-2 text-left font-semibold text-slate-900 dark:text-slate-300 text-xs">Difficulty</th>
                    <th className="p-2 text-center font-semibold text-slate-900 dark:text-slate-300 text-xs">Verify</th>
                    <th className="p-2 text-left font-semibold text-slate-900 dark:text-slate-300 text-xs">Error reason</th>
                    <th className="p-2 text-center font-semibold text-slate-900 dark:text-slate-300 text-xs">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedItems.map((q) => (
                    <Row
                      key={q.id}
                      q={q}
                      selected={selectedQuestions.has(q.id)}
                      onToggleSelect={() => toggleQuestion(q.id)}
                      onSave={updateQuestion}
                      onDelete={deleteQuestion}
                    />
                  ))}
                </tbody>
              </table>
              {displayedItems.length === 0 && (
                <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                  {items.length > 0 &&
                  (showOnlyMissingExplanation || showOnlyErrorReports || showOnlyUnverified || showOnlyVerificationFailed)
                    ? "No questions match the current filters."
                    : "No questions found. Upload a CSV or adjust filters."}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
        )}
        {tab === "users" && <AdminUsersTab token={token} />}
      </AdminDashboardLayout>
    </div>
  );
}

const FIREBASE_STORAGE_PREFIXES = [
  "https://storage.googleapis.com/gen-lang-client-0260042933.firebasestorage.app/",
  "https://firebasestorage.googleapis.com/v0/b/gen-lang-client-0260042933.firebasestorage.app/o/",
  "https://firebasestorage.googleapis.com/v0/b/gen-lang-client-0260042933.appspot.com/o/",
];

function getImageUrl(url: string): string {
  if (!url) return url;
  for (const prefix of FIREBASE_STORAGE_PREFIXES) {
    if (url.startsWith(prefix)) {
      let storagePath = url.slice(prefix.length);
      storagePath = storagePath.split("?")[0];
      storagePath = decodeURIComponent(storagePath);
      return `/api/image-proxy?path=${encodeURIComponent(storagePath)}`;
    }
  }
  return url;
}

function Row({
  q,
  selected,
  onToggleSelect,
  onSave,
  onDelete,
}: {
  q: Question;
  selected: boolean;
  onToggleSelect: () => void;
  onSave: (id: string, patch: Partial<Question>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState(() => {
    const choices = extractChoicesData(q);
    return {
      subject_code: q.subject_code || "",
      section_code: q.section_code || "",
      prompt: extractPromptText(q),
      choiceA: choices.A,
      choiceB: choices.B,
      choiceC: choices.C,
      choiceD: choices.D,
      choiceE: choices.E,
      answerIndex: q.answerIndex || 0,
      explanation: q.explanation || "",
      study_note: (q.test_slug ?? getStudyNoteFromQuestion(q) ?? "").trim() || "",
    };
  });

  useEffect(() => {
    if (edit) {
      const choices = extractChoicesData(q);
      setForm({
        subject_code: q.subject_code || "",
        section_code: q.section_code || "",
        prompt: extractPromptText(q),
        choiceA: choices.A,
        choiceB: choices.B,
        choiceC: choices.C,
        choiceD: choices.D,
        choiceE: choices.E,
        answerIndex: q.answerIndex || 0,
        explanation: q.explanation || "",
        study_note: (q.test_slug ?? getStudyNoteFromQuestion(q) ?? "").trim() || "",
      });
    }
  }, [edit, q]);

  async function save() {
    // Validate that all choices are filled
    const choices = [
      form.choiceA.trim(),
      form.choiceB.trim(),
      form.choiceC.trim(),
      form.choiceD.trim(),
      form.choiceE.trim()
    ];

    if (choices.some(choice => !choice)) {
      toast.error("All 5 choices (A-E) must be filled");
      return;
    }

    const existingTags: string[] = q.tags || [];
    const otherTags = existingTags.filter((t) => typeof t !== "string" || !t.startsWith("study_note:"));
    const patch: Partial<Question> = {
      subject_code: form.subject_code,
      section_code: form.section_code,
      prompt: form.prompt,
      choices: choices,
      answerIndex: Number(form.answerIndex),
      explanation: form.explanation,
      test_slug: form.study_note.trim(),
      tags: otherTags,
    };
    await onSave(q.id, patch);
    setEdit(false);
  }

  const renderQuestionPrompt = () => {
    if (q.prompt_blocks && q.prompt_blocks.length > 0) {
      return (
        <div className="text-xs space-y-1 break-words">
          {q.prompt_blocks.map((block, idx) => {
            if (block.type === "text") {
              return <div key={idx}>{truncateText(block.value, 10)}</div>;
            } else if (block.type === "image") {
              const imgSrc = getImageUrl(block.url);
              return (
                <div key={idx} className="group relative inline-block">
                  <img
                    src={imgSrc}
                    alt={`Question image ${idx + 1}`}
                    className="h-8 w-auto rounded border border-slate-300 cursor-pointer"
                  />
                  <img
                    src={imgSrc}
                    alt={`Question image ${idx + 1} enlarged`}
                    className="hidden group-hover:block absolute z-50 left-0 top-0 max-w-md w-auto max-h-96 rounded border-2 border-blue-500 shadow-lg"
                  />
                </div>
              );
            }
            return null;
          })}
        </div>
      );
    }

    // Legacy fallback
    const hasImage = q.image_urls?.question && Array.isArray(q.image_urls.question) && q.image_urls.question.length > 0;
    const hasText = q.prompt && q.prompt.trim() !== "";

    if (!hasImage && !hasText) {
      return <span className="text-slate-400">N/A</span>;
    }

    return (
      <div className="text-xs break-words">
        {hasImage && (
          <div className="mb-1 space-y-1">
            {q.image_urls.question.map((url, idx) => {
              const imgSrc = getImageUrl(url);
              return (
                <div key={idx} className="group relative inline-block">
                  <img
                    src={imgSrc}
                    alt={`Question image ${idx + 1}`}
                    className="h-8 w-auto rounded border border-slate-300 cursor-pointer"
                  />
                  <img
                    src={imgSrc}
                    alt={`Question image ${idx + 1} enlarged`}
                    className="hidden group-hover:block absolute z-50 left-0 top-0 max-w-md w-auto max-h-96 rounded border-2 border-blue-500 shadow-lg"
                  />
                </div>
              );
            })}
          </div>
        )}
        {hasText && <div>{truncateText(q.prompt, 10)}</div>}
      </div>
    );
  };

  const renderChoice = (choiceKey: 'A' | 'B' | 'C' | 'D' | 'E') => {
    if (q.choices && q.choices[choiceKey]) {
      const blocks = q.choices[choiceKey];
      return (
        <div className="text-xs">
          {blocks.map((block, idx) => {
            if (block.type === "text") {
              return <span key={idx}>{truncateText(block.value, 8)}</span>;
            } else if (block.type === "image") {
              const imgSrc = getImageUrl(block.url);
              return (
                <div key={idx} className="group relative inline-block mr-1">
                  <img
                    src={imgSrc}
                    alt={`Choice ${choiceKey} image ${idx + 1}`}
                    className="h-6 w-auto rounded border border-slate-300 cursor-pointer"
                  />
                  <img
                    src={imgSrc}
                    alt={`Choice ${choiceKey} image ${idx + 1} enlarged`}
                    className="hidden group-hover:block absolute z-50 left-0 top-0 max-w-md w-auto max-h-96 rounded border-2 border-blue-500 shadow-lg"
                  />
                </div>
              );
            }
            return null;
          })}
        </div>
      );
    }

    // Legacy fallback
    const index = ['A', 'B', 'C', 'D', 'E'].indexOf(choiceKey);
    const choice = Array.isArray(q.choices) ? q.choices[index] : "";
    const choiceImages = q.image_urls?.[choiceKey];
    const hasImage = choiceImages && Array.isArray(choiceImages) && choiceImages.length > 0;
    const hasText = choice && choice.trim() !== "";

    if (!hasImage && !hasText) {
      return <span className="text-slate-400">N/A</span>;
    }

    return (
      <div>
        {hasImage && (
          <div className="mb-1 space-x-1">
            {choiceImages.map((url, idx) => {
              const imgSrc = getImageUrl(url);
              return (
                <div key={idx} className="group relative inline-block">
                  <img
                    src={imgSrc}
                    alt={`Choice ${choiceKey} image ${idx + 1}`}
                    className="h-6 w-auto rounded border border-slate-300 cursor-pointer"
                  />
                  <img
                    src={imgSrc}
                    alt={`Choice ${choiceKey} image ${idx + 1} enlarged`}
                    className="hidden group-hover:block absolute z-50 left-0 top-0 max-w-md w-auto max-h-96 rounded border-2 border-blue-500 shadow-lg"
                  />
                </div>
              );
            })}
          </div>
        )}
        {hasText && <span>{truncateText(choice, 8)}</span>}
      </div>
    );
  };

  if (!edit) {
    return (
      <tr className="border-b hover:bg-slate-50 dark:hover:bg-slate-700 dark:border-slate-700">
        <td className="p-2 text-center align-top">
          <Checkbox
            checked={selected}
            onCheckedChange={onToggleSelect}
          />
        </td>
        <td className="p-2 align-top text-xs break-words dark:text-slate-300">{q.subject_code ? getSubjectDisplayName(q.subject_code) : "-"}</td>
        <td className="p-2 align-top text-xs break-words dark:text-slate-300">{q.section_code || "-"}</td>
        <td className="p-2 align-top min-w-[150px] max-w-[200px]">
          <div className="flex items-start gap-1">
            <div className="flex-1 min-w-0" title={q.prompt_blocks ? q.prompt_blocks.filter((b): b is Block => b.type === "text").map(b => (b as { value: string }).value).join(" ") : (q.prompt || "")}>
              {renderQuestionPrompt()}
            </div>
            <button type="button" onClick={() => setEdit(true)} className="shrink-0 p-0.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200" title="Edit"><Pencil className="h-3.5 w-3.5" /></button>
          </div>
        </td>
        <td className="p-2 align-top min-w-[150px] max-w-[200px]">
          <div className="flex items-start gap-1">
            <div className="text-xs space-y-1 flex-1 min-w-0">
              {(['A', 'B', 'C', 'D', 'E'] as const).map((letter) => (
                <div key={letter} className="break-words">
                  <span className="font-medium">{letter}.</span> {renderChoice(letter)}
                </div>
              ))}
            </div>
            <button type="button" onClick={() => setEdit(true)} className="shrink-0 p-0.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200" title="Edit"><Pencil className="h-3.5 w-3.5" /></button>
          </div>
        </td>
        <td className="p-2 text-center align-top font-semibold text-xs">
          <div className="flex items-center justify-center gap-1">
            <span>({String.fromCharCode(65 + q.answerIndex)})</span>
            <button type="button" onClick={() => setEdit(true)} className="p-0.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200" title="Edit"><Pencil className="h-3.5 w-3.5" /></button>
          </div>
        </td>
        <td className="p-2 align-top text-xs break-words min-w-[150px] max-w-[220px]">
          <div className="flex items-start gap-1">
            <div className="flex-1 min-w-0" title={q.explanation || ""}>
              <span dangerouslySetInnerHTML={{ __html: renderSimpleMarkdownHtml(truncateText(q.explanation || "-", 12)) }} />
            </div>
            <button type="button" onClick={() => setEdit(true)} className="shrink-0 p-0.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200" title="Edit"><Pencil className="h-3.5 w-3.5" /></button>
          </div>
        </td>
        <td className="p-2 align-top text-xs break-words min-w-[150px] max-w-[220px]">
          <div className="flex items-start gap-1">
            <div className="flex-1 min-w-0 text-slate-700 dark:text-slate-300 leading-relaxed" title={getStudyNoteFromQuestion(q) || ""}>
              {truncateText(getStudyNoteFromQuestion(q) || "-", 12)}
            </div>
            <button type="button" onClick={() => setEdit(true)} className="shrink-0 p-0.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200" title="Edit"><Pencil className="h-3.5 w-3.5" /></button>
          </div>
        </td>
        <td className="p-2 align-top text-xs break-words dark:text-slate-300">
          {getDifficultyFromQuestion(q) || "-"}
        </td>
        <td className="p-2 text-center align-top text-xs">{renderVerificationStatus(q)}</td>
        <td className="p-2 align-top text-xs break-words min-w-[120px] max-w-[180px]">
          <div className="flex items-start gap-1">
            <div className="flex-1 min-w-0">
              {(q.tags || []).includes("error_reported") ? (
                <div className="text-red-600 dark:text-red-400 font-medium" title={getErrorReasonFromQuestion(q) || "Reported"}>
                  {truncateText(getErrorReasonFromQuestion(q) || "Reported", 10)}
                </div>
              ) : (
                <span className="text-slate-400">-</span>
              )}
            </div>
            <button type="button" onClick={() => setEdit(true)} className="shrink-0 p-0.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200" title="Edit"><Pencil className="h-3.5 w-3.5" /></button>
          </div>
        </td>
        <td className="p-2 text-center align-top">
          <div className="flex gap-1 justify-center flex-col">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setEdit(true)}
              className="text-xs px-2 h-7"
            >
              Edit
            </Button>
            {(q.tags || []).includes("error_reported") && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const newTags = (q.tags || []).filter(
                    (t) => t !== "error_reported" && !t.startsWith("error_reason:") && !t.startsWith("error_details:")
                  );
                  onSave(q.id, { tags: newTags });
                }}
                className="text-xs px-2 h-7 border-blue-500 text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl"
              >
                Mark fixed
              </Button>
            )}
            <Button
              size="sm"
              variant="destructive"
              onClick={() => onDelete(q.id)}
              className="text-xs px-2 h-7"
            >
              Delete
            </Button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b bg-blue-50 dark:bg-blue-900/30">
      <td className="p-2 text-center">
        <Checkbox
          checked={selected}
          onCheckedChange={onToggleSelect}
        />
      </td>
      <td className="p-2">
        <Input
          value={form.subject_code}
          onChange={(e) =>
            setForm((s) => ({ ...s, subject_code: e.target.value }))
          }
        />
      </td>
      <td className="p-2">
        <Input
          value={form.section_code}
          onChange={(e) =>
            setForm((s) => ({ ...s, section_code: e.target.value }))
          }
        />
      </td>
      <td className="p-2">
        <textarea
          className="w-full border rounded p-2 min-h-[80px] dark:bg-slate-800 dark:text-white dark:border-slate-700"
          value={form.prompt}
          onChange={(e) => setForm((s) => ({ ...s, prompt: e.target.value }))}
        />
      </td>
      <td className="p-2">
        <div className="space-y-2">
          {(['A', 'B', 'C', 'D', 'E'] as const).map((letter) => (
            <div key={letter} className="flex items-center gap-2">
              <span className="font-medium text-xs w-4 shrink-0">{letter}:</span>
              <Input
                value={form[`choice${letter}` as keyof typeof form] as string}
                onChange={(e) => setForm(s => ({ ...s, [`choice${letter}`]: e.target.value }))}
                className="flex-1 text-xs h-8"
              />
            </div>
          ))}
        </div>
      </td>
      <td className="p-2 text-center">
        <Input
          type="number"
          value={form.answerIndex}
          onChange={(e) =>
            setForm((s) => ({ ...s, answerIndex: Number(e.target.value) }))
          }
          className="w-16 mx-auto text-center"
        />
      </td>
      <td className="p-2">
        <textarea
          className="w-full border rounded p-2 min-h-[80px] dark:bg-slate-800 dark:text-white dark:border-slate-700"
          value={form.explanation}
          onChange={(e) =>
            setForm((s) => ({ ...s, explanation: e.target.value }))
          }
        />
      </td>
      <td className="p-2 align-top text-xs min-w-[150px] max-w-[220px]">
        <textarea
          className="w-full border rounded p-2 min-h-[80px] max-h-[240px] dark:bg-slate-800 dark:text-white dark:border-slate-700"
          value={form.study_note}
          onChange={(e) => setForm((s) => ({ ...s, study_note: e.target.value }))}
          placeholder="Study note..."
        />
      </td>
      <td className="p-2 align-top text-xs text-slate-500 dark:text-slate-400">
        {getDifficultyFromQuestion(q) || "-"}
      </td>
      <td className="p-2 text-center align-top text-xs">{renderVerificationStatus(q)}</td>
      <td className="p-2 align-top text-xs text-slate-500 dark:text-slate-400">
        {getErrorReasonFromQuestion(q) || "-"}
      </td>
      <td className="p-2 text-center">
        <div className="flex gap-2 justify-center flex-col">
          <Button size="sm" onClick={save} className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white">
            Save
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setEdit(false)}
          >
            Cancel
          </Button>
        </div>
      </td>
    </tr>
  );
}