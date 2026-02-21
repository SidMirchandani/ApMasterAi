"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { auth } from "../../lib/firebase";
import {
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  User,
} from "firebase/auth";
import toast, { Toaster } from "react-hot-toast";
import { BookOpen, Search, LogOut, AlertCircle, Loader2, Zap, Play, Square } from "lucide-react";
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

const googleProvider = new GoogleAuthProvider();

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
};

export default function AdminPage() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // Data
  const [items, setItems] = useState<Question[]>([]);

  // Filters
  const [subject, setSubject] = useState("");
  const [section, setSection] = useState("");
  
  const allApSubjectsRef = [
    { code: "APMACRO", label: "AP Macroeconomics" },
    { code: "APMICRO", label: "AP Microeconomics" },
    { code: "APCSP", label: "AP Computer Science Principles" },
    { code: "APCHEM", label: "AP Chemistry" },
    { code: "APGOV", label: "AP U.S. Government and Politics" },
    { code: "APPSYCH", label: "AP Psychology" },
    { code: "APBIO", label: "AP Biology" },
    { code: "APCALCAB", label: "AP Calculus AB" },
    { code: "APCALCBC", label: "AP Calculus BC" },
    { code: "APCSA", label: "AP Computer Science A" },
    { code: "APUSH", label: "AP U.S. History" },
    { code: "APWH", label: "AP World History: Modern" },
    { code: "APEURO", label: "AP European History" },
    { code: "APLANG", label: "AP English Language" },
    { code: "APLIT", label: "AP English Literature" },
    { code: "APSTATS", label: "AP Statistics" },
    { code: "APPHYS1", label: "AP Physics 1" },
    { code: "APPHYS2", label: "AP Physics 2" },
    { code: "APES", label: "AP Environmental Science" },
    { code: "APHUG", label: "AP Human Geography" },
  ];
  const availableSubjects = allApSubjectsRef.map(s => s.code);
  const [availableSections, setAvailableSections] = useState<string[]>([]);


  // AI explanation generation state
  const [generatingExplanations, setGeneratingExplanations] = useState(false);
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(
    new Set(),
  );
  const [selectedModel, setSelectedModel] = useState<string>("2.5");
  const [selectedAction, setSelectedAction] = useState<string>("process");
  const [cheatMode, setCheatMode] = useState(false);
  const aiActionAbortRef = useRef<AbortController | null>(null);
  const [explanationProgress, setExplanationProgress] = useState<{
    current: number;
    total: number;
    updated: number;
    skipped: number;
    failed: number;
    message: string;
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
    setMigrateProgress({ current: 0, total: 0, made_public: 0, failed: 0, message: "Starting migration..." });

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

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const t = await u.getIdToken();
        setToken(t);
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
      APCSA: ["PT", "UO", "BEI", "ITR", "WC", "ARR", "AL", "TDA", "INH", "REC"],
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

  const allowedEmails = useMemo(
    () =>
      (process.env.NEXT_PUBLIC_ADMIN_HINT || "")
        .split(",")
        .map((e) => e.trim().toLowerCase()),
    [],
  );
  const isAllowed = useMemo(() => {
    if (!user?.email) return false;
    if (!process.env.NEXT_PUBLIC_ADMIN_HINT) return true;
    return allowedEmails.includes(user.email.toLowerCase());
  }, [user, allowedEmails]);

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

    let endpoint = "/api/processQuestions";

    switch (selectedAction) {
      case "process":
        endpoint = "/api/processQuestions";
        break;
      case "explanations":
        endpoint = "/api/generateExplanations";
        break;
      case "fix-prompts":
        endpoint = "/api/fixPromptsChoices";
        break;
    }

    const actionLabel = selectedAction === "process" ? "processing (fix + explain)"
      : selectedAction === "explanations" ? "explanation generation"
      : "prompt fixing";

    setExplanationProgress({
      current: 0,
      total: questionIds.length,
      updated: 0,
      skipped: 0,
      failed: 0,
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
        body: JSON.stringify({ questionIds, model: selectedModel }),
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
              });
            }
            if (event.type === "complete") {
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
    if (selectedQuestions.size === items.length) {
      setSelectedQuestions(new Set());
    } else {
      setSelectedQuestions(new Set(items.map(q => q.id)));
    }
  }

  const handleCheatModeToggle = (checked: boolean) => {
    setCheatMode(checked);
    localStorage.setItem('adminCheatMode', checked.toString());
    toast.success(checked ? 'Cheat mode enabled' : 'Cheat mode disabled');
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-khan-background dark:bg-gray-900 flex items-center justify-center">
        <div className="text-khan-gray-dark dark:text-gray-300">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-khan-background dark:bg-gray-900 flex items-center justify-center px-4">
        <Card className="w-full max-w-md dark:bg-gray-800 dark:border-gray-700">
          <CardHeader className="text-center">
            <Link href="/" className="inline-flex items-center justify-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-khan-green rounded-lg flex items-center justify-center">
                <BookOpen className="w-7 h-7 text-white" />
              </div>
              <span className="text-3xl font-bold text-khan-gray-dark dark:text-white">APMaster</span>
            </Link>
            <CardTitle className="text-2xl">Admin Login</CardTitle>
            <CardDescription>Sign in to access the admin dashboard</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => signInWithPopup(auth, googleProvider)}
              className="w-full bg-khan-green hover:bg-khan-green-light text-white"
            >
              Sign in with Google
            </Button>
            <div className="mt-4 text-center">
              <Link href="/" className="text-khan-blue hover:text-khan-purple transition-colors text-sm">
                ← Back to home
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAllowed) {
    return (
      <div className="min-h-screen bg-khan-background dark:bg-gray-900 flex items-center justify-center px-4">
        <Card className="w-full max-w-md dark:bg-gray-800 dark:border-gray-700">
          <CardHeader className="text-center">
            <Link href="/" className="inline-flex items-center justify-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-khan-green rounded-lg flex items-center justify-center">
                <BookOpen className="w-7 h-7 text-white" />
              </div>
              <span className="text-3xl font-bold text-khan-gray-dark dark:text-white">APMaster</span>
            </Link>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Authentication Failed</strong>
                <br />
                You are not authorized to access the admin dashboard. Your account ({user.email}) does not have admin privileges.
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
                <Button variant="default" className="w-full bg-khan-green hover:bg-khan-green-light">
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
    <div className="min-h-screen bg-khan-background dark:bg-gray-900">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-khan-green rounded-lg flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-khan-gray-dark dark:text-white">APMaster Admin</h1>
                <p className="text-sm text-khan-gray-medium dark:text-gray-400">Question Management</p>
              </div>
            </Link>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  id="cheat-mode"
                  checked={cheatMode}
                  onCheckedChange={handleCheatModeToggle}
                />
                <Label htmlFor="cheat-mode" className="text-sm font-medium cursor-pointer dark:text-gray-300">
                  Cheat Mode
                </Label>
              </div>
              <span className="text-sm text-khan-gray-medium dark:text-gray-400">{user.email}</span>
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Subjects Overview */}
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-xl dark:text-white">
                  <BookOpen className="w-5 h-5 text-khan-green" />
                  Subjects Overview
                </CardTitle>
                <CardDescription className="dark:text-gray-400">
                  {loadingStatus ? "Loading..." : `${alreadyAdded.length} of ${allApSubjectsRef.length} subjects imported`}
                </CardDescription>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-khan-gray-dark dark:text-white">
                  {Object.values(subjectStatus).reduce((sum, s) => sum + (s.questionCount || 0), 0).toLocaleString()}
                </div>
                <div className="text-xs text-khan-gray-medium dark:text-gray-400">Total Questions</div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loadingStatus ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-khan-green" />
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
                          : "border-gray-200 bg-gray-50 hover:border-gray-300 dark:border-gray-600 dark:bg-gray-700"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-1">
                        <span className={`text-xs font-bold ${hasQuestions ? "text-green-700 dark:text-green-400" : "text-gray-400 dark:text-gray-500"}`}>
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
                      <div className={`text-xs font-medium leading-tight mb-1 ${hasQuestions ? "text-gray-800 dark:text-gray-200" : "text-gray-500 dark:text-gray-400"}`}>
                        {s.label.replace("AP ", "")}
                      </div>
                      {hasQuestions ? (
                        <div className="text-lg font-bold text-green-700 dark:text-green-400">{count.toLocaleString()}</div>
                      ) : (
                        <div className="text-xs text-gray-400 dark:text-gray-500 italic">Not imported</div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add Subject Card */}
        <Card className="border-2 border-dashed border-khan-green/30 dark:bg-gray-800 dark:border-green-600/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 dark:text-white">
              <Zap className="w-5 h-5 text-khan-green" />
              Add Subject
            </CardTitle>
            <CardDescription className="dark:text-gray-400">
              Select an AP subject to automatically scrape questions from CrackAP, classify by unit, and import
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="flex-1">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Subject to Add</label>
                <Select value={addSubjectCode} onValueChange={setAddSubjectCode} disabled={addingSubject}>
                  <SelectTrigger className="bg-white dark:bg-gray-700 dark:text-white dark:border-gray-600">
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
                  className="bg-khan-green hover:bg-khan-green-light text-white min-w-[140px]"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Add Subject
                </Button>
              )}
            </div>

            {addSubjectProgress && (
              <div className="space-y-3 pt-2">
                <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                  <span>{addSubjectProgress.message}</span>
                  {addSubjectProgress.total > 0 && (
                    <span>{Math.round((addSubjectProgress.current / Math.max(addSubjectProgress.total, 1)) * 100)}%</span>
                  )}
                </div>
                <Progress
                  value={(addSubjectProgress.current / Math.max(addSubjectProgress.total, 1)) * 100}
                  className="h-2"
                />
                <div className="flex gap-4 text-xs text-gray-500 dark:text-gray-400">
                  <span className="text-green-600 font-medium">Imported: {addSubjectProgress.imported}</span>
                  <span className="text-yellow-600">Skipped: {addSubjectProgress.skipped}</span>
                  <span className="text-red-600">Errors: {addSubjectProgress.errors}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Image Migration Card */}
        <Card className="border-2 border-dashed border-orange-300 dark:border-orange-600 dark:bg-gray-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 dark:text-white">
              <AlertCircle className="w-5 h-5 text-orange-500" />
              Migrate Firebase Storage Images
            </CardTitle>
            <CardDescription className="dark:text-gray-400">
              Make Firebase Storage images publicly accessible so they load without the proxy
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="flex-1">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Subject (optional)</label>
                <Select value={migrateSubjectCode} onValueChange={setMigrateSubjectCode} disabled={migratingImages}>
                  <SelectTrigger className="bg-white dark:bg-gray-700 dark:text-white dark:border-gray-600">
                    <SelectValue placeholder="All subjects with Firebase images" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Subjects</SelectItem>
                    <SelectItem value="APCSP">AP Computer Science Principles</SelectItem>
                    <SelectItem value="APMICRO">AP Microeconomics</SelectItem>
                    <SelectItem value="APMACRO">AP Macroeconomics</SelectItem>
                    <SelectItem value="APCHEM">AP Chemistry</SelectItem>
                    <SelectItem value="APGOV">AP U.S. Government</SelectItem>
                    <SelectItem value="APPSYCH">AP Psychology</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {migratingImages ? (
                <Button onClick={stopImageMigration} variant="destructive" className="min-w-[160px]">
                  <Square className="w-4 h-4 mr-2" />
                  Stop Migration
                </Button>
              ) : (
                <Button
                  onClick={startImageMigration}
                  className="bg-orange-500 hover:bg-orange-600 text-white min-w-[160px]"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Make Images Public
                </Button>
              )}
            </div>

            {migrateProgress && (
              <div className="space-y-3 pt-2">
                <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                  <span>{migrateProgress.message}</span>
                  {migrateProgress.total > 0 && (
                    <span>{Math.round((migrateProgress.current / Math.max(migrateProgress.total, 1)) * 100)}%</span>
                  )}
                </div>
                <Progress
                  value={migrateProgress.total > 0 ? (migrateProgress.current / Math.max(migrateProgress.total, 1)) * 100 : 0}
                  className="h-2"
                />
                <div className="flex gap-4 text-xs text-gray-500 dark:text-gray-400">
                  <span className="text-green-600 font-medium">Made Public: {migrateProgress.made_public}</span>
                  <span className="text-red-600">Failed: {migrateProgress.failed}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Filter Card */}
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 dark:text-white">
              <Search className="w-5 w-5" />
              Filter Questions
            </CardTitle>
            <CardDescription className="dark:text-gray-400">Search by subject and section code</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <Select value={subject} onValueChange={setSubject}>
                <SelectTrigger className="flex-1 bg-white dark:bg-gray-700 dark:text-white dark:border-gray-600">
                  <SelectValue placeholder="Select Subject" />
                </SelectTrigger>
                <SelectContent>
                  {availableSubjects.map((subj) => (
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
                <SelectTrigger className="flex-1 bg-white dark:bg-gray-700 dark:text-white dark:border-gray-600">
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
                className="bg-khan-blue hover:bg-khan-purple text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Search className="w-4 h-4 mr-2" />
                Search
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Questions Table Card */}
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="dark:text-white">Questions ({items.length})</CardTitle>
                <CardDescription>
                  {selectedQuestions.size > 0 && `${selectedQuestions.size} selected`}
                </CardDescription>
              </div>
              <div className="flex gap-2 items-center">
                <Select value={selectedAction} onValueChange={setSelectedAction}>
                  <SelectTrigger className="w-[250px] bg-white dark:bg-gray-700 dark:text-white dark:border-gray-600">
                    <SelectValue placeholder="Select Action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="process">Process Questions (All-in-One)</SelectItem>
                    <SelectItem value="explanations">Generate Explanations Only</SelectItem>
                    <SelectItem value="fix-prompts">Fix Prompts & Choices Only</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={selectedModel} onValueChange={setSelectedModel}>
                  <SelectTrigger className="w-[200px] bg-white dark:bg-gray-700 dark:text-white dark:border-gray-600">
                    <SelectValue placeholder="Select Model" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2.5">Gemini 2.5 Flash (Default)</SelectItem>
                    <SelectItem value="2.5pro">Gemini 2.5 Pro</SelectItem>
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
                    className="bg-khan-green hover:bg-khan-green-light text-white"
                  >
                    {`Execute (${selectedQuestions.size})`}
                  </Button>
                )}
              </div>
              {explanationProgress && (
                <div className="mt-3 space-y-2">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>{explanationProgress.message}</span>
                    {explanationProgress.total > 0 && (
                      <span>{Math.round((explanationProgress.current / Math.max(explanationProgress.total, 1)) * 100)}%</span>
                    )}
                  </div>
                  <Progress
                    value={(explanationProgress.current / Math.max(explanationProgress.total, 1)) * 100}
                    className="h-2"
                  />
                  <div className="flex gap-4 text-xs text-gray-500">
                    <span className="text-green-600 font-medium">Done: {explanationProgress.updated}</span>
                    <span className="text-yellow-600">Skipped: {explanationProgress.skipped}</span>
                    <span className="text-red-600">Failed: {explanationProgress.failed}</span>
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
                  <col style={{ width: '25%' }} />
                  <col style={{ width: '20%' }} />
                  <col className="w-14" />
                  <col style={{ width: '20%' }} />
                  <col className="w-20" />
                </colgroup>
                <thead className="bg-gray-50 dark:bg-gray-700 border-b dark:border-gray-600">
                  <tr>
                    <th className="p-2 text-center">
                      <Checkbox
                        checked={items.length > 0 && selectedQuestions.size === items.length}
                        onCheckedChange={toggleSelectAll}
                      />
                    </th>
                    <th className="p-2 text-left font-semibold text-khan-gray-dark dark:text-gray-300 text-xs">Subject</th>
                    <th className="p-2 text-left font-semibold text-khan-gray-dark dark:text-gray-300 text-xs">Section</th>
                    <th className="p-2 text-left font-semibold text-khan-gray-dark dark:text-gray-300 text-xs">Prompt</th>
                    <th className="p-2 text-left font-semibold text-khan-gray-dark dark:text-gray-300 text-xs">Choices</th>
                    <th className="p-2 text-center font-semibold text-khan-gray-dark dark:text-gray-300 text-xs">Ans</th>
                    <th className="p-2 text-left font-semibold text-khan-gray-dark dark:text-gray-300 text-xs">Explanation</th>
                    <th className="p-2 text-center font-semibold text-khan-gray-dark dark:text-gray-300 text-xs">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((q) => (
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
              {items.length === 0 && (
                <div className="p-8 text-center text-khan-gray-medium dark:text-gray-400">
                  No questions found. Upload a CSV or adjust filters.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
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
  const [form, setForm] = useState({
    subject_code: q.subject_code || "",
    section_code: q.section_code || "",
    prompt: q.prompt || "",
    choicesText: Array.isArray(q.choices) ? q.choices.join("\n") : "",
    answerIndex: q.answerIndex || 0,
    explanation: q.explanation || "",
  });

  async function save() {
    const patch: Partial<Question> = {
      subject_code: form.subject_code,
      section_code: form.section_code,
      prompt: form.prompt,
      choices: form.choicesText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
      answerIndex: Number(form.answerIndex),
      explanation: form.explanation,
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
              return <div key={idx} className="line-clamp-3">{block.value}</div>;
            } else if (block.type === "image") {
              const imgSrc = getImageUrl(block.url);
              return (
                <div key={idx} className="group relative inline-block">
                  <img
                    src={imgSrc}
                    alt={`Question image ${idx + 1}`}
                    className="h-8 w-auto rounded border border-gray-300 cursor-pointer"
                  />
                  <img
                    src={imgSrc}
                    alt={`Question image ${idx + 1} enlarged`}
                    className="hidden group-hover:block absolute z-50 left-0 top-0 max-w-md w-auto max-h-96 rounded border-2 border-khan-blue shadow-lg"
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
      return <span className="text-gray-400">N/A</span>;
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
                    className="h-8 w-auto rounded border border-gray-300 cursor-pointer"
                  />
                  <img
                    src={imgSrc}
                    alt={`Question image ${idx + 1} enlarged`}
                    className="hidden group-hover:block absolute z-50 left-0 top-0 max-w-md w-auto max-h-96 rounded border-2 border-khan-blue shadow-lg"
                  />
                </div>
              );
            })}
          </div>
        )}
        {hasText && <div className="line-clamp-3">{q.prompt}</div>}
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
              return <span key={idx}>{block.value}</span>;
            } else if (block.type === "image") {
              const imgSrc = getImageUrl(block.url);
              return (
                <div key={idx} className="group relative inline-block mr-1">
                  <img
                    src={imgSrc}
                    alt={`Choice ${choiceKey} image ${idx + 1}`}
                    className="h-6 w-auto rounded border border-gray-300 cursor-pointer"
                  />
                  <img
                    src={imgSrc}
                    alt={`Choice ${choiceKey} image ${idx + 1} enlarged`}
                    className="hidden group-hover:block absolute z-50 left-0 top-0 max-w-md w-auto max-h-96 rounded border-2 border-khan-blue shadow-lg"
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
      return <span className="text-gray-400">N/A</span>;
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
                    className="h-6 w-auto rounded border border-gray-300 cursor-pointer"
                  />
                  <img
                    src={imgSrc}
                    alt={`Choice ${choiceKey} image ${idx + 1} enlarged`}
                    className="hidden group-hover:block absolute z-50 left-0 top-0 max-w-md w-auto max-h-96 rounded border-2 border-khan-blue shadow-lg"
                  />
                </div>
              );
            })}
          </div>
        )}
        {hasText && <span>{choice}</span>}
      </div>
    );
  };

  if (!edit) {
    return (
      <tr className="border-b hover:bg-gray-50 dark:hover:bg-gray-700 dark:border-gray-600">
        <td className="p-2 text-center align-top">
          <Checkbox
            checked={selected}
            onCheckedChange={onToggleSelect}
          />
        </td>
        <td className="p-2 align-top text-xs break-words dark:text-gray-300">{q.subject_code || "-"}</td>
        <td className="p-2 align-top text-xs break-words dark:text-gray-300">{q.section_code || "-"}</td>
        <td className="p-2 align-top">{renderQuestionPrompt()}</td>
        <td className="p-2 align-top">
          <div className="text-xs space-y-1">
            {(['A', 'B', 'C', 'D', 'E'] as const).map((letter) => (
              <div key={letter} className="break-words">
                <span className="font-medium">{letter}.</span> {renderChoice(letter)}
              </div>
            ))}
          </div>
        </td>
        <td className="p-2 text-center align-top font-semibold text-xs">
          ({String.fromCharCode(65 + q.answerIndex)})
        </td>
        <td className="p-2 align-top text-xs break-words overflow-hidden">
          <div className="line-clamp-4">{q.explanation || "-"}</div>
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
          className="w-full border rounded p-2 min-h-[80px] dark:bg-gray-700 dark:text-white dark:border-gray-600"
          value={form.prompt}
          onChange={(e) => setForm((s) => ({ ...s, prompt: e.target.value }))}
        />
      </td>
      <td className="p-2">
        <textarea
          className="w-full border rounded p-2 min-h-[80px] dark:bg-gray-700 dark:text-white dark:border-gray-600"
          value={form.choicesText}
          onChange={(e) =>
            setForm((s) => ({ ...s, choicesText: e.target.value }))
          }
        />
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
          className="w-full border rounded p-2 min-h-[80px] dark:bg-gray-700 dark:text-white dark:border-gray-600"
          value={form.explanation}
          onChange={(e) =>
            setForm((s) => ({ ...s, explanation: e.target.value }))
          }
        />
      </td>
      <td className="p-2 text-center">
        <div className="flex gap-2 justify-center flex-col">
          <Button size="sm" onClick={save} className="bg-khan-green hover:bg-khan-green-light text-white">
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