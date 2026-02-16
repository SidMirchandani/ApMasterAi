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
import { BookOpen, Upload, Search, LogOut, AlertCircle, Loader2, Zap, Play, Square } from "lucide-react";
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

  // ZIP import state
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // AI explanation generation state
  const [generatingExplanations, setGeneratingExplanations] = useState(false);
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(
    new Set(),
  );
  const [selectedModel, setSelectedModel] = useState<string>("2.0");
  const [selectedAction, setSelectedAction] = useState<string>("explanations");
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

  const [recategorizing, setRecategorizing] = useState(false);
  const [recatProgress, setRecatProgress] = useState<{
    message: string;
    current: number;
    total: number;
    updated: number;
    skipped: number;
    errors: number;
  } | null>(null);

  async function startRecategorizePhysics() {
    if (!token) return;
    setRecategorizing(true);
    setRecatProgress({ message: "Starting recategorization...", current: 0, total: 0, updated: 0, skipped: 0, errors: 0 });

    try {
      const res = await fetch("/api/admin/recategorize-physics", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Failed to recategorize");
        setRecategorizing(false);
        setRecatProgress(null);
        return;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) { setRecategorizing(false); return; }

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
            if (event.type === "progress" || event.type === "error") {
              setRecatProgress({
                message: event.message || "",
                current: event.current || 0,
                total: event.total || 0,
                updated: event.updated || 0,
                skipped: event.skipped || 0,
                errors: event.errors || 0,
              });
            }
            if (event.type === "complete") {
              toast.success(event.message);
              fetchSubjectStatus();
            }
          } catch {}
        }
      }
    } catch (err: any) {
      toast.error("Recategorization failed: " + err.message);
    } finally {
      setRecategorizing(false);
      setTimeout(() => setRecatProgress(null), 5000);
    }
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

  const handleZipImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/admin/import-questions', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(`Success! Imported ${data.imported} questions with ${data.images_uploaded} images.`);
        fetchFiltered(); // Re-fetch questions after import
      } else {
        toast.error(`Error: ${data.message || 'Import failed'}`);
      }
    } catch (err) {
      toast.error('Import failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

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
      case "fix-prompts":
        endpoint = "/api/fixPromptsChoices";
        break;
      case "generate-context":
        endpoint = "/api/generateContext";
        break;
    }

    const actionLabel = selectedAction === "explanations" ? "explanation generation"
      : selectedAction === "fix-prompts" ? "prompt fixing"
      : "context generation";

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
      <div className="min-h-screen bg-khan-background flex items-center justify-center">
        <div className="text-khan-gray-dark">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-khan-background flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Link href="/" className="inline-flex items-center justify-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-khan-green rounded-lg flex items-center justify-center">
                <BookOpen className="w-7 h-7 text-white" />
              </div>
              <span className="text-3xl font-bold text-khan-gray-dark">APMaster</span>
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
      <div className="min-h-screen bg-khan-background flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Link href="/" className="inline-flex items-center justify-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-khan-green rounded-lg flex items-center justify-center">
                <BookOpen className="w-7 h-7 text-white" />
              </div>
              <span className="text-3xl font-bold text-khan-gray-dark">APMaster</span>
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
    <div className="min-h-screen bg-khan-background">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-khan-green rounded-lg flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-khan-gray-dark">APMaster Admin</h1>
                <p className="text-sm text-khan-gray-medium">Question Management</p>
              </div>
            </Link>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  id="cheat-mode"
                  checked={cheatMode}
                  onCheckedChange={handleCheatModeToggle}
                />
                <Label htmlFor="cheat-mode" className="text-sm font-medium cursor-pointer">
                  Cheat Mode
                </Label>
              </div>
              <span className="text-sm text-khan-gray-medium">{user.email}</span>
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
        {/* ZIP Import Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Bulk Import via ZIP
            </CardTitle>
            <CardDescription>Import questions and images from a ZIP file</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3 items-center">
              <input
                ref={fileInputRef}
                type="file"
                accept=".zip"
                onChange={handleZipImport}
                style={{ display: 'none' }}
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                className="bg-khan-blue hover:bg-khan-blue/90"
                disabled={importing}
              >
                {importing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Import ZIP
                  </>
                )}
              </Button>
              {importing && (
                <p className="text-sm text-khan-gray-medium">
                  Processing ZIP file... This may take a while.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Add Subject Card */}
        <Card className="border-2 border-dashed border-khan-green/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-khan-green" />
              Add Subject
            </CardTitle>
            <CardDescription>
              Select an AP subject to automatically discover questions on CrackAP, classify them by unit, and import to Firestore
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {alreadyAdded.length > 0 && (
              <div className="mb-2">
                <p className="text-xs text-gray-500 mb-1">Already added ({alreadyAdded.length}):</p>
                <div className="flex flex-wrap gap-1">
                  {alreadyAdded.map(s => (
                    <span key={s.code} className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-green-100 text-green-700 border border-green-200">
                      {s.label} ({subjectStatus[s.code]?.questionCount || 0} Q)
                      <button
                        onClick={() => removeSubject(s.code)}
                        disabled={removingSubject === s.code}
                        className="ml-1 text-red-400 hover:text-red-600 font-bold"
                        title={`Remove ${s.label}`}
                      >
                        {removingSubject === s.code ? "..." : "×"}
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="flex-1">
                <label className="text-sm font-medium text-gray-700 mb-1 block">Subject to Add</label>
                <Select value={addSubjectCode} onValueChange={setAddSubjectCode} disabled={addingSubject}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder={loadingStatus ? "Loading subjects..." : "Select AP Subject"} />
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
                <div className="flex justify-between text-sm text-gray-600">
                  <span>{addSubjectProgress.message}</span>
                  {addSubjectProgress.total > 0 && (
                    <span>{Math.round((addSubjectProgress.current / Math.max(addSubjectProgress.total, 1)) * 100)}%</span>
                  )}
                </div>
                <Progress
                  value={(addSubjectProgress.current / Math.max(addSubjectProgress.total, 1)) * 100}
                  className="h-2"
                />
                <div className="flex gap-4 text-xs text-gray-500">
                  <span className="text-green-600 font-medium">Imported: {addSubjectProgress.imported}</span>
                  <span className="text-yellow-600">Skipped: {addSubjectProgress.skipped}</span>
                  <span className="text-red-600">Errors: {addSubjectProgress.errors}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recategorize Physics Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-orange-500" />
              Recategorize Physics Questions
            </CardTitle>
            <CardDescription>
              Update all AP Physics 1 and 2 questions to use the latest College Board unit codes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={startRecategorizePhysics}
              disabled={recategorizing}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              {recategorizing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Recategorizing...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Recategorize Physics 1 &amp; 2
                </>
              )}
            </Button>
            {recatProgress && (
              <div className="space-y-2 pt-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>{recatProgress.message}</span>
                  {recatProgress.total > 0 && (
                    <span>{Math.round((recatProgress.current / Math.max(recatProgress.total, 1)) * 100)}%</span>
                  )}
                </div>
                {recatProgress.total > 0 && (
                  <Progress
                    value={(recatProgress.current / Math.max(recatProgress.total, 1)) * 100}
                    className="h-2"
                  />
                )}
                <div className="flex gap-4 text-xs text-gray-500">
                  <span className="text-green-600 font-medium">Updated: {recatProgress.updated}</span>
                  <span className="text-yellow-600">Skipped: {recatProgress.skipped}</span>
                  <span className="text-red-600">Errors: {recatProgress.errors}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Filter Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 w-5" />
              Filter Questions
            </CardTitle>
            <CardDescription>Search by subject and section code</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <Select value={subject} onValueChange={setSubject}>
                <SelectTrigger className="flex-1 bg-white">
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
                <SelectTrigger className="flex-1 bg-white">
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
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Questions ({items.length})</CardTitle>
                <CardDescription>
                  {selectedQuestions.size > 0 && `${selectedQuestions.size} selected`}
                </CardDescription>
              </div>
              <div className="flex gap-2 items-center">
                <Select value={selectedAction} onValueChange={setSelectedAction}>
                  <SelectTrigger className="w-[220px] bg-white">
                    <SelectValue placeholder="Select Action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="explanations">Generate Explanations</SelectItem>
                    <SelectItem value="fix-prompts">Fix Prompts & Choices</SelectItem>
                    <SelectItem value="generate-context">Generate Context</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={selectedModel} onValueChange={setSelectedModel}>
                  <SelectTrigger className="w-[200px] bg-white">
                    <SelectValue placeholder="Select Model" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2.0">Gemini 2.0 Flash (Default)</SelectItem>
                    <SelectItem value="2.5">Gemini 2.5 Flash</SelectItem>
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
                    <span className="text-green-600 font-medium">Generated: {explanationProgress.updated}</span>
                    <span className="text-yellow-600">Skipped: {explanationProgress.skipped}</span>
                    <span className="text-red-600">Failed: {explanationProgress.failed}</span>
                  </div>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="p-3 text-center">
                      <Checkbox
                        checked={items.length > 0 && selectedQuestions.size === items.length}
                        onCheckedChange={toggleSelectAll}
                      />
                    </th>
                    <th className="p-3 text-left font-semibold text-khan-gray-dark">Subject</th>
                    <th className="p-3 text-left font-semibold text-khan-gray-dark">Section</th>
                    <th className="p-3 text-left font-semibold text-khan-gray-dark">Prompt</th>
                    <th className="p-3 text-left font-semibold text-khan-gray-dark">Choices</th>
                    <th className="p-3 text-center font-semibold text-khan-gray-dark">Answer</th>
                    <th className="p-3 text-left font-semibold text-khan-gray-dark">Explanation</th>
                    <th className="p-3 text-center font-semibold text-khan-gray-dark">Actions</th>
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
                <div className="p-8 text-center text-khan-gray-medium">
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
        <div className="max-w-xs text-xs space-y-1">
          {q.prompt_blocks.map((block, idx) => {
            if (block.type === "text") {
              return <div key={idx} className="truncate">{block.value}</div>;
            } else if (block.type === "image") {
              return (
                <div key={idx} className="group relative inline-block">
                  <img
                    src={block.url}
                    alt={`Question image ${idx + 1}`}
                    className="h-8 w-auto rounded border border-gray-300 cursor-pointer"
                  />
                  <img
                    src={block.url}
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
      <div className="max-w-xs">
        {hasImage && (
          <div className="mb-1 space-y-1">
            {q.image_urls.question.map((url, idx) => (
              <div key={idx} className="group relative inline-block">
                <img
                  src={url}
                  alt={`Question image ${idx + 1}`}
                  className="h-8 w-auto rounded border border-gray-300 cursor-pointer"
                />
                <img
                  src={url}
                  alt={`Question image ${idx + 1} enlarged`}
                  className="hidden group-hover:block absolute z-50 left-0 top-0 max-w-md w-auto max-h-96 rounded border-2 border-khan-blue shadow-lg"
                />
              </div>
            ))}
          </div>
        )}
        {hasText && <div className="truncate text-xs">{q.prompt}</div>}
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
              return (
                <div key={idx} className="group relative inline-block mr-1">
                  <img
                    src={block.url}
                    alt={`Choice ${choiceKey} image ${idx + 1}`}
                    className="h-6 w-auto rounded border border-gray-300 cursor-pointer"
                  />
                  <img
                    src={block.url}
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
            {choiceImages.map((url, idx) => (
              <div key={idx} className="group relative inline-block">
                <img
                  src={url}
                  alt={`Choice ${choiceKey} image ${idx + 1}`}
                  className="h-6 w-auto rounded border border-gray-300 cursor-pointer"
                />
                <img
                  src={url}
                  alt={`Choice ${choiceKey} image ${idx + 1} enlarged`}
                  className="hidden group-hover:block absolute z-50 left-0 top-0 max-w-md w-auto max-h-96 rounded border-2 border-khan-blue shadow-lg"
                />
              </div>
            ))}
          </div>
        )}
        {hasText && <span>{choice}</span>}
      </div>
    );
  };

  if (!edit) {
    return (
      <tr className="border-b hover:bg-gray-50">
        <td className="p-3 text-center align-top">
          <Checkbox
            checked={selected}
            onCheckedChange={onToggleSelect}
          />
        </td>
        <td className="p-3 align-top">{q.subject_code || "-"}</td>
        <td className="p-3 align-top">{q.section_code || "-"}</td>
        <td className="p-3 align-top">{renderQuestionPrompt()}</td>
        <td className="p-3 align-top">
          <div className="text-xs space-y-1">
            {(['A', 'B', 'C', 'D', 'E'] as const).map((letter) => (
              <div key={letter}>
                {letter}. {renderChoice(letter)}
              </div>
            ))}
          </div>
        </td>
        <td className="p-3 text-center align-top font-semibold">
          ({String.fromCharCode(65 + q.answerIndex)})
        </td>
        <td className="p-3 align-top max-w-xs truncate text-xs">{q.explanation || "-"}</td>
        <td className="p-3 text-center align-top">
          <div className="flex gap-2 justify-center">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setEdit(true)}
            >
              Edit
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => onDelete(q.id)}
            >
              Delete
            </Button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b bg-blue-50">
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
          className="w-full border rounded p-2 min-h-[80px]"
          value={form.prompt}
          onChange={(e) => setForm((s) => ({ ...s, prompt: e.target.value }))}
        />
      </td>
      <td className="p-2">
        <textarea
          className="w-full border rounded p-2 min-h-[80px]"
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
          className="w-full border rounded p-2 min-h-[80px]"
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