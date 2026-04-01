import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import Navigation from "@/components/ui/navigation";
import { useAuth } from "@/contexts/auth-context";
import { useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { normalizeQuestions } from "@/lib/normalizeQuestion";
import { FullLengthQuiz } from "@/components/quiz/FullLengthQuiz";
import { PracticeQuiz } from "@/components/quiz/PracticeQuiz";
import { UnifiedQuizResultsReview } from "@/components/quiz/UnifiedQuizResultsReview";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

interface Question {
  id: string;
  prompt: string;
  choices: string[];
  answerIndex: number;
  explanation: string;
  subject_code?: string;
  section_code?: string;
  tags?: string[];
  image_urls?: {
    question?: string[];
    A?: string[];
    B?: string[];
    C?: string[];
    D?: string[];
    E?: string[];
  };
}

import { getApiCodeForSubject, getSectionByCode, getSectionCodeForUnit, getUnitIdForSectionCode, getSubjectByLegacyId, getSubjectByCode } from "@/subjects";
import { getDisplayCorrectLabel } from "@/lib/mcqDisplay";

// Exam configurations: questions and time per test (2026 Digital/Hybrid standards)
const EXAM_CONFIGS: { [key: string]: { questions: number; timeMinutes: number } } = {
  APLANG: { questions: 45, timeMinutes: 60 },
  APLIT: { questions: 55, timeMinutes: 60 },
  APPSYCH: { questions: 75, timeMinutes: 90 },
  APCSA: { questions: 42, timeMinutes: 90 },
  APCSP: { questions: 70, timeMinutes: 120 },
  APPHYS1: { questions: 40, timeMinutes: 80 },
  APPHYS2: { questions: 40, timeMinutes: 80 },
  APUSH: { questions: 55, timeMinutes: 55 },
  APWORLD: { questions: 55, timeMinutes: 55 },
  APEURO: { questions: 55, timeMinutes: 55 },
  APCALCAB: { questions: 45, timeMinutes: 105 },
  APCALCBC: { questions: 45, timeMinutes: 105 },
  APSTATS: { questions: 40, timeMinutes: 90 },
  APBIO: { questions: 60, timeMinutes: 90 },
  APCHEM: { questions: 60, timeMinutes: 90 },
  APMACRO: { questions: 60, timeMinutes: 70 },
  APMICRO: { questions: 60, timeMinutes: 70 },
  APGOV: { questions: 55, timeMinutes: 55 },
};

// Helper to get exam config by legacy subject ID
function getExamConfig(subjectId: string): { questions: number; timeMinutes: number } | null {
  const apiCode = getApiCodeForSubject(subjectId);
  return apiCode ? EXAM_CONFIGS[apiCode] || null : null;
}

export default function Quiz() {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { subject: subjectId, unit, limit: limitParam, primer: primerParam } = router.query;
  const primerEnabled = primerParam === "1";

  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [score, setScore] = useState(0);
  const [userAnswers, setUserAnswers] = useState<{ [key: number]: string }>({});
  const [savedExamState, setSavedExamState] = useState<any>(null);
  const [savedUnitQuizState, setSavedUnitQuizState] = useState<any>(null);
  const [showResumeDialog, setShowResumeDialog] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<number>>(new Set());
  /** Ref to hold completion payload so results view has answers on first paint (avoids stale empty userAnswers) */
  const completionPayloadRef = useRef<{ score: number; userAnswers: { [key: number]: string } } | null>(null);

  // Determine quiz type early
  const isFullLength = unit === "full-length";

  useEffect(() => {
    if (!loading && !isAuthenticated) router.push("/login");
  }, [loading, isAuthenticated, router]);

  // Timer removed - FullLengthQuiz component handles its own countdown timer

  // Warn before leaving page
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!quizCompleted && questions.length > 0 && isFullLength) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [quizCompleted, questions.length, isFullLength]);

  // When showing results, set review=1 so Navigation allows breadcrumbs and links (no lock)
  useEffect(() => {
    if (!quizCompleted || !router.isReady) return;
    const q = { ...router.query, review: "1" };
    if (router.query.review === "1") return;
    router.replace({ pathname: "/quiz", query: q }, undefined, { shallow: true });
  }, [quizCompleted, router.isReady, router.query.review]);

  // FETCH QUESTIONS
  useEffect(() => {
    const fetchQuestions = async () => {
      if (!unit || !subjectId) {
        setError("Invalid quiz parameters");
        setIsLoading(false);
        return;
      }

      try {
        const subjectApiCode = getApiCodeForSubject(subjectId as string);
        if (!subjectApiCode) {
          setError(`Quiz not yet available for ${subjectId}`);
          setIsLoading(false);
          return;
        }

        const isFullLength = unit === "full-length";

        // Check for saved exam state for full-length tests
        if (isFullLength) {
          try {
            const stateResponse = await apiRequest(
              "GET",
              `/api/user/subjects/${subjectId}/get-exam-state`,
            );
            if (stateResponse.ok) {
              const stateData = await stateResponse.json();
              if (stateData.success && stateData.data) {
                setSavedExamState(stateData.data);
                setShowResumeDialog(true);
                setIsLoading(false);
                return; // Don't fetch questions yet
              }
            }
          } catch (err) {
            console.log("No saved exam state found");
          }
        }

        if (isFullLength) {
          const examConfig = EXAM_CONFIGS[subjectApiCode];
          const questionLimit = examConfig?.questions || 60;
          const response = await apiRequest(
            "GET",
            `/api/questions?subject=${subjectApiCode}&limit=${questionLimit}`,
          );
          if (!response.ok) throw new Error("Failed to fetch questions");
          const data = await response.json();
          if (data.success && data.data?.length > 0) {
            // Shuffle all questions and select the required number
            const shuffled = [...normalizeQuestions(data.data)].sort(() => Math.random() - 0.5);
            setQuestions(shuffled.slice(0, questionLimit));
          } else {
            setError("No questions found for this subject");
          }
        } else {
          console.log("🔍 [Quiz] Practice quiz - Starting lookup:", {
            subjectId,
            unit,
            subjectApiCode
          });

          // Check if unit is already a section code (3-letter uppercase) or needs to be mapped
          let sectionCode: string | undefined;
          if (unit && /^[A-Z]{2,}$/.test(unit as string)) {
            // Already a section code (like CRD, DAT, AAP, etc.)
            sectionCode = unit as string;
            console.log("🔍 [Quiz] Unit is already a section code:", { sectionCode });
          } else {
            // Need to map unit ID to section code
            sectionCode = getSectionCodeForUnit(subjectId as string, unit as string);
            console.log("🔍 [Quiz] Unit mapping lookup result:", {
              subjectId,
              unit,
              sectionCode,
              foundMapping: !!sectionCode
            });
          }

          if (!sectionCode) {
            console.error("❌ [Quiz] No section code found for unit:", {
              subjectId,
              unit,
              message: "Check unitToSectionMap in subject index.ts file"
            });
            setError("Invalid unit");
            setIsLoading(false);
            return;
          }

          // Check for saved unit quiz state (save and exit)
          try {
            const stateResponse = await apiRequest(
              "GET",
              `/api/user/subjects/${subjectId}/unit-quiz-state?unitId=${encodeURIComponent(unit as string)}`,
            );
            if (stateResponse.ok) {
              const stateData = await stateResponse.json();
              if (stateData.success && stateData.data) {
                setSavedUnitQuizState(stateData.data);
                setShowResumeDialog(true);
                setIsLoading(false);
                return;
              }
            }
          } catch (err) {
            console.log("No saved unit quiz state found");
          }

          const limit = typeof limitParam === "string" && /^\d+$/.test(limitParam) ? Math.min(100, Math.max(1, parseInt(limitParam, 10))) : 25;
          const apiUrl = `/api/questions?subject=${subjectApiCode}&section=${sectionCode}&limit=${limit}`;
          console.log("📡 [Quiz] Fetching questions with:", {
            url: apiUrl,
            params: {
              subject_code: subjectApiCode,
              section_code: sectionCode,
              limit
            }
          });

          const response = await apiRequest("GET", apiUrl);
          if (!response.ok) {
            console.error("❌ [Quiz] API request failed:", {
              status: response.status,
              statusText: response.statusText
            });
            throw new Error("Failed to fetch");
          }

          const data = await response.json();

          // DEBUG: test_slug for study notes primer (micro drills)
          const rawQuestions = data.data || [];
          console.log("📥 [Quiz] API response received:", {
            success: data.success,
            questionCount: rawQuestions.length,
            hasData: !!data.data,
            firstQuestionKeys: rawQuestions[0] ? Object.keys(rawQuestions[0]) : [],
            test_slug_debug: rawQuestions.slice(0, 5).map((q: any, i: number) => ({
              i,
              id: q.id,
              test_slug: q.test_slug,
              test_slug_len: (q.test_slug && String(q.test_slug).length) || 0,
              has_tags: Array.isArray(q.tags),
            })),
            allSectionCodes: rawQuestions.map((q: any) => q.section_code).filter((v: any, i: number, a: any[]) => a.indexOf(v) === i)
          });

          if (data.success && data.data?.length > 0) {
            const shuffled = [...normalizeQuestions(data.data)].sort(() => Math.random() - 0.5);
            setQuestions(shuffled.slice(0, limit));
            console.log("✅ [Quiz] Questions loaded successfully:", shuffled.length);
          } else {
            console.error("❌ [Quiz] No questions found in response:", {
              requestedSubject: subjectApiCode,
              requestedSection: sectionCode,
              responseData: data
            });
            setError("No questions found");
          }
        }
      } catch (err) {
        setError("Failed to load quiz questions");
        console.error("Error fetching questions:", err);
      } finally {
        setIsLoading(false);
      }
    };

    if (isAuthenticated && unit && subjectId) fetchQuestions();
  }, [isAuthenticated, unit, subjectId, limitParam]);

  const handleExitQuiz = async () => {
    completionPayloadRef.current = null;
    // Refetch subjects and unit progress so study page shows updated Mastered status immediately
    if (subjectId) {
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
      queryClient.invalidateQueries({ queryKey: ["unitProgress", subjectId] });
      await queryClient.refetchQueries({ queryKey: ["subjects"] });
      await queryClient.refetchQueries({ queryKey: ["unitProgress", subjectId] });
    }
    router.replace(`/study?subject=${subjectId}`);
  };

  const handleSubmitFullLength = async (finalAnswers?: { [key: number]: string }) => {
    const answersToUse = finalAnswers || userAnswers;
    let correct = 0;
    questions.forEach((q, i) => {
      const userAns = answersToUse[i];
      // Ensure answerIndex is valid and convert to char code
      const correctAns = (q.answerIndex !== undefined && q.answerIndex >= 0 && q.answerIndex < 5)
        ? String.fromCharCode(65 + q.answerIndex)
        : ''; // Handle cases where answerIndex might be missing or invalid
      if (userAns === correctAns) correct++;
    });

    const percentage = questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0;

    // Save the test results
    try {
      const response = await apiRequest(
        "POST",
        `/api/user/subjects/${subjectId}/full-length-test`,
        {
          score: correct,
          percentage,
          totalQuestions: questions.length,
          questions,
          userAnswers: answersToUse,
        },
      );

      if (response.ok) {
        const data = await response.json();
        const testId = data.data?.id;

        // Clear saved exam state after submission
        try {
          await apiRequest(
            "DELETE",
            `/api/user/subjects/${subjectId}/delete-exam-state`,
          );
          setSavedExamState(null);
        } catch (deleteError) {
          console.error("Failed to clear saved exam state:", deleteError);
        }

        // Save wrong answers per unit with unit info so they appear in Review for that unit (await before redirect)
        const subject = getSubjectByLegacyId(subjectId as string) || getSubjectByCode(subjectId as string);
        const mcqOptionCount = subject?.metadata?.mcqOptionCount;
        const trackPromises: Promise<unknown>[] = [];
        questions.forEach((q, idx) => {
          const displayCorrect = getDisplayCorrectLabel(q, mcqOptionCount);
          const userAns = answersToUse[idx];
          const isCorrect = userAns === displayCorrect;
          if (!isCorrect && q.id) {
            const sectionCode = q.section_code || "";
            const unitId = getUnitIdForSectionCode(subjectId as string, sectionCode) || sectionCode || "unknown";
            const promptStr =
              q.prompt && typeof q.prompt === "string"
                ? q.prompt
                : Array.isArray(q.prompt_blocks)
                  ? q.prompt_blocks
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
                choices: q.choices,
                answerIndex: q.answerIndex,
                explanation: q.explanation,
              })
            );
          }
        });
        await Promise.all(trackPromises);

        queryClient.invalidateQueries({ queryKey: ["dueReviews", subjectId, "all"] });
        // Redirect to the full-length results page
        if (testId) {
          router.push(`/full-length-results?subject=${subjectId}&testId=${testId}`);
        } else {
          // Fallback if testId is not returned
          setScore(correct);
          setQuizCompleted(true);
        }
      } else {
        console.error("Failed to save test results, API returned not ok");
        // Fall back to showing results on the same page if save fails
        setScore(correct);
        setQuizCompleted(true);
      }
    } catch (error) {
      console.error("Failed to save test results:", error);
      // Fall back to showing results on the same page if save fails
      setScore(correct);
      setQuizCompleted(true);
    }
  };

  const handleCompletePractice = (finalScore: number, answers?: { [key: number]: string }) => {
    const answersToStore = answers ?? {};
    completionPayloadRef.current = { score: finalScore, userAnswers: answersToStore };
    if (Object.keys(answersToStore).length > 0) setUserAnswers(answersToStore);
    setScore(finalScore);
    setQuizCompleted(true);
  };

  const handleRetakeQuiz = () => {
    completionPayloadRef.current = null;
    setScore(0);
    setQuizCompleted(false);
    setUserAnswers({});
    setTimeElapsed(0);
    setFlaggedQuestions(new Set());
    setCurrentQuestionIndex(0);
    // Re-fetch questions to ensure a fresh set
    setIsLoading(true); // Show loading indicator while fetching
    const fetchFreshQuestions = async () => {
      try {
        const subjectApiCode = getApiCodeForSubject(subjectId as string);
        if (!subjectApiCode) throw new Error("Invalid subject");

        if (isFullLength) {
          const examConfig = EXAM_CONFIGS[subjectApiCode];
          const questionLimit = examConfig?.questions || 60;
          const response = await apiRequest(
            "GET",
            `/api/questions?subject=${subjectApiCode}&limit=${questionLimit}`,
          );
          if (!response.ok) throw new Error("Failed to fetch questions");
          const data = await response.json();
          if (data.success && data.data?.length > 0) {
            const shuffled = [...normalizeQuestions(data.data)].sort(() => Math.random() - 0.5);
            setQuestions(shuffled.slice(0, questionLimit));
          } else {
            setError("No questions found for this subject");
          }
        } else {
          // For practice quizzes, re-fetch based on unit
          const sectionCode = getSectionCodeForUnit(subjectId as string, unit as string);
          if (!sectionCode) {
            setError("Invalid unit");
            setIsLoading(false);
            return;
          }
          const apiUrl = `/api/questions?subject=${subjectApiCode}&section=${sectionCode}&limit=25`;
          const response = await apiRequest("GET", apiUrl);
          if (!response.ok) throw new Error("Failed to fetch");
          const data = await response.json();
          if (data.success && data.data?.length > 0) {
            const shuffled = [...normalizeQuestions(data.data)].sort(() => Math.random() - 0.5);
            setQuestions(shuffled.slice(0, 25));
          } else {
            setError("No questions found");
          }
        }
      } catch (err) {
        setError("Failed to load quiz questions");
        console.error("Error re-fetching questions:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchFreshQuestions();
  };

  const handleSaveAndExit = async (examState: any) => {
    try {
      await apiRequest(
        "POST",
        `/api/user/subjects/${subjectId}/save-exam-state`,
        { examState: { ...examState, timeElapsed } } // Include current time elapsed
      );
      if (subjectId) {
        queryClient.invalidateQueries({ queryKey: ["subjects"] });
        queryClient.invalidateQueries({ queryKey: ["unitProgress", subjectId] });
        await queryClient.refetchQueries({ queryKey: ["subjects"] });
        await queryClient.refetchQueries({ queryKey: ["unitProgress", subjectId] });
      }
      router.push(`/study?subject=${subjectId}`);
    } catch (error) {
      console.error("Failed to save exam state:", error);
      // Optionally show a user-facing error message
    }
  };

  const handleResumeExam = async () => {
    setShowResumeDialog(false);
    setIsLoading(true);

    if (savedExamState && savedExamState.timeElapsed !== undefined) {
      setTimeElapsed(savedExamState.timeElapsed);
    }

    try {
      const subjectApiCode = getApiCodeForSubject(subjectId as string);
      if (!subjectApiCode) throw new Error("Invalid subject");

      const savedQuestionIds: string[] | undefined = savedExamState?.questionIds;

      // When we have saved question IDs, fetch those exact questions by ID so resume shows the same exam
      const url =
        savedQuestionIds?.length > 0
          ? `/api/questions?subject=${subjectApiCode}&ids=${encodeURIComponent(savedQuestionIds.join(","))}`
          : `/api/questions?subject=${subjectApiCode}&limit=${EXAM_CONFIGS[subjectApiCode]?.questions || 60}`;
      const response = await apiRequest("GET", url);
      if (!response.ok) throw new Error("Failed to fetch questions");
      const data = await response.json();
      if (data.success && data.data?.length > 0) {
        setQuestions(normalizeQuestions(data.data));
      } else {
        setError("No questions found for this subject");
      }
    } catch (err) {
      setError("Failed to load quiz questions");
      console.error("Error resuming exam:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartNewExam = async () => {
    // Delete saved state
    try {
      await apiRequest(
        "DELETE",
        `/api/user/subjects/${subjectId}/delete-exam-state`,
      );
    } catch (error) {
      console.error("Failed to delete saved exam state:", error);
    }

    setSavedExamState(null);
    setShowResumeDialog(false);

    // Continue with normal flow - trigger useEffect to fetch questions
    setIsLoading(true);

    // Fetch questions
    try {
      const subjectApiCode = getApiCodeForSubject(subjectId as string);
      if (!subjectApiCode) throw new Error("Invalid subject");

      const examConfig = EXAM_CONFIGS[subjectApiCode];
      const questionLimit = examConfig?.questions || 60;
      const response = await apiRequest(
        "GET",
        `/api/questions?subject=${subjectApiCode}&limit=${questionLimit}`,
      );
      if (!response.ok) throw new Error("Failed to fetch questions");
      const data = await response.json();
      if (data.success && data.data?.length > 0) {
        setQuestions(normalizeQuestions(data.data));
      } else {
        setError("No questions found for this subject");
      }
    } catch (err) {
      setError("Failed to load quiz questions");
      console.error("Error starting new exam:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveAndExitUnit = async (unitState: { questionIds: string[]; currentQuestionIndex: number; userAnswers: { [key: number]: string }; flaggedQuestions?: number[] }) => {
    try {
      await apiRequest(
        "POST",
        `/api/user/subjects/${subjectId}/unit-quiz-state`,
        { unitId: unit, state: unitState },
      );
      if (subjectId) {
        queryClient.invalidateQueries({ queryKey: ["subjects"] });
        queryClient.invalidateQueries({ queryKey: ["unitProgress", subjectId] });
        await queryClient.refetchQueries({ queryKey: ["subjects"] });
        await queryClient.refetchQueries({ queryKey: ["unitProgress", subjectId] });
      }
    } catch (error) {
      console.error("Failed to save unit quiz state:", error);
    } finally {
      router.replace(`/study?subject=${subjectId}`);
    }
  };

  const handleResumeUnitQuiz = async () => {
    setShowResumeDialog(false);
    setIsLoading(true);
    try {
      const subjectApiCode = getApiCodeForSubject(subjectId as string);
      if (!subjectApiCode) throw new Error("Invalid subject");
      const savedQuestionIds: string[] = savedUnitQuizState?.questionIds || [];
      const url =
        savedQuestionIds.length > 0
          ? `/api/questions?subject=${subjectApiCode}&ids=${encodeURIComponent(savedQuestionIds.join(","))}`
          : `/api/questions?subject=${subjectApiCode}&section=${getSectionCodeForUnit(subjectId as string, unit as string)}&limit=25`;
      const response = await apiRequest("GET", url);
      if (!response.ok) throw new Error("Failed to fetch questions");
      const data = await response.json();
      if (data.success && data.data?.length > 0) {
        setQuestions(normalizeQuestions(data.data));
      } else {
        setError("No questions found");
      }
    } catch (err) {
      setError("Failed to load quiz questions");
      console.error("Error resuming unit quiz:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartNewUnitQuiz = async () => {
    try {
      await apiRequest(
        "DELETE",
        `/api/user/subjects/${subjectId}/unit-quiz-state?unitId=${encodeURIComponent(unit as string)}`,
      );
    } catch (error) {
      console.error("Failed to delete saved unit quiz state:", error);
    }
    setSavedUnitQuizState(null);
    setShowResumeDialog(false);
    setIsLoading(true);
    try {
      const subjectApiCode = getApiCodeForSubject(subjectId as string);
      if (!subjectApiCode) throw new Error("Invalid subject");
      const sectionCode = getSectionCodeForUnit(subjectId as string, unit as string);
      if (!sectionCode) {
        setError("Invalid unit");
        setIsLoading(false);
        return;
      }
      const apiUrl = `/api/questions?subject=${subjectApiCode}&section=${sectionCode}&limit=25`;
      const response = await apiRequest("GET", apiUrl);
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      if (data.success && data.data?.length > 0) {
        const shuffled = [...normalizeQuestions(data.data)].sort(() => Math.random() - 0.5);
        setQuestions(shuffled.slice(0, 25));
      } else {
        setError("No questions found");
      }
    } catch (err) {
      setError("Failed to load quiz questions");
      console.error("Error starting new unit quiz:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Save score for practice tests only (full-length handled in submit); clear saved unit quiz state on completion; add unit quiz to test history
  // Note: router.query can be empty in Next.js; always prefer URL params when quiz is completed so save runs.
  useEffect(() => {
    const getSubjectAndUnitFromUrl = (): { subject: string; unit: string } => {
      try {
        const search = typeof window !== "undefined" ? window.location.search : "";
        const params = new URLSearchParams(search);
        const subject = params.get("subject") ?? "";
        const unit = params.get("unit") ?? "";
        return { subject, unit };
      } catch {
        return { subject: "", unit: "" };
      }
    };

    const saveScore = async (retryCount = 0) => {
      const fromUrl = getSubjectAndUnitFromUrl();
      // When quiz is completed, prefer URL so we never miss save due to empty router.query
      const subj = quizCompleted && fromUrl.subject
        ? fromUrl.subject
        : (typeof subjectId === "string" ? subjectId : Array.isArray(subjectId) ? subjectId[0] : "") || fromUrl.subject;
      const unitStr = quizCompleted && fromUrl.unit
        ? fromUrl.unit
        : (unit != null ? (typeof unit === "string" ? unit : Array.isArray(unit) ? unit[0] : String(unit)) : "") || fromUrl.unit;

      const skip = !quizCompleted || !subj || !unitStr || unitStr === "full-length";
      console.log("[quiz saveScore] effect run", {
        quizCompleted,
        subj,
        unitStr,
        fromUrl,
        isFullLength,
        skip,
        retryCount,
      });
      if (skip) return;
      const pct = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;
      const sectionCode =
        typeof unitStr === "string" && /^[A-Z]{2,}$/.test(unitStr)
          ? unitStr
          : getSectionCodeForUnit(subj, unitStr);
      const sectionInfo = sectionCode && subj ? getSectionByCode(subj, sectionCode) : undefined;

      console.log("[quiz saveScore] starting save", {
        subj,
        unitStr,
        pct,
        sectionCode,
        retryCount,
      });

      try {
        const putRes = await apiRequest(
          "PUT",
          `/api/user/subjects/${subj}/unit-progress`,
          { unitId: unitStr, mcqScore: pct },
        );
        console.log("[quiz saveScore] unit-progress OK", putRes.status);

        const answersToSave = completionPayloadRef.current?.userAnswers ?? {};
        const postRes = await apiRequest(
          "POST",
          `/api/user/subjects/${subj}/unit-quiz-result`,
          {
            unitId: unitStr,
            sectionCode: sectionCode || unitStr,
            score,
            percentage: pct,
            totalQuestions: questions.length,
            sectionName: sectionInfo?.name,
            unitNumber: sectionInfo?.unitNumber,
            userAnswers: answersToSave,
            questions,
          },
        );
        console.log("[quiz saveScore] unit-quiz-result OK", postRes.status);

        const deleteRes = await apiRequest(
          "DELETE",
          `/api/user/subjects/${subj}/unit-quiz-state?unitId=${encodeURIComponent(unitStr)}`,
        );
        console.log("[quiz saveScore] unit-quiz-state deleted", deleteRes.status);

        setSavedUnitQuizState(null);
        queryClient.invalidateQueries({ queryKey: ["testHistory", subj] });
        queryClient.invalidateQueries({ queryKey: ["testHistory", "all"] });
      } catch (e) {
        console.error("[quiz saveScore] Failed to save practice quiz score:", e);
        toast({
          variant: "destructive",
          title: "Score not saved",
          description: "Your quiz score couldn't be saved. Your progress may not appear in Analytics or Quiz/Test History.",
        });
        if (retryCount < 1) {
          setTimeout(() => saveScore(retryCount + 1), 2000);
        }
      }
    };
    saveScore();
  }, [
    quizCompleted,
    subjectId,
    unit,
    score,
    questions.length,
    isFullLength,
    queryClient,
    toast,
    router.isReady,
  ]);

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0B0F1A]">
        <Navigation />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-khan-green"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0B0F1A]">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Error</h1>
            <p className="text-gray-600 mb-8">{error}</p>
            <Button onClick={() => router.push(`/study?subject=${subjectId}`)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Study
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (quizCompleted) {
    const resultsUserAnswers = completionPayloadRef.current?.userAnswers ?? userAnswers;
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0B0F1A]">
        <Navigation />
        <div className="container mx-auto">
          <UnifiedQuizResultsReview
            questions={questions as any}
            userAnswers={resultsUserAnswers}
            subjectId={subjectId as string}
            score={score}
            totalQuestions={questions.length}
            isFullLength={isFullLength}
            onCloseReview={handleExitQuiz}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B0F1A]">
      {isFullLength ? (
        <>
          <Navigation />
          <FullLengthQuiz
            questions={questions}
            subjectId={subjectId as string}
            timeElapsed={timeElapsed}
            onExit={handleExitQuiz}
            onSubmit={handleSubmitFullLength}
            onSaveAndExit={handleSaveAndExit}
            savedState={savedExamState}
            examConfig={getExamConfig(subjectId as string)}
            hasAppNav
          />
        </>
      ) : (
        <>
          {/* Show navigation bar for practice quizzes */}
          <Navigation />
          <PracticeQuiz
            questions={questions}
            subjectId={subjectId as string}
            timeElapsed={timeElapsed}
            onExit={handleExitQuiz}
            onComplete={handleCompletePractice}
            onSaveAndExit={handleSaveAndExitUnit}
            savedState={savedUnitQuizState}
            enableStudyNotesPrimer={!isFullLength && primerEnabled}
          />
        </>
      )}

      <AlertDialog open={showResumeDialog} onOpenChange={setShowResumeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {savedUnitQuizState ? "Resume unit quiz?" : "Resume Previous Exam?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {savedUnitQuizState
                ? "You have a saved unit quiz in progress. Would you like to continue where you left off or start a new quiz?"
                : "You have a saved exam in progress. Would you like to continue where you left off or start a new exam?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={savedUnitQuizState ? handleStartNewUnitQuiz : handleStartNewExam}>
              {savedUnitQuizState ? "Start New Quiz" : "Start New Exam"}
            </AlertDialogCancel>
            <AlertDialogAction onClick={savedUnitQuizState ? handleResumeUnitQuiz : handleResumeExam}>
              {savedUnitQuizState ? "Resume Quiz" : "Resume Exam"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}