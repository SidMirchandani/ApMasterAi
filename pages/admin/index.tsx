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
import Papa from "papaparse";
import toast, { Toaster } from "react-hot-toast";
import { BookOpen, Upload, Search, LogOut, AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { Button } from "../../client/src/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../client/src/components/ui/card";
import { Input } from "../../client/src/components/ui/input";
import { Alert, AlertDescription } from "../../client/src/components/ui/alert";
import { Checkbox } from "../../client/src/components/ui/checkbox";

const googleProvider = new GoogleAuthProvider();

type Question = {
  id: string;
  prompt: string;
  choices: string[];
  answerIndex: number;
  explanation?: string;
  tags?: string[];
  course?: string | null;
  chapter?: string | null;
  difficulty?: string | null;
  subject_code?: string;
  section_code?: string;
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

  // CSV upload state
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // ZIP import state
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // AI explanation generation state
  const [generating, setGenerating] = useState(false);

  // Checkbox selection state
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set());

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) setToken(await u.getIdToken());
      setLoading(false);
    });
    return () => unsub();
  }, []);

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

  function handleCSVSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setCsvFile(file || null);
  }

  async function handleCSVUpload() {
    if (!csvFile || !token) return;

    setUploading(true);
    const uploadPromise = new Promise(async (resolve, reject) => {
      Papa.parse(csvFile, {
        header: true,
        complete: async (results) => {
          const rows = results.data as any[];
          console.log("Parsed CSV rows:", rows);

          try {
            const res = await fetch("/api/admin/questions/bulk", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ rows }),
            });

            if (res.ok) {
              const data = await res.json();
              setCsvFile(null);
              fetchFiltered();
              resolve(data);
            } else {
              const error = await res.json();
              console.error("Upload failed:", error);
              reject(new Error(error.error || "Upload failed"));
            }
          } catch (err) {
            console.error("Upload error:", err);
            reject(err);
          } finally {
            setUploading(false);
          }
        },
        error: (err) => {
          console.error("CSV parsing error:", err);
          reject(new Error("CSV parsing failed"));
          setUploading(false);
        },
      });
    });

    toast.promise(uploadPromise, {
      loading: "Uploading questions...",
      success: (data: any) => `Successfully uploaded ${data.count} questions!`,
      error: (err) => `Upload failed: ${err.message}`,
    });
  }

  async function fetchFiltered() {
    if (!token) return;
    const res = await fetch(
      `/api/admin/questions/query?subject=${subject}&section=${section}`,
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

  async function generateExplanations() {
    if (!token || selectedQuestions.size === 0) {
      toast.error("Please select at least one question");
      return;
    }

    setGenerating(true);
    const questionIds = Array.from(selectedQuestions);

    const generatePromise = fetch("/api/generateExplanations", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}` 
      },
      body: JSON.stringify({ questionIds }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Generation failed");
        return res.json();
      })
      .then((data) => {
        fetchFiltered();
        return data;
      })
      .finally(() => {
        setGenerating(false);
      });

    toast.promise(generatePromise, {
      loading: `Generating explanations for ${questionIds.length} questions...`,
      success: (data) => `Generated ${data.updated} explanations!`,
      error: "Failed to generate explanations",
    });
  }

  async function fixText() {
    if (!token || selectedQuestions.size === 0) {
      toast.error("Please select at least one question");
      return;
    }

    setGenerating(true);
    const questionIds = Array.from(selectedQuestions);

    const fixPromise = fetch("/api/fixText", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}` 
      },
      body: JSON.stringify({ questionIds }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Fix text failed");
        return res.json();
      })
      .then((data) => {
        fetchFiltered();
        return data;
      })
      .finally(() => {
        setGenerating(false);
      });

    toast.promise(fixPromise, {
      loading: `Fixing text for ${questionIds.length} questions...`,
      success: (data) => `Fixed ${data.updated} questions!`,
      error: "Failed to fix text",
    });
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

  const deleteSelected = async () => {
    if (!confirm(`Delete ${selectedQuestions.size} questions?`)) return;
    if (!token) return;

    const idsToDelete = Array.from(selectedQuestions);

    const deletePromise = fetch("/api/admin/questions/bulk-delete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ ids: idsToDelete }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || "Delete failed");
        }
        return res.json();
      })
      .then(() => {
        setItems((prev) => prev.filter((q) => !selectedQuestions.has(q.id)));
        setSelectedQuestions(new Set());
      });

    toast.promise(deletePromise, {
      loading: `Deleting ${idsToDelete.length} questions...`,
      success: `Successfully deleted ${idsToDelete.length} questions!`,
      error: (err) => `Failed to delete: ${err.message}`,
    });
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
        {/* CSV Upload Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Bulk Upload via CSV
            </CardTitle>
            <CardDescription>Upload questions in bulk using a CSV file</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                type="file"
                accept=".csv"
                onChange={handleCSVSelect}
                className="flex-1"
              />
              {csvFile && (
                <Button
                  onClick={handleCSVUpload}
                  disabled={uploading}
                  className="bg-khan-green hover:bg-khan-green-light text-white"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {uploading ? "Uploading..." : "Upload CSV"}
                </Button>
              )}
            </div>
            {csvFile && (
              <p className="text-sm text-khan-gray-medium">
                Selected: {csvFile.name}
              </p>
            )}
          </CardContent>
        </Card>

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
              <Input
                placeholder="Subject code (e.g., APMACRO)"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="flex-1"
              />
              <Input
                placeholder="Section code (e.g., NIPD)"
                value={section}
                onChange={(e) => setSection(e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={fetchFiltered}
                className="bg-khan-blue hover:bg-khan-purple text-white"
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
              <div className="flex gap-2">
                <Button
                  onClick={generateExplanations}
                  disabled={generating || selectedQuestions.size === 0}
                  className="bg-khan-green hover:bg-khan-green-light text-white"
                >
                  {generating ? "Generating..." : `Generate Explanations (${selectedQuestions.size})`}
                </Button>
                <Button
                  onClick={fixText}
                  disabled={generating || selectedQuestions.size === 0}
                  className="bg-khan-blue hover:bg-khan-blue/90 text-white"
                >
                  {generating ? "Fixing..." : `Fix Text (${selectedQuestions.size})`}
                </Button>
                <Button
                  onClick={deleteSelected}
                  variant="destructive"
                  disabled={selectedQuestions.size === 0}
                >
                  Delete Selected ({selectedQuestions.size})
                </Button>
              </div>
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
        <td className="p-3 align-top max-w-xs truncate">{q.prompt}</td>
        <td className="p-3 align-top">
          <div className="text-xs space-y-1">
            {Array.isArray(q.choices) &&
              q.choices.map((c, i) => (
                <div key={i}>
                  {String.fromCharCode(65 + i)}. {c}
                </div>
              ))}
          </div>
        </td>
        <td className="p-3 text-center align-top font-semibold">
          ({String.fromCharCode(65 + q.answerIndex)})
        </td>
        <td className="p-3 align-top max-w-xs truncate text-xs">{q.explanation}</td>
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