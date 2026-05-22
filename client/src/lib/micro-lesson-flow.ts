import { withQuizFromParam } from "@/lib/quiz-return";
import {
  MICRO_DRILL_ROUND_SIZE,
  MICRO_DRILL_MAX_SESSION_QUESTIONS,
} from "@/lib/micro-drill-checkpoint";

export type MicroLessonReturnFrom = "fast-path" | "study";

export function buildMicroLessonPath(params: {
  subjectId: string;
  sectionCode: string;
  unitId: string;
  from?: MicroLessonReturnFrom;
  goal?: 4 | 5;
  primer?: boolean;
}): string {
  const q = new URLSearchParams();
  q.set("subject", params.subjectId);
  q.set("section", params.sectionCode);
  q.set("unit", params.unitId);
  if (params.from) q.set("from", params.from);
  q.set("goal", String(params.goal ?? 4));
  if (params.primer === true) q.set("primer", "1");
  return `/micro-lesson?${q.toString()}`;
}

export function buildMicroLessonQuizUrl(params: {
  subjectId: string;
  unitId: string;
  goal?: 4 | 5;
  primer?: boolean;
  from?: MicroLessonReturnFrom;
}): string {
  const q = new URLSearchParams();
  q.set("subject", params.subjectId);
  q.set("unit", params.unitId);
  q.set("mode", "micro-drill");
  q.set("limit", String(MICRO_DRILL_ROUND_SIZE));
  q.set("goal", String(params.goal ?? 4));
  if (params.primer === true) q.set("primer", "1");
  const base = `/quiz?${q.toString()}`;
  return params.from ? withQuizFromParam(base, params.from) : base;
}

/** Prefer micro-lesson route for micro-drills; refreshers may skip straight to quiz. */
export function shouldRouteThroughMicroLesson(opts: {
  isRefresher: boolean;
  hasPublishedLesson: boolean;
}): boolean {
  if (opts.isRefresher) return false;
  return opts.hasPublishedLesson;
}

export { MICRO_DRILL_ROUND_SIZE, MICRO_DRILL_MAX_SESSION_QUESTIONS };
