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
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { BlockRenderer } from "@/components/quiz/BlockRenderer";
import { ExplanationMarkdown } from "@/components/ui/ExplanationMarkdown";
import { getDisplayChoicesAndCorrect, getDisplayExplanation } from "@/lib/mcqDisplay";
import { normalizeQuestion } from "@/lib/normalizeQuestion";
import { apiRequest } from "@/lib/api";
import { getApiCodeForSubject } from "@/subjects";
import { getPredictedAPScoreFromTests } from "@/lib/ap-score-utils";
import {
  Sparkles,
  ChevronRight,
  CheckCircle,
  XCircle,
  Loader2,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";

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

export function DiagnosticModal({ subjectId, onClose, onComplete }: Props) {
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
      // Check resume
      try {
        const res = await apiRequest("GET", `/api/user/subjects/${subjectId}/diagnostic-progress`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.data && data.data.questionIndex < TOTAL_QUESTIONS) {
            const saved = data.data;
            const restoredQuestions: DiagnosticQuestion[] = (saved.questions || []).map(normalizeQuestion);

            // Also load the pool (needed for remaining questions after resume)
            const poolRes = await apiRequest(
              "GET",
              `/api/questions/diagnostic?subject=${subjectApiCode}&mode=pool`
            );
            if (!poolRes.ok) throw new Error("Failed to load question pool");
            const poolData = await poolRes.json();
            if (!poolData.success) throw new Error(poolData.message || "Pool fetch failed");

            if (!cancelled) {
              poolRef.current = poolData.data.pool;
              // Mark already-used question IDs
              restoredQuestions.forEach((q) => { if (q.id) usedIdsRef.current.add(q.id); });

              // Rebuild section plan from distribution
              const plan = buildSectionPlan(poolData.data.distribution);

              setQuestionSequence(restoredQuestions);
              setSectionPlan(plan);
              setUnitDifficultyState(saved.unitDifficultyState || {});
              setUserAnswers(saved.userAnswers || {});
              setCurrentIndex(saved.questionIndex);
              setIsLoadingPool(false);
            }
            return;
          }
        }
      } catch {
        // No saved progress — fall through
      }

      // Fresh start: load pool
      try {
        const poolRes = await apiRequest(
          "GET",
          `/api/questions/diagnostic?subject=${subjectApiCode}&mode=pool`
        );
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
        }
      } catch (e: any) {
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

  // Handle answer selection
  const handleAnswer = useCallback((label: string) => {
    if (showFeedback || isLoadingPool || isCalculating) return;
    setSelectedAnswer(label);
    setShowFeedback(true);
  }, [showFeedback, isLoadingPool, isCalculating]);

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
      if (!nextQ) return prev; // pool exhausted for this section — will reuse
      const normalized = normalizeQuestion(nextQ);
      usedIdsRef.current.add(normalized.id);
      const updated = [...prev];
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
        setResult({
          score: r.score,
          percentage: r.percentage,
          projectedScore: r.projectedScore,
          sectionBreakdown: r.sectionBreakdown || {},
          testId: r.id,
        });
        apiRequest("DELETE", `/api/user/subjects/${subjectId}/diagnostic-progress`).catch(() => {});
        if (onComplete) onComplete(r);
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
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
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
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-10 max-w-sm w-full text-center shadow-2xl">
          <Loader2 className="mx-auto h-14 w-14 text-red-500 animate-spin mb-5" />
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
    return <DiagnosticResults result={result} subjectId={subjectId} onClose={onClose} />;
  }

  if (isLoadingPool || !currentQuestion) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-10 max-w-sm w-full text-center shadow-2xl">
          <Loader2 className="mx-auto h-12 w-12 text-red-500 animate-spin mb-4" />
          <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Loading questions…</p>
        </div>
      </div>
    );
  }

  const { choiceLabels, getChoiceBlocks, displayCorrectLabel } = getDisplayChoicesAndCorrect(
    currentQuestion as any,
    (currentQuestion as any).mcqOptionCount
  );
  const displayChoices = choiceLabels.map((label) => ({
    label,
    blocks: getChoiceBlocks(label) ?? [],
  }));
  const correctLabel = displayCorrectLabel;
  const progressPct = Math.round((currentIndex / TOTAL_QUESTIONS) * 100);
  const sectionCode = sectionPlan[currentIndex] || currentQuestion.section_code || "";
  const currentDiff = unitDifficultyState[sectionCode] || "medium";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-3 overflow-y-auto">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-2xl shadow-2xl my-4">
        {/* Header */}
        <div className="px-5 pt-5 pb-3 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-red-500" />
              <span className="font-bold text-gray-900 dark:text-white text-sm">Quick Diagnostic</span>
            </div>
            <div className="flex items-center gap-2">
              <DifficultyBadge difficulty={currentDiff} />
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                {currentIndex + 1} / {TOTAL_QUESTIONS}
              </span>
            </div>
          </div>
          <Progress value={progressPct} className="h-1.5 bg-gray-100 dark:bg-gray-800" />
        </div>

        {/* Question */}
        <div className="px-5 py-5">
          <div className="mb-5 text-gray-900 dark:text-white text-sm leading-relaxed font-medium">
            <BlockRenderer blocks={currentQuestion.prompt_blocks || [{ type: "text", value: currentQuestion.prompt || "" }]} />
          </div>

          <div className="space-y-2.5">
            {displayChoices.map(({ label, blocks }) => {
              const isSelected = selectedAnswer === label;
              const isCorrect = label === correctLabel;
              let base =
                "w-full text-left rounded-xl border-2 p-3.5 flex items-start gap-3 transition-all duration-150 ";

              if (!showFeedback) {
                if (cheatMode && isCorrect) {
                  base += "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10";
                } else if (isSelected) {
                  base += "border-red-500 bg-red-50 dark:bg-red-500/10";
                } else {
                  base += "border-gray-200 dark:border-gray-700 hover:border-red-300 dark:hover:border-red-700 hover:bg-red-50/50 dark:hover:bg-red-500/5 cursor-pointer";
                }
              } else {
                if (isCorrect) {
                  base += "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10";
                } else if (isSelected && !isCorrect) {
                  base += "border-red-500 bg-red-50 dark:bg-red-500/10";
                } else {
                  base += "border-gray-200 dark:border-gray-700 opacity-60";
                }
              }

              return (
                <button
                  key={label}
                  className={base}
                  onClick={() => handleAnswer(label)}
                  disabled={showFeedback}
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 border-2 transition-colors ${
                      showFeedback && isCorrect
                        ? "bg-emerald-500 border-emerald-500 text-white"
                        : showFeedback && isSelected && !isCorrect
                        ? "bg-red-500 border-red-500 text-white"
                        : !showFeedback && cheatMode && isCorrect
                        ? "bg-emerald-500 border-emerald-500 text-white"
                        : isSelected
                        ? "bg-red-500 border-red-500 text-white"
                        : "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400"
                    }`}
                  >
                    {label}
                  </div>
                  <div className="flex-1 text-sm text-gray-800 dark:text-gray-200 leading-snug">
                    <BlockRenderer blocks={blocks} />
                  </div>
                  {showFeedback && isCorrect && (
                    <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  )}
                  {showFeedback && isSelected && !isCorrect && (
                    <XCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                  )}
                </button>
              );
            })}
          </div>

          {showFeedback && (
            <div className={`mt-4 rounded-xl p-3.5 text-sm ${
              selectedAnswer === correctLabel
                ? "bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-800/50 text-emerald-800 dark:text-emerald-200"
                : "bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-800/50 text-red-800 dark:text-red-200"
            }`}>
              <span className="font-semibold">
                {selectedAnswer === correctLabel ? "Correct! " : `Incorrect. The answer is ${correctLabel}. `}
              </span>
              {(currentQuestion as any).explanation && (
                <span className="opacity-80 block mt-1">
                  <ExplanationMarkdown className="text-sm text-inherit prose prose-sm dark:prose-invert max-w-none">
                    {getDisplayExplanation(
                      (currentQuestion as any).explanation,
                      currentQuestion as any,
                      (currentQuestion as any).mcqOptionCount
                    )}
                  </ExplanationMarkdown>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 flex items-center justify-between gap-3 border-t border-gray-100 dark:border-gray-800 pt-4">
          <button
            onClick={onClose}
            className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            Save &amp; exit
          </button>
          <Button
            onClick={handleNext}
            disabled={!showFeedback}
            className="bg-red-600 hover:bg-red-700 text-white rounded-xl px-6 h-10 font-semibold disabled:opacity-40 flex items-center gap-2"
          >
            {currentIndex + 1 >= TOTAL_QUESTIONS ? "Finish" : "Next"}
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  const map: Record<Difficulty, string> = {
    easy: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400",
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
}: {
  result: DiagnosticResult;
  subjectId: string;
  onClose: () => void;
}) {
  const subjectApiCode = getApiCodeForSubject(subjectId) || subjectId;
  const predicted = getPredictedAPScoreFromTests(result.percentage, subjectApiCode);
  const units = Object.entries(result.sectionBreakdown).sort(
    (a, b) => a[1].percentage - b[1].percentage
  );
  const weakest = units.slice(0, 3);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-3 overflow-y-auto">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md shadow-2xl my-6">
        <div className="px-6 pt-6 pb-4 border-b border-gray-100 dark:border-gray-800 text-center">
          <Sparkles className="mx-auto h-10 w-10 text-red-500 mb-3" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Diagnostic Complete!</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Projected score is a statistical estimate based on MCQ performance.
          </p>
        </div>

        {/* Score */}
        <div className="px-6 py-5 text-center border-b border-gray-100 dark:border-gray-800">
          <div
            className="mx-auto w-20 h-20 rounded-full flex items-center justify-center text-white text-4xl font-black shadow-lg mb-2"
            style={{ backgroundColor: predicted.color }}
          >
            {predicted.score}
          </div>
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Projected AP Score</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{predicted.label}</p>
          <div className="mt-3 inline-flex items-center gap-2 bg-gray-50 dark:bg-gray-800 rounded-full px-4 py-1.5">
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
                        ? "text-emerald-600"
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

        <div className="px-6 py-4 text-center">
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
            Projected score is a statistical estimate based on MCQ performance.
          </p>
          <Button
            onClick={onClose}
            className="w-full bg-red-600 hover:bg-red-700 text-white rounded-xl h-11 font-semibold"
          >
            View Analytics
          </Button>
        </div>
      </div>
    </div>
  );
}
