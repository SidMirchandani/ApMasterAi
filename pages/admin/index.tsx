"use client";

import { useEffect, useMemo, useState } from "react";
import { auth } from "../../lib/firebase";
import {
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  User,
} from "firebase/auth";
import Papa from "papaparse";

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
    Papa.parse(csvFile, {
      header: true,
      complete: async (results) => {
        const rows = results.data as any[];
        console.log("Parsed CSV rows:", rows);

        const res = await fetch("/api/admin/questions/bulk", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ rows }),
        });

        if (res.ok) {
          alert("✅ Bulk upload success");
          setCsvFile(null);
          fetchFiltered();
        } else {
          alert("❌ Bulk upload failed");
        }
        setUploading(false);
      },
      error: () => {
        alert("❌ CSV parsing failed");
        setUploading(false);
      },
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
  }

  async function updateQuestion(id: string, patch: Partial<Question>) {
    if (!token) return;
    const res = await fetch(`/api/admin/questions/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(patch),
    });
    if (!res.ok) alert("Update failed");
    else fetchFiltered();
  }

  async function deleteQuestion(id: string) {
    if (!token) return;
    if (!confirm("Delete this question?")) return;
    const res = await fetch(`/api/admin/questions/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setItems((prev) => prev.filter((q) => q.id !== id));
    } else {
      alert("Delete failed");
    }
  }

  if (loading) return <div className="p-6">Loading…</div>;

  if (!user) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-bold mb-3">Admin Login</h1>
        <button
          className="px-4 py-2 border rounded"
          onClick={() => signInWithPopup(auth, googleProvider)}
        >
          Sign in with Google
        </button>
      </div>
    );
  }

  if (!isAllowed) {
    return (
      <div className="p-6">
        <p>Signed in as {user.email} but not whitelisted.</p>
        <button
          className="mt-3 px-4 py-2 border rounded"
          onClick={() => signOut(auth)}
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Questions Admin - CSV Manager</h1>
        <div className="text-sm">
          {user.email}{" "}
          <button
            className="ml-3 px-3 py-1 border rounded"
            onClick={() => signOut(auth)}
          >
            Sign out
          </button>
        </div>
      </div>

      {/* CSV Upload */}
      <div className="border p-4 rounded">
        <h2 className="font-semibold mb-3">Bulk Upload via CSV</h2>
        <div className="space-y-3">
          <div className="flex gap-3 items-center">
            <input type="file" accept=".csv" onChange={handleCSVSelect} />
            {csvFile && (
              <span className="text-sm text-gray-600">
                Selected: {csvFile.name}
              </span>
            )}
          </div>
          {csvFile && (
            <button
              className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 
                         disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors
                         shadow-md hover:shadow-lg"
              onClick={handleCSVUpload}
              disabled={uploading}
            >
              {uploading ? "Uploading..." : "📤 Upload CSV"}
            </button>
          )}
        </div>
      </div>

      {/* Filter by Subject & Section */}
      <div className="border p-4 rounded">
        <h2 className="font-semibold mb-3">Filter by Subject & Section</h2>
        <div className="flex gap-2">
          <input
            className="border p-2"
            placeholder="Subject code"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
          <input
            className="border p-2"
            placeholder="Section code"
            value={section}
            onChange={(e) => setSection(e.target.value)}
          />
          <button className="px-4 py-2 border rounded" onClick={fetchFiltered}>
            Search
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="border rounded overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 text-left">Subject</th>
              <th className="p-2 text-left">Section</th>
              <th className="p-2 text-left">Prompt</th>
              <th className="p-2 text-left">Choices</th>
              <th className="p-2">AnswerIdx</th>
              <th className="p-2 text-left">Explanation</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((q) => (
              <Row
                key={q.id}
                q={q}
                onSave={updateQuestion}
                onDelete={deleteQuestion}
              />
            ))}
          </tbody>
        </table>
        {items.length === 0 && (
          <div className="p-4 text-center text-gray-500">
            No questions found. Upload a CSV or adjust filters.
          </div>
        )}
      </div>
    </div>
  );
}

function Row({
  q,
  onSave,
  onDelete,
}: {
  q: Question;
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
      <tr className="border-t">
        <td className="p-2 align-top">{q.subject_code || "-"}</td>
        <td className="p-2 align-top">{q.section_code || "-"}</td>
        <td className="p-2 align-top">{q.prompt}</td>
        <td className="p-2 align-top">
          <ol className="list-decimal list-inside">
            {Array.isArray(q.choices) &&
              q.choices.map((c, i) => <li key={i}>{c}</li>)}
          </ol>
        </td>
        <td className="p-2 text-center align-top">{q.answerIndex}</td>
        <td className="p-2 align-top">{q.explanation}</td>
        <td className="p-2 text-center align-top">
          <button
            className="px-2 py-1 border rounded mr-2"
            onClick={() => setEdit(true)}
          >
            Update
          </button>
          <button
            className="px-2 py-1 border rounded"
            onClick={() => onDelete(q.id)}
          >
            Delete
          </button>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-t bg-yellow-50">
      <td className="p-2">
        <input
          className="w-full border rounded p-2"
          value={form.subject_code}
          onChange={(e) =>
            setForm((s) => ({ ...s, subject_code: e.target.value }))
          }
        />
      </td>
      <td className="p-2">
        <input
          className="w-full border rounded p-2"
          value={form.section_code}
          onChange={(e) =>
            setForm((s) => ({ ...s, section_code: e.target.value }))
          }
        />
      </td>
      <td className="p-2">
        <textarea
          className="w-full border rounded p-2"
          value={form.prompt}
          onChange={(e) => setForm((s) => ({ ...s, prompt: e.target.value }))}
        />
      </td>
      <td className="p-2">
        <textarea
          className="w-full border rounded p-2"
          value={form.choicesText}
          onChange={(e) =>
            setForm((s) => ({ ...s, choicesText: e.target.value }))
          }
        />
      </td>
      <td className="p-2 text-center">
        <input
          className="border rounded p-1 w-16 text-center"
          type="number"
          value={form.answerIndex}
          onChange={(e) =>
            setForm((s) => ({ ...s, answerIndex: Number(e.target.value) }))
          }
        />
      </td>
      <td className="p-2">
        <textarea
          className="w-full border rounded p-2"
          value={form.explanation}
          onChange={(e) =>
            setForm((s) => ({ ...s, explanation: e.target.value }))
          }
        />
      </td>
      <td className="p-2 text-center">
        <button className="px-2 py-1 border rounded mr-2" onClick={save}>
          Save
        </button>
        <button
          className="px-2 py-1 border rounded"
          onClick={() => setEdit(false)}
        >
          Cancel
        </button>
      </td>
    </tr>
  );
}
