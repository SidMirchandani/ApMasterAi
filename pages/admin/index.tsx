
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
};

export default function AdminPage() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // Data
  const [items, setItems] = useState<Question[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  // New question form
  const [newQ, setNewQ] = useState({
    prompt: "",
    choicesText: "",
    answerIndex: 0,
    explanation: "",
  });

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
      (process.env.NEXT_PUBLIC_ADMIN_HINT || "").split(",").map((e) => e.trim().toLowerCase()),
    []
  );
  const isAllowed = useMemo(() => {
    if (!user?.email) return false;
    if (!process.env.NEXT_PUBLIC_ADMIN_HINT) return true; // optional hint
    return allowedEmails.includes(user.email.toLowerCase());
  }, [user, allowedEmails]);

  async function fetchPage(cursor?: string | null) {
    if (!token) return;
    const url = new URL("/api/admin/questions", window.location.origin);
    url.searchParams.set("limit", "50");
    if (cursor) url.searchParams.set("cursor", cursor);
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!cursor) {
      setItems(data.items || []);
    } else {
      setItems((prev) => [...prev, ...(data.items || [])]);
    }
    setNextCursor(data.nextCursor || null);
  }

  useEffect(() => {
    if (user && token) fetchPage(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, token]);

  async function addQuestion() {
    if (!token) return;
    const choices = newQ.choicesText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const body = {
      prompt: newQ.prompt.trim(),
      choices,
      answerIndex: Number(newQ.answerIndex),
      explanation: newQ.explanation.trim(),
    };
    const res = await fetch("/api/admin/questions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      setNewQ({ prompt: "", choicesText: "", answerIndex: 0, explanation: "" });
      fetchPage(null);
    } else {
      alert("Failed to add question");
    }
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
        <button className="mt-3 px-4 py-2 border rounded" onClick={() => signOut(auth)}>
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Questions Admin</h1>
        <div className="text-sm">
          {user.email}{" "}
          <button className="ml-3 px-3 py-1 border rounded" onClick={() => signOut(auth)}>
            Sign out
          </button>
        </div>
      </div>

      {/* Add new */}
      <div className="border p-4 rounded">
        <h2 className="font-semibold mb-3">Add Question</h2>
        <label className="block text-sm font-medium">Prompt</label>
        <textarea
          className="w-full border rounded p-2 mb-3"
          value={newQ.prompt}
          onChange={(e) => setNewQ((s) => ({ ...s, prompt: e.target.value }))}
        />
        <label className="block text-sm font-medium">Choices (one per line)</label>
        <textarea
          className="w-full border rounded p-2 mb-3"
          value={newQ.choicesText}
          onChange={(e) => setNewQ((s) => ({ ...s, choicesText: e.target.value }))}
        />
        <label className="block text-sm font-medium">Correct Choice Index (0-based)</label>
        <input
          className="border rounded p-2 mb-3 w-24"
          type="number"
          value={newQ.answerIndex}
          onChange={(e) => setNewQ((s) => ({ ...s, answerIndex: Number(e.target.value) }))}
        />
        <label className="block text-sm font-medium">Explanation</label>
        <textarea
          className="w-full border rounded p-2 mb-3"
          value={newQ.explanation}
          onChange={(e) => setNewQ((s) => ({ ...s, explanation: e.target.value }))}
        />
        <button className="px-4 py-2 border rounded" onClick={addQuestion}>
          Add
        </button>
      </div>

      {/* Table */}
      <div className="border rounded overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 text-left">Prompt</th>
              <th className="p-2 text-left">Choices</th>
              <th className="p-2">AnswerIdx</th>
              <th className="p-2 text-left">Explanation</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((q) => (
              <Row key={q.id} q={q} onSave={updateQuestion} onDelete={deleteQuestion} />
            ))}
          </tbody>
        </table>
        <div className="p-3">
          {nextCursor ? (
            <button className="px-3 py-1 border rounded" onClick={() => fetchPage(nextCursor)}>
              Load more
            </button>
          ) : (
            <span className="text-gray-500">No more</span>
          )}
        </div>
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
    prompt: q.prompt,
    choicesText: q.choices.join("\n"),
    answerIndex: q.answerIndex,
    explanation: q.explanation || "",
  });

  async function save() {
    const patch: Partial<Question> = {
      prompt: form.prompt,
      choices: form.choicesText.split("\n").map((s) => s.trim()).filter(Boolean),
      answerIndex: Number(form.answerIndex),
      explanation: form.explanation,
    };
    await onSave(q.id, patch);
    setEdit(false);
  }

  if (!edit) {
    return (
      <tr className="border-t">
        <td className="p-2 align-top">{q.prompt}</td>
        <td className="p-2 align-top">
          <ol className="list-decimal list-inside">
            {q.choices.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ol>
        </td>
        <td className="p-2 text-center align-top">{q.answerIndex}</td>
        <td className="p-2 align-top">{q.explanation}</td>
        <td className="p-2 text-center align-top">
          <button className="px-2 py-1 border rounded mr-2" onClick={() => setEdit(true)}>
            Edit
          </button>
          <button className="px-2 py-1 border rounded" onClick={() => onDelete(q.id)}>
            Delete
          </button>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-t bg-yellow-50">
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
          onChange={(e) => setForm((s) => ({ ...s, choicesText: e.target.value }))}
        />
      </td>
      <td className="p-2 text-center">
        <input
          className="border rounded p-1 w-16 text-center"
          type="number"
          value={form.answerIndex}
          onChange={(e) => setForm((s) => ({ ...s, answerIndex: Number(e.target.value) }))}
        />
      </td>
      <td className="p-2">
        <textarea
          className="w-full border rounded p-2"
          value={form.explanation}
          onChange={(e) => setForm((s) => ({ ...s, explanation: e.target.value }))}
        />
      </td>
      <td className="p-2 text-center">
        <button className="px-2 py-1 border rounded mr-2" onClick={save}>
          Save
        </button>
        <button className="px-2 py-1 border rounded" onClick={() => setEdit(false)}>
          Cancel
        </button>
      </td>
    </tr>
  );
}
