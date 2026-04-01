import { useCallback, useMemo, useState } from "react";

export interface QuizEngineState {
  currentQuestionIndex: number;
  userAnswers: Record<number, string>;
  flaggedQuestions: Set<number>;
}

export interface UseQuizEngineOptions {
  initialIndex?: number;
  initialAnswers?: Record<number, string>;
  initialFlagged?: number[];
  totalQuestions: number;
}

export interface QuizEngineApi {
  state: QuizEngineState;
  currentQuestionIndex: number;
  userAnswers: Record<number, string>;
  flaggedQuestions: Set<number>;
  isFirstQuestion: boolean;
  isLastQuestion: boolean;
  setAnswer: (index: number, answer: string) => void;
  goTo: (index: number) => void;
  next: () => void;
  previous: () => void;
  toggleFlag: (index: number) => void;
}

export function useQuizEngine(options: UseQuizEngineOptions): QuizEngineApi {
  const { initialIndex = 0, initialAnswers = {}, initialFlagged = [], totalQuestions } = options;

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(initialIndex);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>(initialAnswers);
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<number>>(
    () => new Set(initialFlagged),
  );

  const setAnswer = useCallback((index: number, answer: string) => {
    setUserAnswers((prev) => ({ ...prev, [index]: answer }));
  }, []);

  const goTo = useCallback(
    (index: number) => {
      if (index < 0 || index >= totalQuestions) return;
      setCurrentQuestionIndex(index);
    },
    [totalQuestions],
  );

  const next = useCallback(() => {
    setCurrentQuestionIndex((prev) => (prev < totalQuestions - 1 ? prev + 1 : prev));
  }, [totalQuestions]);

  const previous = useCallback(() => {
    setCurrentQuestionIndex((prev) => (prev > 0 ? prev - 1 : prev));
  }, []);

  const toggleFlag = useCallback((index: number) => {
    setFlaggedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  const state: QuizEngineState = useMemo(
    () => ({
      currentQuestionIndex,
      userAnswers,
      flaggedQuestions,
    }),
    [currentQuestionIndex, userAnswers, flaggedQuestions],
  );

  return {
    state,
    currentQuestionIndex,
    userAnswers,
    flaggedQuestions,
    isFirstQuestion: currentQuestionIndex === 0,
    isLastQuestion: currentQuestionIndex === totalQuestions - 1,
    setAnswer,
    goTo,
    next,
    previous,
    toggleFlag,
  };
}

