/**
 * DiagnosticModal — 25-question adaptive diagnostic test.
 *
 * Fast preload strategy:
 *   On open, one API call fetches the full question pool per section grouped by
 *   difficulty (easy / medium / hard). All adaptive difficulty swaps are resolved
 *   client-side from the pool — zero network calls between questions.
 *
 * Adaptive step logic:
 *   Correct  + medium → next difficulty for that unit = hard
 *   Incorrect + medium → next difficulty for that unit = easy
 *   Correct  + hard   → stay hard
 *   Incorrect + easy  → stay easy
 *
 * Untagged questions default to medium.
 * If a section has no easy/hard questions, always falls back to medium → medium.
 *
 * Supports resumability via /api/user/subjects/[subjectId]/diagnostic-progress.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { ReportQuestionDialog } from "@/components/quiz/ReportQuestionDialog";
import { ExplanationPanel } from "@/components/quiz/ExplanationPanel";
import { PracticeQuizQuestionCard } from "@/components/quiz/PracticeQuizQuestionCard";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { PrettyExplanation } from "@/components/ui/PrettyExplanation";
import { getDisplayChoicesAndCorrect, getDisplayExplanation } from "@/lib/mcqDisplay";
import { normalizeQuestion } from "@/lib/normalizeQuestion";
import { apiRequest } from "@/lib/api";
import { getApiCodeForSubject, getUnitIdForSectionCode, getSubjectByLegacyId, getSubjectByCode } from "@/subjects";
import { getPredictedAPScoreFromTests } from "@/lib/ap-score-utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Loader2,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import { APScoreCircle } from "@/components/ui/APScoreCircle";

const TOTAL_QUESTIONS = 25;
type Difficulty = "easy" | "medium" | "hard";

// Pool returned from the API: per section, per difficulty bucket
type DifficultyPool = { easy: any[]; medium: any[]; hard: any[] };
type QuestionPool = Record<string, DifficultyPool>;

interface DiagnosticQuestion {
  id: string;
  section_code?: string;
  prompt_blocks?: any[];
  prompt?: string;
  choices?: any;
  answerIndex?: number;
  difficulty?: string;
  tags?: string[];
}

interface DiagnosticResult {
  score: number;
  percentage: number;
  projectedScore: number;
  sectionBreakdown: Record<string, { name: string; correct: number; total: number; percentage: number }>;
  testId: string;
}

interface Props {
  subjectId: string;
  onClose: () => void;
  onComplete?: (result: DiagnosticResult) => void;
  onContinuePractice?: () => void;
}

function adaptDifficulty(prev: Difficulty, wasCorrect: boolean): Difficulty {
  if (prev === "medium") return wasCorrect ? "hard" : "easy";
  if (prev === "hard")   return "hard";
  if (prev === "easy")   return "easy";
  return "medium";
}

/**
 * Pick a question from the pool for the given section + difficulty.
 * Falls back gracefully:
 *   1. Exact difficulty match (not yet used)
 *   2. Any question from the same section (not yet used)
 *   3. null (section exhausted — caller will reuse)
 */
function pickFromPool(
  pool: QuestionPool,
  sectionCode: string,
  difficulty: Difficulty,
  usedIds: Set<string>
): DiagnosticQuestion | null {
  const section = pool[sectionCode];
  if (!section) return null;

  // Try exact difficulty first
  const exactBucket = section[difficulty].filter((q) => !usedIds.has(q.id));
  if (exactBucket.length > 0) {
    return exactBucket[Math.floor(Math.random() * exactBucket.length)];
  }

  // Fall back to any question in the section (handles all-medium pools)
  const allInSection = [
    ...section.easy,
    ...section.medium,
    ...section.hard,
  ].filter((q) => !usedIds.has(q.id));
  if (allInSection.length > 0) {
    return allInSection[Math.floor(Math.random() * allInSection.length)];
  }

  return null;
}

