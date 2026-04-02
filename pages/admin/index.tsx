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
import { BookOpen, Search, LogOut, AlertCircle, Loader2, Zap, Play, Square, Pencil, Trash2, Eye, X } from "lucide-react";
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
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AdminDashboardLayout } from "../../client/src/components/admin/AdminDashboardLayout";
import { AdminInsightsTab } from "../../client/src/components/admin/AdminInsightsTab";
import { AdminUsersTab } from "../../client/src/components/admin/AdminUsersTab";
import { getSubjectDisplayName, SUBJECT_DISPLAY_NAMES } from "../../lib/subject-display-names";
import { ExplanationMarkdown } from "../../client/src/components/ui/ExplanationMarkdown";
import { AdminQuestionQuizPreviewDialog } from "@/components/admin/AdminQuestionQuizPreviewDialog";
import { SUBJECT_SECTION_CODES } from "../../lib/subject-sections-client";
import { hasMixedTextAndImageChoices } from "../../lib/mixed-choice-helpers";

const googleProvider = new GoogleAuthProvider();

const AP_SUBJECT_CODES: string[] = [
  "APMACRO", "APMICRO", "APCSP", "APCHEM", "APGOV", "APPSYCH", "APBIO",
  "APCALCAB", "APCALCBC", "APCSA", "APUSH", "APWORLD", "APEURO",
  "APLANG", "APLIT", "APSTATS", "APPHYS1", "APPHYS2",
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
  /** Content origin, e.g. VT importer sets `"VT"`. */
  source?: string | null;
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

type AdminVerifyStatus = "pass" | "fail";

/** Merge with existing question verification and apply admin-selected status for PUT. */
function buildLastVerificationForStatus(
  q: Question,
  status: AdminVerifyStatus,
): NonNullable<Question["lastVerification"]> {
  const base = q.lastVerification || {};
  return {
    verifiedAt: new Date().toISOString(),
    source: "admin",
    model: base.model ?? null,
    status,
    lintErrors: Array.isArray(base.lintErrors) ? base.lintErrors : [],
    lintWarnings: Array.isArray(base.lintWarnings) ? base.lintWarnings : [],
    imageErrors: Array.isArray(base.imageErrors) ? base.imageErrors : [],
    issues: Array.isArray(base.issues) ? base.issues : [],
    checks: base.checks !== undefined ? base.checks : null,
    confidence: base.confidence !== undefined ? base.confidence : null,
  };
}

function verificationStatusSelectValue(q: Question): AdminVerifyStatus | undefined {
  const raw = q.lastVerification?.status;
  if (raw === "pass" || raw === "fail") return raw;
  if (raw === "error" || raw === "needs_review") return "fail";
  return undefined;
}

function VerificationStatusSelect({
  q,
  onSave,
}: {
  q: Question;
  onSave: (id: string, patch: Partial<Question>) => Promise<void>;
}) {
  const v = q.lastVerification;
  const selectValue = verificationStatusSelectValue(q);
  const title =
    v?.issues && v.issues.length > 0 ? v.issues.join("\n") : v?.status ? String(v.status) : "";

  return (
    <div className="flex justify-center" title={title || undefined}>
      <Select
        value={selectValue}
        onValueChange={(val) => {
          if (val !== "pass" && val !== "fail") return;
          void onSave(q.id, {
            lastVerification: buildLastVerificationForStatus(q, val),
          });
        }}
      >
        <SelectTrigger className="h-7 w-[5.75rem] text-xs px-2 py-0 dark:border-slate-600 dark:bg-slate-800">
          <SelectValue placeholder="—" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="pass" className="text-xs">
            OK
          </SelectItem>
          <SelectItem value="fail" className="text-xs">
            Fail
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
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
  /** Admin access: derived from `/api/admin/session`. */
  const [adminStatus, setAdminStatus] = useState<"pending" | "allowed" | "forbidden">("pending");
  /** True when email is on ADMIN_EMAILS (env admin). */
  const [isEnvAdmin, setIsEnvAdmin] = useState(false);

  // Data
  const [items, setItems] = useState<Question[]>([]);

  // Filters
  const [subject, setSubject] = useState("");
  const [section, setSection] = useState("");
  const [showOnlyMissingExplanation, setShowOnlyMissingExplanation] = useState(false);
  const [showOnlyErrorReports, setShowOnlyErrorReports] = useState(false);
  const [showOnlyUnverified, setShowOnlyUnverified] = useState(false);
  const [showOnlyVerificationFailed, setShowOnlyVerificationFailed] = useState(false);
  const [showOnlyVerificationIncomplete, setShowOnlyVerificationIncomplete] = useState(false);
  /** Answer choices mix plain text and image (formula) choices — for Fix image choices workflow. */
  const [showOnlyMixedPrompts, setShowOnlyMixedPrompts] = useState(false);
  /**
   * When Mixed Prompts is on, we filter by this ID list — refreshed only on Search or when toggling Mixed Prompts,
   * so rows stay visible after Fix Image Choices until you search/toggle again.
   */
  const [mixedPromptsPinnedIds, setMixedPromptsPinnedIds] = useState<string[] | null>(null);
  // Bulk delete dialog/button removed from UI; keep flags for potential future reuse.
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

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
        return s === "fail" || s === "error" || s === "needs_review";
      });
    }
    if (showOnlyVerificationIncomplete) {
      list = list.filter((q) => {
        const v = q.lastVerification;
        if (!v || v.status !== "fail") return false;
        const issues = Array.isArray(v.issues) ? v.issues.join(" ").toLowerCase() : "";
        return issues.includes("stem has no text and no images") ||
          issues.includes("stem appears incomplete") ||
          issues.includes("incomplete question");
      });
    }
    if (showOnlyMixedPrompts && mixedPromptsPinnedIds !== null) {
      const pin = new Set(mixedPromptsPinnedIds);
      list = list.filter((q) => pin.has(q.id));
    }
    return list;
  }, [
    items,
    showOnlyMissingExplanation,
    showOnlyErrorReports,
    showOnlyUnverified,
    showOnlyVerificationFailed,
    showOnlyVerificationIncomplete,
    showOnlyMixedPrompts,
    mixedPromptsPinnedIds,
  ]);

  // AI explanation generation state
  const [generatingExplanations, setGeneratingExplanations] = useState(false);
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(
    new Set(),
  );
  const [selectedAction, setSelectedAction] = useState<string>("verify-questions");
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
  } | null>(null);

  const [lastExplanationSummary, setLastExplanationSummary] = useState<{
    current: number;
    total: number;
    updated: number;
    skipped: number;
    failed: number;
    message: string;
    passed?: number;
  } | null>(null);

  const [subjectStatus, setSubjectStatus] = useState<
    Record<
      string,
      {
        hasQuestions: boolean;
        questionCount: number;
        crackApCount?: number;
        varsityCount?: number;
      }
    >
  >({});
  const [loadingStatus, setLoadingStatus] = useState(false);

  // VT question import (admin Content Library)
  const [varsitySubjectCode, setVarsitySubjectCode] = useState("");
  const [addingVarsitySubject, setAddingVarsitySubject] = useState(false);
  const [varsitySubjectProgress, setVarsitySubjectProgress] = useState<{
    current: number;
    total: number;
    imported: number;
    skipped: number;
    errors: number;
    duplicatesSkipped: number;
    linksCrawled: number;
    rawQuestionsFound: number;
    message: string;
    phase: string;
  } | null>(null);
  const varsitySubjectAbortRef = useRef<AbortController | null>(null);

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

  const availableToAddVarsity = allApSubjectsRef.filter(
    (s) => (subjectStatus[s.code]?.varsityCount ?? 0) === 0,
  );
  const alreadyAdded = allApSubjectsRef.filter((s) => subjectStatus[s.code]?.hasQuestions);

  async function loadSubjectStatus() {
    if (!token) return;
    setLoadingStatus(true);
    try {
      const res = await fetch("/api/admin/subject-status", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSubjectStatus(data.data || {});
      }
    } catch (err) {
      console.error("Failed to fetch subject status:", err);
    } finally {
      setLoadingStatus(false);
    }
  }

  async function loadAdminSession() {
    if (!token) return;
    setAdminStatus("pending");
    try {
      const res = await fetch("/api/admin/session", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 403) {
        setAdminStatus("forbidden");
        setIsEnvAdmin(false);
        return;
      }
      if (!res.ok) {
        setAdminStatus("forbidden");
        setIsEnvAdmin(false);
        return;
      }
      const json = await res.json();
      setAdminStatus("allowed");
      const env = json.data?.isEnvAdmin === true;
      setIsEnvAdmin(env);
      if (env) {
        await loadSubjectStatus();
      } else {
        setSubjectStatus({});
        setLoadingStatus(false);
      }
    } catch (err) {
      console.error("Failed to verify admin session:", err);
      setAdminStatus("forbidden");
      setIsEnvAdmin(false);
    }
  }

  async function startVarsityAddSubject() {
    if (!token || !varsitySubjectCode) return;
    if ((subjectStatus[varsitySubjectCode]?.varsityCount ?? 0) > 0) {
      toast.error("This subject already has VT questions. Remove VT questions first to import again.");
      return;
    }
    setAddingVarsitySubject(true);
    const subjectLabel = allApSubjectsRef.find(s => s.code === varsitySubjectCode)?.label || varsitySubjectCode;
    setVarsitySubjectProgress({
      current: 0,
      total: 0,
      imported: 0,
      skipped: 0,
      errors: 0,
      duplicatesSkipped: 0,
      linksCrawled: 0,
      rawQuestionsFound: 0,
      message: `Starting import for ${subjectLabel}...`,
      phase: "scraping",
    });

    const controller = new AbortController();
    varsitySubjectAbortRef.current = controller;

    try {
      const res = await fetch("/api/admin/varsity-add-subject", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ subjectCode: varsitySubjectCode }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Failed to import questions for this subject");
        setAddingVarsitySubject(false);
        return;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        toast.error("No response stream");
        setAddingVarsitySubject(false);
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
              setVarsitySubjectProgress({
                current: event.current || 0,
                total: event.total || 0,
                imported: event.imported || 0,
                skipped: event.skipped || 0,
                errors: event.errors || 0,
                duplicatesSkipped: event.duplicatesSkipped ?? 0,
                linksCrawled: event.linksCrawled ?? 0,
                rawQuestionsFound: event.rawQuestionsFound ?? 0,
                message: event.message || "",
                phase: event.phase || "scraping",
              });
            }
            if (event.type === "complete") {
              toast.success(event.message);
              loadSubjectStatus();
              setVarsitySubjectCode("");
              return;
            }
            if (event.type === "error") {
              const msg = event.message || "Import failed";
              setVarsitySubjectProgress((prev) => ({
                current: prev?.current || 0,
                total: prev?.total || 0,
                imported: prev?.imported || 0,
                skipped: prev?.skipped || 0,
                errors: (prev?.errors || 0) + 1,
                duplicatesSkipped: prev?.duplicatesSkipped ?? 0,
                linksCrawled: prev?.linksCrawled ?? 0,
                rawQuestionsFound: prev?.rawQuestionsFound ?? 0,
                message: msg,
                phase: prev?.phase || "scraping",
              }));
              toast.error(msg);
              return;
            }
          } catch {}
        }
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        toast.error("Import failed: " + err.message);
      }
    } finally {
      setAddingVarsitySubject(false);
      varsitySubjectAbortRef.current = null;
    }
  }

  function stopVarsityAddSubject() {
    varsitySubjectAbortRef.current?.abort();
    setAddingVarsitySubject(false);
    toast("VT import cancelled");
  }

  const [removingSubject, setRemovingSubject] = useState<string | null>(null);
  const [subjectRemoveOpen, setSubjectRemoveOpen] = useState(false);
  const [subjectRemoveCode, setSubjectRemoveCode] = useState<string | null>(null);
  const [subjectRemoveScope, setSubjectRemoveScope] = useState<"all" | "vt" | "non_vt" | null>(null);

  function openSubjectRemoveDialog(code: string) {
    setSubjectRemoveCode(code);
    setSubjectRemoveScope(null);
    setSubjectRemoveOpen(true);
  }

  async function confirmSubjectRemove() {
    if (!token || !subjectRemoveCode || !subjectRemoveScope) return;
    const code = subjectRemoveCode;
    setRemovingSubject(code);
    try {
      const res = await fetch("/api/admin/questions/delete-subject", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ subjectCode: code, scope: subjectRemoveScope }),
      });
      if (res.ok) {
        const data = await res.json();
        const scopeLabel =
          subjectRemoveScope === "all" ? "ALL" : subjectRemoveScope === "vt" ? "VT" : "NON-VT";
        toast.success(`Removed ${data.deleted} question(s) for ${code} (${scopeLabel})`);
        loadSubjectStatus();
        setSubjectRemoveOpen(false);
        setSubjectRemoveCode(null);
        setSubjectRemoveScope(null);
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to remove questions");
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
        setIsEnvAdmin(false);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (token) loadAdminSession();
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

    setAvailableSections(SUBJECT_SECTION_CODES[subject] || []);
    setSection("all"); // Reset section when subject changes
  }, [subject]);

  const isAllowed = adminStatus === "allowed";

  const router = useRouter();
  const tabFromQuery = router.query.tab;
  const tab: AdminTab =
    typeof tabFromQuery === "string" && VALID_TABS.includes(tabFromQuery as AdminTab)
      ? (tabFromQuery as AdminTab)
      : "insights";

  const layoutTab: AdminTab = tab === "library" && !isEnvAdmin ? "insights" : tab;
  const showInsights = tab === "insights" || (tab === "library" && !isEnvAdmin);

  useEffect(() => {
    if (!router.isReady) return;
    const q = router.query.tab;
    if (q !== "insights" && q !== "library" && q !== "users") {
      router.replace("/admin?tab=insights", undefined, { shallow: true });
    }
  }, [router.isReady, router.query.tab]);

  useEffect(() => {
    if (!router.isReady || adminStatus !== "allowed") return;
    if (!isEnvAdmin && router.query.tab === "library") {
      router.replace("/admin?tab=insights", undefined, { shallow: true });
    }
  }, [router.isReady, router.query.tab, adminStatus, isEnvAdmin, router]);

  async function fetchFiltered(): Promise<Question[] | undefined> {
    if (!token) return undefined;
    const sectionParam = section === "all" ? "" : section;
    const res = await fetch(
      `/api/admin/questions/query?subject=${subject}&section=${sectionParam}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const data = await res.json();
    const nextItems: Question[] = data.items || [];
    setItems(nextItems);
    setSelectedQuestions(new Set());
    return nextItems;
  }

  async function handleSearchClick() {
    const nextItems = await fetchFiltered();
    if (showOnlyMixedPrompts && nextItems) {
      setMixedPromptsPinnedIds(
        nextItems.filter((q) => hasMixedTextAndImageChoices(q.choices)).map((q) => q.id),
      );
    }
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

  // Bulk delete helper retained, but UI entrypoints removed so this is not currently reachable.
  async function bulkDeleteDisplayedQuestions() {
    if (!token) return;
    const ids = displayedItems.map((q) => q.id);
    if (ids.length === 0) return;
    try {
      await fetch("/api/admin/questions/bulk-delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ids }),
      }).catch(() => {});
    } catch {
      // no-op
    }
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

    // Clear any previous summary when starting a new run so the next
    // execution owns the sticky row contents.
    setLastExplanationSummary(null);

    setGeneratingExplanations(true);
    let questionIds = Array.from(selectedQuestions);

    // For "Generate Explanations", only send questions that are actually missing explanations.
    // The dedicated "Re-Generate Explanations (overwrite)" action intentionally skips this
    // filter so it will overwrite any existing explanations.
    if (selectedAction === "explanations") {
      const byId = new Map(items.map((q) => [q.id, q]));
      const missingExplanationIds = questionIds.filter((id) => {
        const q = byId.get(id);
        return !q?.explanation || q.explanation.trim() === "";
      });

      if (missingExplanationIds.length === 0) {
        toast.error("All selected questions already have explanations");
        setGeneratingExplanations(false);
        setExplanationProgress(null);
        return;
      }

      questionIds = missingExplanationIds;
    }

    let endpoint = "/api/generateExplanations";

    switch (selectedAction) {
      case "explanations":
        endpoint = "/api/generateExplanations";
        break;
      case "re-generate-explanations-fresh":
        // Overwrite any existing explanations using the same endpoint.
        endpoint = "/api/generateExplanations";
        break;
      case "re-generate-explanations":
        endpoint = "/api/reGenerateExplanations";
        break;
      case "fix-prompts":
        endpoint = "/api/prettyPrintPromptsChoices";
        break;
      case "fix-mixed-media-prompts":
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
      : selectedAction === "re-generate-explanations-fresh" ? "Explanation Re-Generation (overwrite)"
      : selectedAction === "re-generate-explanations" ? "Explanation Reformatting"
      : selectedAction === "fix-prompts" ? "Prompt & Choices Pretty Print"
      : selectedAction === "fix-mixed-media-prompts" ? "Mixed Media Prompt Fixing"
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
              });
            }
            if (event.type === "complete") {
              setExplanationProgress((prev) => {
                if (!prev) return prev;
                const next = {
                  ...prev,
                  current: event.total || prev.total,
                  skipped: event.skipped ?? prev.skipped,
                  failed: event.failed ?? prev.failed,
                  passed: typeof event.passed === "number" ? event.passed : prev.passed,
                  message: event.message || prev.message,
                };
                // Snapshot the final state into a sticky summary that will
                // remain visible even after live progress is cleared.
                setLastExplanationSummary(next);
                return next;
              });
              toast.success(event.message);
              // Refresh questions after primary action (fix prompts, explanations, etc.).
              fetchFiltered();
              // If we just ran Fix Mixed Media Prompts, automatically kick off verification
              // for the same question IDs in the background so any accidental key changes
              // or broken questions get flagged.
              if (selectedAction === "fix-mixed-media-prompts" && questionIds.length > 0) {
                void fetch("/api/admin/verify-questions", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify({ questionIds, model: "2.5lite" }),
                }).catch(() => {
                  // Silent failure; admins can still run manual verify if needed.
                });
              }
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
      // When the run finishes (successfully or with an error), clear the
      // live progress object immediately. The final stats have already been
      // snapshotted into `lastExplanationSummary` on "complete", so the
      // status bar remains visible until the user dismisses it.
      setExplanationProgress(null);
    }
  }

  function stopAIAction() {
    // Snapshot whatever progress we have so far so the user still sees
    // the partial results in the sticky status bar after aborting.
    setLastExplanationSummary(prev => explanationProgress ?? prev);
    aiActionAbortRef.current?.abort();
    setGeneratingExplanations(false);
    toast("AI action cancelled");
    // Clear live progress; the sticky summary (if any) remains until
    // the user clicks the close button.
    setExplanationProgress(null);
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
        tab={layoutTab}
        showContentLibraryTab={isEnvAdmin}
        userEmail={user?.email ?? null}
        cheatMode={cheatMode}
        onCheatModeChange={handleCheatModeToggle}
      >
        {showInsights && <AdminInsightsTab token={token} />}
        {tab === "library" && isEnvAdmin && (
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
                            onClick={() => openSubjectRemoveDialog(s.code)}
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
                        <div className="text-lg font-bold text-green-700 dark:text-green-400">
                          {count.toLocaleString()}
                        </div>
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

        {/* Import VT questions */}
        <Card className="border-2 border-dashed border-indigo-500/30 dark:bg-slate-900/60 dark:border-indigo-600/30 rounded-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 dark:text-white">
              <Zap className="w-5 h-5 text-indigo-500" />
              Import VT questions
            </CardTitle>
            <CardDescription className="dark:text-slate-400">
              Each subject can be imported once. New questions are tagged with source VT. Subjects that already have VT questions are not listed.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="flex-1">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">Subject</label>
                <Select value={varsitySubjectCode} onValueChange={setVarsitySubjectCode} disabled={addingVarsitySubject}>
                  <SelectTrigger className="bg-white dark:bg-slate-800 dark:text-white dark:border-slate-700">
                    <SelectValue
                      placeholder={
                        loadingStatus
                          ? "Loading subjects…"
                          : availableToAddVarsity.length === 0
                            ? "All subjects already have VT questions"
                            : "Choose a subject to import"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {availableToAddVarsity.map((s) => (
                      <SelectItem key={s.code} value={s.code}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {addingVarsitySubject ? (
                <Button onClick={stopVarsityAddSubject} variant="destructive" className="min-w-[140px]">
                  <Square className="w-4 h-4 mr-2" />
                  Stop VT import
                </Button>
              ) : (
                <Button
                  onClick={startVarsityAddSubject}
                  disabled={
                    !varsitySubjectCode ||
                    loadingStatus ||
                    availableToAddVarsity.length === 0
                  }
                  className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white min-w-[140px]"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Import VT
                </Button>
              )}
            </div>

            {varsitySubjectProgress && (
              <div className="space-y-3 pt-2">
                <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400">
                  <span>{varsitySubjectProgress.message}</span>
                  {varsitySubjectProgress.total > 0 && (
                    <span>{Math.round((varsitySubjectProgress.current / Math.max(varsitySubjectProgress.total, 1)) * 100)}%</span>
                  )}
                </div>
                <Progress
                  value={(varsitySubjectProgress.current / Math.max(varsitySubjectProgress.total, 1)) * 100}
                  className="h-2"
                />
                <div className="flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
                  <span className="text-slate-600 dark:text-slate-300">VT requests: {varsitySubjectProgress.linksCrawled}</span>
                  <span className="text-slate-600 dark:text-slate-300">VT questions received: {varsitySubjectProgress.rawQuestionsFound}</span>
                  <span className="text-amber-600 dark:text-amber-400">Dupes skipped: {varsitySubjectProgress.duplicatesSkipped}</span>
                  <span className="text-green-600 font-medium">New unique: {varsitySubjectProgress.imported}</span>
                  <span className="text-amber-500">Invalid skipped: {varsitySubjectProgress.skipped}</span>
                  <span className="text-red-600">Errors: {varsitySubjectProgress.errors}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <AlertDialog
          open={subjectRemoveOpen}
          onOpenChange={(open) => {
            if (!open) {
              setSubjectRemoveOpen(false);
              setSubjectRemoveCode(null);
              setSubjectRemoveScope(null);
            }
          }}
        >
          <AlertDialogContent className="dark:bg-slate-900 dark:border-slate-800">
            <AlertDialogHeader>
              <AlertDialogTitle className="dark:text-white">Remove questions</AlertDialogTitle>
              <AlertDialogDescription className="dark:text-slate-400 text-left space-y-3">
                <span className="block">
                  This cannot be undone. Choose what to delete for{" "}
                  <strong className="text-slate-200">
                    {subjectRemoveCode
                      ? allApSubjectsRef.find((s) => s.code === subjectRemoveCode)?.label ?? subjectRemoveCode
                      : "—"}
                  </strong>
                  :
                </span>
                <div className="flex flex-col gap-3 pt-1">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="subject-remove-all"
                      checked={subjectRemoveScope === "all"}
                      onCheckedChange={(c) => {
                        setSubjectRemoveScope(c === true ? "all" : null);
                      }}
                      className="mt-0.5"
                    />
                    <Label htmlFor="subject-remove-all" className="text-sm font-normal text-slate-300 cursor-pointer leading-snug">
                      <span className="font-semibold text-slate-100">ALL</span> — remove every question for this subject
                    </Label>
                  </div>
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="subject-remove-non-vt"
                      checked={subjectRemoveScope === "non_vt"}
                      onCheckedChange={(c) => {
                        setSubjectRemoveScope(c === true ? "non_vt" : null);
                      }}
                      className="mt-0.5"
                    />
                    <Label htmlFor="subject-remove-non-vt" className="text-sm font-normal text-slate-300 cursor-pointer leading-snug">
                      <span className="font-semibold text-slate-100">NON-VT</span> — remove only questions where{" "}
                      <code className="text-xs bg-slate-800 px-1 rounded">source ≠ VT</code> (missing or other source)
                    </Label>
                  </div>
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="subject-remove-vt"
                      checked={subjectRemoveScope === "vt"}
                      onCheckedChange={(c) => {
                        setSubjectRemoveScope(c === true ? "vt" : null);
                      }}
                      className="mt-0.5"
                    />
                    <Label htmlFor="subject-remove-vt" className="text-sm font-normal text-slate-300 cursor-pointer leading-snug">
                      <span className="font-semibold text-slate-100">VT</span> — remove only questions with{" "}
                      <code className="text-xs bg-slate-800 px-1 rounded">source = VT</code>
                    </Label>
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel type="button" className="dark:border-slate-600 dark:text-slate-200">
                Cancel
              </AlertDialogCancel>
              <Button
                type="button"
                variant="destructive"
                disabled={!subjectRemoveScope || removingSubject !== null}
                onClick={() => void confirmSubjectRemove()}
              >
                {removingSubject ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Confirm remove
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

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
                onClick={() => void handleSearchClick()}
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
                  No Explaination
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="error-reports-only"
                  checked={showOnlyErrorReports}
                  onCheckedChange={(v) => setShowOnlyErrorReports(!!v)}
                />
                <Label htmlFor="error-reports-only" className="text-sm font-medium cursor-pointer dark:text-slate-300">
                  Error Reported
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="unverified-only"
                  checked={showOnlyUnverified}
                  onCheckedChange={(v) => setShowOnlyUnverified(!!v)}
                />
                <Label htmlFor="unverified-only" className="text-sm font-medium cursor-pointer dark:text-slate-300">
                  Un-Verified
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="verification-failed-only"
                  checked={showOnlyVerificationFailed}
                  onCheckedChange={(v) => setShowOnlyVerificationFailed(!!v)}
                />
                <Label htmlFor="verification-failed-only" className="text-sm font-medium cursor-pointer dark:text-slate-300">
                  Verification Failed
                </Label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Questions Table Card */}
        <Card className="dark:bg-slate-900/60 dark:border-slate-800">
          <CardHeader>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <CardTitle className="dark:text-white">
                    Questions ({displayedItems.length})
                  </CardTitle>
                </div>
                <CardDescription>
                  {showOnlyMissingExplanation && items.length > 0 && "Filter: No Explaination. "}
                  {showOnlyErrorReports && items.length > 0 && "Filter: Error Reported. "}
                  {showOnlyUnverified && items.length > 0 && "Filter: Un-Verified. "}
                  {showOnlyVerificationFailed && items.length > 0 && "Filter: Verification Failed. "}
                  {showOnlyVerificationIncomplete && items.length > 0 && "Filter: Incomplete Prompt. "}
                  {showOnlyMixedPrompts && items.length > 0 && "Filter: Mixed Prompts (text + image choices). "}
                  {selectedQuestions.size > 0 && `${selectedQuestions.size} selected`}
                </CardDescription>
              </div>
              <div className="flex gap-2 items-center">
                <Select value={selectedAction} onValueChange={setSelectedAction}>
                  <SelectTrigger className="w-[250px] bg-white dark:bg-slate-800 dark:text-white dark:border-slate-700">
                    <SelectValue placeholder="Select Action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="explanations">Generate Explanations</SelectItem>
                    <SelectItem value="re-generate-explanations-fresh">
                      Re-Generate Explanations (overwrite)
                    </SelectItem>
                    <SelectItem value="re-generate-explanations">Reformat Existing Explanations</SelectItem>
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
            </div>
          </CardHeader>
          {/* Bulk delete dialog removed from UI */}
          <CardContent>
            {/* Sticky status row above the table. Always rendered with a fixed
                height so the page layout does not jump when progress appears
                or disappears. */}
            {(() => {
              const status = explanationProgress || lastExplanationSummary;
              const doneCount =
                status &&
                (typeof status.passed === "number"
                  ? status.passed + status.failed + status.skipped
                  : status.updated + status.skipped + status.failed);

              const percent =
                status && status.total > 0
                  ? Math.round(
                      (status.current / Math.max(status.total, 1)) * 100,
                    )
                  : 0;

              return (
                <div className="mb-3">
                  <div
                    className={`h-16 flex items-stretch justify-between rounded-md border px-3 py-1 text-xs transition-colors ${
                      status
                        ? "border-slate-200/60 bg-slate-50/40 text-slate-700 dark:border-slate-700/60 dark:bg-slate-900/40 dark:text-slate-200"
                        : "border-transparent bg-transparent text-slate-700 dark:text-slate-200"
                    }`}
                  >
                    {status ? (
                      <>
                        <div className="flex-1 flex flex-col justify-center gap-1 pr-3">
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate">{status.message}</span>
                            {status.total > 0 && (
                              <span className="shrink-0">{percent}%</span>
                            )}
                          </div>
                          <Progress
                            value={
                              (status.current / Math.max(status.total || 1, 1)) *
                              100
                            }
                            className="h-1.5"
                          />
                          <div className="flex flex-wrap gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                            <span className="text-green-600 dark:text-green-400 font-medium">
                              Done: {doneCount ?? 0}
                            </span>
                            <span className="text-amber-500 dark:text-amber-400">
                              Skipped: {status.skipped}
                            </span>
                            <span className="text-red-600 dark:text-red-400">
                              Failed: {status.failed}
                            </span>
                            {typeof status.passed === "number" && (
                              <span className="text-green-700 dark:text-green-400 font-medium">
                                Pass: {status.passed}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-start pt-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                            onClick={() => {
                              setExplanationProgress(null);
                              setLastExplanationSummary(null);
                            }}
                            aria-label="Dismiss status"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </>
                    ) : null}
                  </div>
                </div>
              );
            })()}
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
                  (showOnlyMissingExplanation ||
                    showOnlyErrorReports ||
                    showOnlyUnverified ||
                    showOnlyVerificationFailed ||
                    showOnlyMixedPrompts)
                    ? "No questions match the current filters."
                    : "No questions found. Upload a CSV or adjust filters."}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
        )}
        {tab === "users" && <AdminUsersTab token={token} canMutateUsers={isEnvAdmin} />}
      </AdminDashboardLayout>
    </div>
  );
}

function getImageUrl(url: string): string {
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
  const [previewOpen, setPreviewOpen] = useState(false);

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

    const hasImage =
      q.image_urls?.question &&
      Array.isArray(q.image_urls.question) &&
      q.image_urls.question.length > 0;
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

  const renderChoice = (choiceKey: "A" | "B" | "C" | "D" | "E") => {
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

    const index = ["A", "B", "C", "D", "E"].indexOf(choiceKey);
    const choice = Array.isArray(q.choices) ? q.choices[index] : "";
    const choiceImages = q.image_urls?.[choiceKey];
    const hasImage =
      choiceImages && Array.isArray(choiceImages) && choiceImages.length > 0;
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

  return (
    <tr className="border-b hover:bg-slate-50 dark:hover:bg-slate-700 dark:border-slate-700">
      <td className="p-2 text-center align-top">
        <Checkbox checked={selected} onCheckedChange={onToggleSelect} />
      </td>
      <td className="p-2 align-top text-xs break-words dark:text-slate-300">
        {q.subject_code ? getSubjectDisplayName(q.subject_code) : "-"}
      </td>
      <td className="p-2 align-top text-xs break-words dark:text-slate-300">
        {q.section_code || "-"}
      </td>
      <td className="p-2 align-top min-w-[150px] max-w-[200px]">
        <div className="flex items-start gap-1">
          <div
            className="flex-1 min-w-0"
            title={
              q.prompt_blocks
                ? q.prompt_blocks
                    .filter((b): b is Block => b.type === "text")
                    .map((b) => (b as { value: string }).value)
                    .join(" ")
                : q.prompt || ""
            }
          >
            {renderQuestionPrompt()}
          </div>
        </div>
      </td>
      <td className="p-2 align-top min-w-[150px] max-w-[200px]">
        <div className="flex items-start gap-1">
          <div className="text-xs space-y-1 flex-1 min-w-0">
            {(["A", "B", "C", "D", "E"] as const).map((letter) => (
              <div key={letter} className="break-words">
                <span className="font-medium">{letter}.</span>{" "}
                {renderChoice(letter)}
              </div>
            ))}
          </div>
        </div>
      </td>
      <td className="p-2 text-center align-top font-semibold text-xs">
        <div className="flex items-center justify-center gap-1">
          <span>({String.fromCharCode(65 + q.answerIndex)})</span>
        </div>
      </td>
      <td className="p-2 align-top text-xs break-words min-w-[150px] max-w-[220px]">
        <div className="flex items-start gap-1">
          <div className="flex-1 min-w-0" title={q.explanation || ""}>
            <span
              dangerouslySetInnerHTML={{
                __html: renderSimpleMarkdownHtml(
                  truncateText(q.explanation || "-", 12),
                ),
              }}
            />
          </div>
        </div>
      </td>
      <td className="p-2 align-top text-xs break-words min-w-[150px] max-w-[220px]">
        <div className="flex items-start gap-1">
          <div
            className="flex-1 min-w-0 text-slate-700 dark:text-slate-300 leading-relaxed"
            title={getStudyNoteFromQuestion(q) || ""}
          >
            {truncateText(getStudyNoteFromQuestion(q) || "-", 12)}
          </div>
        </div>
      </td>
      <td className="p-2 align-top text-xs break-words dark:text-slate-300">
        {getDifficultyFromQuestion(q) || "-"}
      </td>
      <td className="p-2 text-center align-top text-xs">
        <VerificationStatusSelect q={q} onSave={onSave} />
      </td>
      <td className="p-2 align-top text-xs break-words min-w-[120px] max-w-[180px]">
        <div className="flex items-start gap-1">
          <div className="flex-1 min-w-0">
            {(q.tags || []).includes("error_reported") ? (
              <div
                className="text-red-600 dark:text-red-400 font-medium"
                title={getErrorReasonFromQuestion(q) || "Reported"}
              >
                {truncateText(
                  getErrorReasonFromQuestion(q) || "Reported",
                  10,
                )}
              </div>
            ) : (
              <span className="text-slate-400">-</span>
            )}
          </div>
        </div>
      </td>
      <td className="p-2 text-center align-top">
        <div className="flex gap-1 justify-center flex-col">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPreviewOpen(true)}
            className="text-xs px-2 h-7"
          >
            <Eye className="h-3.5 w-3.5 mr-1 inline" />
            Preview
          </Button>
          {(q.tags || []).includes("error_reported") && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const newTags = (q.tags || []).filter(
                  (t) =>
                    t !== "error_reported" &&
                    !t.startsWith("error_reason:") &&
                    !t.startsWith("error_details:"),
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
        <AdminQuestionQuizPreviewDialog
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          question={q}
        />
      </td>
    </tr>
  );
}