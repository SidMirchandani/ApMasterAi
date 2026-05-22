import type FirebaseFirestore from "firebase-admin/firestore";
import type {
  MicroLessonBlock,
  MicroLessonGenerateResult,
  MicroLessonRecord,
  MicroLessonStatus,
} from "../lib/micro-lessons-types";

export const MICRO_LESSONS_COLLECTION = "micro_lessons";

export function microLessonDocId(subjectCode: string, sectionCode: string): string {
  return `${subjectCode}_${sectionCode}`.replace(/[^A-Za-z0-9_]/g, "_");
}

export function stripModelJsonObject(raw: string): string {
  let t = raw.trim();
  const fence = /^```(?:json)?\s*\n?([\s\S]*?)\n?```$/im.exec(t);
  if (fence) t = fence[1].trim();
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start >= 0 && end > start) t = t.slice(start, end + 1);
  return t.trim();
}

export function parseGeneratedMicroLesson(raw: string): MicroLessonGenerateResult | null {
  try {
    const parsed = JSON.parse(stripModelJsonObject(raw)) as Record<string, unknown>;
    const title = typeof parsed.title === "string" ? parsed.title.trim() : "";
    if (!title) return null;

    const estimatedReadMinutes =
      typeof parsed.estimatedReadMinutes === "number" && parsed.estimatedReadMinutes > 0
        ? Math.min(15, Math.round(parsed.estimatedReadMinutes))
        : 3;

    const blocksRaw = parsed.blocks;
    if (!Array.isArray(blocksRaw) || blocksRaw.length === 0) return null;

    const blocks: MicroLessonBlock[] = [];
    for (const item of blocksRaw) {
      if (!item || typeof item !== "object") continue;
      const o = item as Record<string, unknown>;
      const body = typeof o.body === "string" ? o.body.trim() : "";
      if (!body) continue;
      const heading =
        typeof o.heading === "string" && o.heading.trim() ? o.heading.trim() : undefined;
      blocks.push({ heading, body });
    }

    if (blocks.length === 0) return null;
    return { title, estimatedReadMinutes, blocks: blocks.slice(0, 6) };
  } catch {
    return null;
  }
}

export function toMicroLessonRecord(
  docId: string,
  data: FirebaseFirestore.DocumentData,
): MicroLessonRecord | null {
  if (!data || typeof data !== "object") return null;
  const blocks = Array.isArray(data.blocks) ? data.blocks : [];
  const normalizedBlocks: MicroLessonBlock[] = blocks
    .map((b: unknown) => {
      if (!b || typeof b !== "object") return null;
      const o = b as Record<string, unknown>;
      const body = typeof o.body === "string" ? o.body.trim() : "";
      if (!body) return null;
      const heading =
        typeof o.heading === "string" && o.heading.trim() ? o.heading.trim() : undefined;
      return { heading, body };
    })
    .filter((b): b is MicroLessonBlock => b != null);

  if (!data.subjectCode || !data.sectionCode || !data.title || normalizedBlocks.length === 0) {
    return null;
  }

  return {
    id: docId,
    subjectCode: String(data.subjectCode),
    sectionCode: String(data.sectionCode),
    unitId: data.unitId != null ? String(data.unitId) : undefined,
    unitNumber: typeof data.unitNumber === "number" ? data.unitNumber : undefined,
    unitName: String(data.unitName || data.title),
    title: String(data.title),
    blocks: normalizedBlocks,
    estimatedReadMinutes:
      typeof data.estimatedReadMinutes === "number" ? data.estimatedReadMinutes : 3,
    status: (data.status as MicroLessonStatus) || "published",
    model: data.model != null ? String(data.model) : undefined,
    generatedAt: data.generatedAt?.toDate?.()
      ? data.generatedAt.toDate().toISOString()
      : String(data.generatedAt || ""),
    updatedAt: data.updatedAt?.toDate?.()
      ? data.updatedAt.toDate().toISOString()
      : String(data.updatedAt || ""),
  };
}

export async function getPublishedMicroLesson(
  firestore: FirebaseFirestore.Firestore,
  subjectCode: string,
  sectionCode: string,
): Promise<MicroLessonRecord | null> {
  const docId = microLessonDocId(subjectCode, sectionCode);
  const snap = await firestore.collection(MICRO_LESSONS_COLLECTION).doc(docId).get();
  if (!snap.exists) return null;
  const record = toMicroLessonRecord(docId, snap.data()!);
  if (!record || record.status !== "published") return null;
  return record;
}