export function DiagnosticModal({ subjectId, onClose, onComplete, onContinuePractice }: Props) {
  const subjectApiCode = getApiCodeForSubject(subjectId) || subjectId;

  // The distribution plan: [sectionCode, sectionCode, ...] length = TOTAL_QUESTIONS
  // Each slot = which section that question slot belongs to
  const [sectionPlan, setSectionPlan] = useState<string[]>([]);

  // Already-resolved questions (grows as user answers)
  const [questionSequence, setQuestionSequence] = useState<DiagnosticQuestion[]>([]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [unitDifficultyState, setUnitDifficultyState] = useState<Record<string, Difficulty>>({});
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isLoadingPool, setIsLoadingPool] = useState(true);
  const [isCalculating, setIsCalculating] = useState(false);
  const [result, setResult] = useState<DiagnosticResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cheatMode, setCheatMode] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("adminCheatMode");
    setCheatMode(saved === "true");
  }, []);

  // Pool is stored in a ref — immutable after load, never triggers re-render
  const poolRef = useRef<QuestionPool | null>(null);
  const usedIdsRef = useRef<Set<string>>(new Set());
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The current question is always questionSequence[currentIndex]
  const currentQuestion = questionSequence[currentIndex] ?? null;

  // Build section plan from distribution: e.g. { U1:5, U2:8 } → ["U1","U1","U1","U1","U1","U2",...]
  function buildSectionPlan(distribution: Record<string, number>): string[] {
    const slots: string[] = [];
    for (const [code, count] of Object.entries(distribution)) {
      for (let i = 0; i < count; i++) slots.push(code);
    }
    // Shuffle so questions from different sections are interleaved
    return slots.sort(() => Math.random() - 0.5);
  }

  // Pick the next question for slot `index` using the current difficulty state
  function resolveQuestion(
    index: number,
    plan: string[],
    diffState: Record<string, Difficulty>,
    existingSequence: DiagnosticQuestion[]
  ): DiagnosticQuestion | null {
    if (!poolRef.current) return null;
    if (existingSequence[index]) return existingSequence[index];
    const sectionCode = plan[index];
    if (!sectionCode) return null;
    const difficulty = diffState[sectionCode] || "medium";
    return pickFromPool(poolRef.current, sectionCode, difficulty, usedIdsRef.current);
  }

  // Step 1: Check for saved progress, otherwise load pool
  useEffect(() => {
    let cancelled = false;

    async function init() {
      // #region agent log
      fetch('http://127.0.0.1:7495/ingest/9e6d0451-2aaf-4679-a4b6-ab9d4ffddacc',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'20f80a'},body:JSON.stringify({sessionId:'20f80a',location:'DiagnosticModal.tsx:init:start',message:'init started',data:{subjectId,subjectApiCode},hypothesisId:'D',timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      // Check resume
      try {
        const res = await apiRequest("GET", `/api/user/subjects/${subjectId}/diagnostic-progress`);
        // #region agent log
        fetch('http://127.0.0.1:7495/ingest/9e6d0451-2aaf-4679-a4b6-ab9d4ffddacc',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'20f80a'},body:JSON.stringify({sessionId:'20f80a',location:'DiagnosticModal.tsx:after-progress',message:'diagnostic-progress response',data:{ok:res.ok,status:res.status},hypothesisId:'A',timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.data && data.data.questionIndex < TOTAL_QUESTIONS) {
            const saved = data.data;
            const restoredQuestions: DiagnosticQuestion[] = (saved.questions || []).map(normalizeQuestion);
            // #region agent log
            fetch('http://127.0.0.1:7495/ingest/9e6d0451-2aaf-4679-a4b6-ab9d4ffddacc',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'20f80a'},body:JSON.stringify({sessionId:'20f80a',location:'DiagnosticModal.tsx:resume-state',message:'resume state snapshot',data:{questionIndex:saved.questionIndex,restoredLen:restoredQuestions.length},hypothesisId:'F',timestamp:Date.now()})}).catch(()=>{});
            // #endregion

            // Also load the pool (needed for remaining questions after resume)
            const poolRes = await apiRequest(
              "GET",
              `/api/questions/diagnostic?subject=${subjectApiCode}&mode=pool`
            );
            if (!poolRes.ok) throw new Error("Failed to load question pool");
            const poolData = await poolRes.json();
            if (!poolData.success) throw new Error(poolData.message || "Pool fetch failed");
            // #region agent log
            fetch('http://127.0.0.1:7495/ingest/9e6d0451-2aaf-4679-a4b6-ab9d4ffddacc',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'20f80a'},body:JSON.stringify({sessionId:'20f80a',location:'DiagnosticModal.tsx:pool-resume',message:'pool loaded (resume path)',data:{success:poolData.success,restoredLen:restoredQuestions.length},hypothesisId:'B',timestamp:Date.now()})}).catch(()=>{});
            // #endregion
            if (!cancelled) {
              poolRef.current = poolData.data.pool;
              const plan = buildSectionPlan(poolData.data.distribution);

              // If saved progress has no question bodies, we can't show current question — show first question from pool so UI isn't stuck
              if (restoredQuestions.length === 0) {
                const firstQuestion = resolveQuestion(0, plan, saved.unitDifficultyState || {}, []);
                if (firstQuestion) {
                  const normalized = normalizeQuestion(firstQuestion);
                  usedIdsRef.current.add(normalized.id);
                  setQuestionSequence([normalized]);
                  setSectionPlan(plan);
                  setUnitDifficultyState(saved.unitDifficultyState || {});
                  setUserAnswers(saved.userAnswers || {});
                  setCurrentIndex(0);
                } else {
                  setError("No questions available for this diagnostic.");
                }
                setSectionPlan(plan);
                setIsLoadingPool(false);
              } else {
                restoredQuestions.forEach((q) => { if (q.id) usedIdsRef.current.add(q.id); });

                const totalRestored = restoredQuestions.length;
                let resumeIndex = typeof saved.questionIndex === "number" ? saved.questionIndex : 0;

                // If backend stored the next index (equal to length), resolve the next question from pool
                if (resumeIndex >= totalRestored) {
                  const nextIndex = totalRestored;
                  const nextQuestion = resolveQuestion(nextIndex, plan, saved.unitDifficultyState || {}, restoredQuestions);
                  if (nextQuestion) {
                    const normalizedNext = normalizeQuestion(nextQuestion);
                    usedIdsRef.current.add(normalizedNext.id);
                    const seq = [...restoredQuestions, normalizedNext];
                    setQuestionSequence(seq);
                    setSectionPlan(plan);
                    setUnitDifficultyState(saved.unitDifficultyState || {});
                    setUserAnswers(saved.userAnswers || {});
                    setCurrentIndex(nextIndex);
                  } else {
                    // Fall back to last available restored question
                    setQuestionSequence(restoredQuestions);
                    setSectionPlan(plan);
                    setUnitDifficultyState(saved.unitDifficultyState || {});
                    setUserAnswers(saved.userAnswers || {});
                    setCurrentIndex(Math.max(0, totalRestored - 1));
                  }
                } else {
                  setQuestionSequence(restoredQuestions);
                  setSectionPlan(plan);
                  setUnitDifficultyState(saved.unitDifficultyState || {});
                  setUserAnswers(saved.userAnswers || {});
                  setCurrentIndex(resumeIndex);
                }

                setIsLoadingPool(false);
              }
            }
            return;
          }
        }
      } catch (e) {
        // #region agent log
        fetch('http://127.0.0.1:7495/ingest/9e6d0451-2aaf-4679-a4b6-ab9d4ffddacc',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'20f80a'},body:JSON.stringify({sessionId:'20f80a',location:'DiagnosticModal.tsx:progress-catch',message:'progress check failed or no resume',data:{err:String(e)},hypothesisId:'C',timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        // No saved progress — fall through
      }

      // Fresh start: load pool
      try {
        const poolRes = await apiRequest(
          "GET",
          `/api/questions/diagnostic?subject=${subjectApiCode}&mode=pool`
        );
        // #region agent log
        fetch('http://127.0.0.1:7495/ingest/9e6d0451-2aaf-4679-a4b6-ab9d4ffddacc',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'20f80a'},body:JSON.stringify({sessionId:'20f80a',location:'DiagnosticModal.tsx:pool-fresh',message:'pool response (fresh)',data:{ok:poolRes.ok,status:poolRes.status},hypothesisId:'A',timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        if (!poolRes.ok) throw new Error("Failed to load question pool");
        const poolData = await poolRes.json();
        if (!poolData.success) throw new Error(poolData.message || "Pool fetch failed");

        if (!cancelled) {
          poolRef.current = poolData.data.pool;
          const plan = buildSectionPlan(poolData.data.distribution);
          setSectionPlan(plan);

          // Pre-pick the first question immediately
          const firstQuestion = resolveQuestion(0, plan, {}, []);
          if (firstQuestion) {
            const normalized = normalizeQuestion(firstQuestion);
            usedIdsRef.current.add(normalized.id);
            setQuestionSequence([normalized]);
          }

          setIsLoadingPool(false);
          // #region agent log
          fetch('http://127.0.0.1:7495/ingest/9e6d0451-2aaf-4679-a4b6-ab9d4ffddacc',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'20f80a'},body:JSON.stringify({sessionId:'20f80a',location:'DiagnosticModal.tsx:loading-false',message:'setIsLoadingPool(false)',data:{},hypothesisId:'D',timestamp:Date.now()})}).catch(()=>{});
          // #endregion
        }
      } catch (e: any) {
        // #region agent log
        fetch('http://127.0.0.1:7495/ingest/9e6d0451-2aaf-4679-a4b6-ab9d4ffddacc',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'20f80a'},body:JSON.stringify({sessionId:'20f80a',location:'DiagnosticModal.tsx:pool-catch',message:'pool fetch error',data:{err:String(e?.message||e)},hypothesisId:'E',timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        if (!cancelled) setError(e.message || "Failed to load diagnostic questions.");
      }
    }

    init();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectId, subjectApiCode]);

  // Auto-save progress
  const saveProgress = useCallback(() => {
    if (isLoadingPool || currentIndex >= TOTAL_QUESTIONS) return;
    apiRequest("POST", `/api/user/subjects/${subjectId}/diagnostic-progress`, {
      questionIndex: currentIndex,
      userAnswers,
      unitDifficultyState,
      questions: questionSequence,
    }).catch(() => {});
  }, [subjectId, currentIndex, userAnswers, unitDifficultyState, questionSequence, isLoadingPool]);

  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(saveProgress, 3000);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [saveProgress]);

  // Handle answer selection (only select; submit is explicit via handleSubmit)
  const handleAnswerSelect = useCallback((label: string) => {
    if (showFeedback || isLoadingPool || isCalculating) return;
    setSelectedAnswer(label);
  }, [showFeedback, isLoadingPool, isCalculating]);

  // Submit answer to show feedback (same behavior as unit-wise MCQ)
  const handleSubmit = useCallback(() => {
    if (!selectedAnswer || showFeedback) return;
    setShowFeedback(true);
  }, [selectedAnswer, showFeedback]);

  // Handle going back to the previous question (navigation only — answers unchanged)
  const handleBack = useCallback(() => {
    if (currentIndex === 0) return;
    const prevIndex = currentIndex - 1;
    const prevAnswer = userAnswers[prevIndex] ?? null;
    setCurrentIndex(prevIndex);
    setSelectedAnswer(prevAnswer);
    setShowFeedback(prevAnswer !== null);
  }, [currentIndex, userAnswers]);

  // Handle moving to next question — purely synchronous pool pick
  const handleNext = useCallback(() => {
    if (!currentQuestion || !selectedAnswer || !showFeedback) return;

    const { displayCorrectLabel } = getDisplayChoicesAndCorrect(
      currentQuestion as any,
      (currentQuestion as any).mcqOptionCount
    );
    const wasCorrect = selectedAnswer === displayCorrectLabel;

    const sectionCode = sectionPlan[currentIndex] || currentQuestion.section_code || "unknown";
    const prevDiff = unitDifficultyState[sectionCode] || "medium";
    const newDiff = adaptDifficulty(prevDiff, wasCorrect);

    const newAnswers = { ...userAnswers, [currentIndex]: selectedAnswer };
    const newDiffState = { ...unitDifficultyState, [sectionCode]: newDiff };

    setUserAnswers(newAnswers);
    setUnitDifficultyState(newDiffState);
    setSelectedAnswer(null);
    setShowFeedback(false);

    const nextIndex = currentIndex + 1;

    if (nextIndex >= TOTAL_QUESTIONS) {
      setIsCalculating(true);
      submitDiagnostic(newAnswers, questionSequence);
      return;
    }

    // Resolve next question from pool (synchronous — no network call)
    setQuestionSequence((prev) => {
      if (prev[nextIndex]) return prev; // already resolved (e.g. resume)
      const nextQ = resolveQuestion(nextIndex, sectionPlan, newDiffState, prev);
      const updated = [...prev];
      if (!nextQ) {
        // Pool exhausted for this section — reuse current question so UI has something to show and doesn't get stuck
        const currentQ = prev[currentIndex];
        if (currentQ) updated[nextIndex] = currentQ;
        return updated;
      }
      const normalized = normalizeQuestion(nextQ);
      usedIdsRef.current.add(normalized.id);
      updated[nextIndex] = normalized;
      return updated;
    });

    setCurrentIndex(nextIndex);
  // resolveQuestion uses refs (poolRef, usedIdsRef) so safe to omit
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    currentQuestion, selectedAnswer, showFeedback, currentIndex,
    sectionPlan, unitDifficultyState, userAnswers, questionSequence,
  ]);

  async function submitDiagnostic(
    answers: Record<number, string>,
    questions: DiagnosticQuestion[]
  ) {
    try {
      const res = await apiRequest(
        "POST",
        `/api/user/subjects/${subjectId}/diagnostic-test`,
        { questions, userAnswers: answers }
      );
      const data = await res.json();
      if (data.success && data.data) {
        const r = data.data;
        // Save wrong answers per unit only when entire diagnostic is complete (not mid-way)
        const subject = getSubjectByLegacyId(subjectId) || getSubjectByCode(subjectId);
        const mcqOptionCount = subject?.metadata?.mcqOptionCount;
        const trackPromises: Promise<unknown>[] = [];
        questions.forEach((q, idx) => {
          const userAnswer = answers[idx];
          const { displayCorrectLabel } = getDisplayChoicesAndCorrect(q as any, mcqOptionCount);
          const isCorrect = userAnswer === displayCorrectLabel;
          if (!isCorrect && q.id) {
            const sectionCode = q.section_code || "";
            const unitId = getUnitIdForSectionCode(subjectId, sectionCode) || sectionCode || "unknown";
            const promptStr =
              (q as any).prompt && typeof (q as any).prompt === "string"
                ? (q as any).prompt
                : Array.isArray((q as any).prompt_blocks)
                  ? (q as any).prompt_blocks
                      .filter((b: any) => b?.type === "text" && b.value != null)
                      .map((b: any) => String(b.value))
                      .join(" ")
                      .trim() || undefined
                  : undefined;
            trackPromises.push(
              apiRequest("POST", "/api/user/questions/track", {
                questionId: q.id,
                subjectId,
                unitId,
                correct: false,
                timeSpentSec: 0,
                sectionCode,
                prompt: promptStr,
                choices: (q as any).choices,
                answerIndex: (q as any).answerIndex,
                explanation: (q as any).explanation,
              })
            );
          }
        });
        await Promise.all(trackPromises);
        apiRequest("DELETE", `/api/user/subjects/${subjectId}/diagnostic-progress`).catch(() => {});
        setResult({
          score: r.score,
          percentage: r.percentage,
          projectedScore: r.projectedScore,
          sectionBreakdown: r.sectionBreakdown || {},
          testId: r.id,
        });
        if (onComplete) onComplete(r); // cache invalidation side-effect only — navigation handled by onContinuePractice
      } else {
        setError("Failed to save your results. Please try again.");
      }
    } catch {
      setError("Network error saving results. Please try again.");
    } finally {
      setIsCalculating(false);
    }
  }

  // --- Render ---

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0B0F1A] flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-900/70 rounded-xl border border-slate-200 dark:border-slate-800 p-8 max-w-md w-full text-center shadow-sm">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Something went wrong</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">{error}</p>
          <Button onClick={onClose} className="bg-red-600 hover:bg-red-700 text-white w-full rounded-xl">
            Close
          </Button>
        </div>
      </div>
    );
  }

  if (isCalculating) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0B0F1A] flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-900/70 rounded-xl border border-slate-200 dark:border-slate-800 p-10 max-w-sm w-full text-center shadow-sm">
          <Loader2 className="mx-auto h-14 w-14 text-blue-500 animate-spin mb-5" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Calculating your results…
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Analyzing your performance across all units.
          </p>
        </div>
      </div>
    );
  }

  if (result) {
    return (
      <DiagnosticResults
        result={result}
        subjectId={subjectId}
        onClose={onClose}
        onContinuePractice={onContinuePractice}
      />
    );
  }

  if (isLoadingPool || !currentQuestion) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0B0F1A] flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-900/70 rounded-xl border border-slate-200 dark:border-slate-800 p-10 max-w-sm w-full text-center shadow-sm">
          <Loader2 className="mx-auto h-12 w-12 text-blue-500 animate-spin mb-4" />
          <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Loading questions…</p>
        </div>
      </div>
    );
  }

  const subject = getSubjectByLegacyId(subjectId) || getSubjectByCode(subjectId);
  const mcqOptionCount = subject?.metadata?.mcqOptionCount;
  const { displayCorrectLabel: correctLabel } = getDisplayChoicesAndCorrect(
    currentQuestion as any,
    mcqOptionCount
  );
  const progressPct = Math.round((currentIndex / TOTAL_QUESTIONS) * 100);
  const sectionCode = sectionPlan[currentIndex] || currentQuestion.section_code || "";
  const currentDiff = unitDifficultyState[sectionCode] || "medium";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B0F1A] flex flex-col text-gray-900 dark:text-gray-100">
      {/* Scrollable content area with bottom padding for fixed bar */}
      <div className="flex-1 overflow-y-auto pb-14">
        <div className="max-w-6xl mx-auto px-2 sm:px-3 py-2">
          <div className="flex flex-col md:flex-row gap-3 md:gap-4 md:items-stretch">
            {/* Question: left on desktop, top on narrow screens */}
            <div className="order-1 flex-1 min-w-0 space-y-2">
              {/* Header card */}
              <div className="bg-white dark:bg-slate-900/70 rounded-xl border border-slate-200 dark:border-slate-800 px-3 pt-3 pb-2.5 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-blue-500" />
                    <span className="font-bold text-gray-900 dark:text-white text-xs">Quick Diagnostic</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DifficultyBadge difficulty={currentDiff} />
                    <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                      {currentIndex + 1} / {TOTAL_QUESTIONS}
                    </span>
                  </div>
                </div>
                <Progress value={progressPct} className="h-1 bg-slate-100 dark:bg-slate-800" />
              </div>

              {/* Question card — same interface as unit-wise MCQ (cross-out, styling) */}
              <PracticeQuizQuestionCard
                question={currentQuestion as any}
                questionNumber={currentIndex + 1}
                totalQuestions={TOTAL_QUESTIONS}
                selectedAnswer={selectedAnswer}
                onAnswerSelect={handleAnswerSelect}
                isAnswerSubmitted={showFeedback}
                cheatMode={cheatMode}
                mcqOptionCount={mcqOptionCount}
              />
            </div>
            {/* Explanation: right on desktop, below on narrow screens */}
            <div className="order-2 w-full md:w-[35%] md:min-w-0 flex flex-col">
              <ExplanationPanel
                hasAnswered={showFeedback}
                isCorrect={selectedAnswer === correctLabel}
              >
                {showFeedback && (
                  <>
                    <span className="text-xs font-semibold block mb-1">
                      {selectedAnswer === correctLabel ? "Correct! " : `Incorrect. The answer is ${correctLabel}. `}
                    </span>
                    {(currentQuestion as any).explanation && (
                      <PrettyExplanation className="text-xs text-inherit prose prose-sm dark:prose-invert max-w-none">
                        {getDisplayExplanation(
                        (currentQuestion as any).explanation,
                        currentQuestion as any,
                        mcqOptionCount
                      )}
                      </PrettyExplanation>
                    )}
                  </>
                )}
              </ExplanationPanel>
            </div>
          </div>
        </div>
      </div>

      {/* Fixed Bottom Bar — aligned with quiz (max-w-6xl), Submit/Next in center */}
      <div className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 fixed bottom-0 left-0 right-0 z-50">
        <div className="max-w-6xl mx-auto px-2 sm:px-3 py-2.5">
          <div className="flex justify-between items-center gap-2 sm:gap-4">
            <div className="flex flex-1 items-center min-w-0">
              <Button
                variant="outline"
                size="sm"
                onClick={handleBack}
                disabled={currentIndex === 0}
                className="border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 disabled:opacity-30 rounded-xl shrink-0"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
            </div>
            <div className="flex justify-center items-center flex-shrink-0">
              {!showFeedback ? (
                <Button
                  onClick={handleSubmit}
                  disabled={!selectedAnswer}
                  className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 px-5 py-2 text-xs font-medium text-white border-none shadow-none rounded-xl disabled:opacity-50"
                >
                  Submit
                </Button>
              ) : (
                <Button
                  onClick={handleNext}
                  className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 px-5 py-2 text-xs font-medium text-white border-none shadow-none rounded-xl flex items-center gap-2"
                >
                  {currentIndex + 1 >= TOTAL_QUESTIONS ? "Finish" : "Next"}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              )}
            </div>
            <div className="flex justify-end flex-1 items-center gap-2 min-w-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowReportDialog(true)}
                className="border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 text-xs"
              >
                Report
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowExitDialog(true)}
                className="border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 text-xs"
              >
                Save &amp; Exit
              </Button>
            </div>
          </div>
        </div>
      </div>

      <ReportQuestionDialog
        open={showReportDialog}
        onOpenChange={setShowReportDialog}
        questionId={currentQuestion?.id}
        subjectId={subjectId}
      />

      {/* Exit Confirmation Dialog */}
      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Exit the Diagnostic?</AlertDialogTitle>
            <AlertDialogDescription>
              Your progress will be saved and you can continue this diagnostic later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { saveProgress(); onClose(); }}>
              Save and Exit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  const map: Record<Difficulty, string> = {
    easy: "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400",
    medium: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400",
    hard: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400",
  };
  return (
    <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${map[difficulty]}`}>
      {difficulty}
    </span>
  );
}

function DiagnosticResults({
  result,
  subjectId,
  onClose,
  onContinuePractice,
}: {
  result: DiagnosticResult;
  subjectId: string;
  onClose: () => void;
  onContinuePractice?: () => void;
}) {
  const subjectApiCode = getApiCodeForSubject(subjectId) || subjectId;
  const predicted = getPredictedAPScoreFromTests(result.percentage, subjectApiCode);
  const units = Object.entries(result.sectionBreakdown).sort(
    (a, b) => a[1].percentage - b[1].percentage
  );
  const weakest = units.slice(0, 3);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B0F1A] flex items-start justify-center p-3 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900/70 rounded-xl border border-slate-200 dark:border-slate-800 w-full max-w-md shadow-sm my-6">
        <div className="px-6 pt-6 pb-4 border-b border-gray-100 dark:border-gray-800 text-center">
          <Sparkles className="mx-auto h-10 w-10 text-red-500 mb-3" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Diagnostic Complete!</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Projected score is a statistical estimate based on MCQ performance.
          </p>
        </div>

        {/* Score */}
        <div className="px-6 py-5 text-center border-b border-gray-100 dark:border-gray-800">
          <div className="mx-auto mb-2 flex justify-center">
            <APScoreCircle score={predicted.score} color={predicted.color} size="lg" className="shadow-lg font-black" />
          </div>
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Projected AP Score</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{predicted.label}</p>
          <div className="mt-3 inline-flex items-center gap-2 bg-slate-50 dark:bg-slate-800 rounded-full px-4 py-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-gray-500" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {result.score}/{TOTAL_QUESTIONS} correct &nbsp;·&nbsp; {result.percentage}%
            </span>
          </div>
        </div>

        {/* Weakest units */}
        {weakest.length > 0 && (
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
              Focus Areas
            </p>
            <div className="space-y-2">
              {weakest.map(([code, section]) => (
                <div key={code} className="flex items-center justify-between">
                  <span className="text-sm text-gray-800 dark:text-gray-200 truncate flex-1">
                    {section.name || code}
                  </span>
                  <span
                    className={`text-xs font-bold ml-3 flex-shrink-0 ${
                      section.percentage >= 70
                        ? "text-green-600"
                        : section.percentage >= 50
                        ? "text-amber-600"
                        : "text-red-600"
                    }`}
                  >
                    {section.percentage}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="px-6 py-4">
          <Button
            onClick={onContinuePractice ?? onClose}
            className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-xl h-11 font-semibold flex items-center justify-center gap-2 group"
          >
            Continue Practice
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Button>
        </div>
      </div>
    </div>
  );
}
