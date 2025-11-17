
import { useState, useEffect } from "react";
import { QuizHeader } from "./QuizHeader";
import { QuizBottomBar } from "./QuizBottomBar";
import { EnhancedQuestionPalette } from "./EnhancedQuestionPalette";
import { SubmitConfirmDialog } from "./SubmitConfirmDialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { QuizReviewPage } from "./QuizReviewPage";
import { useRouter } from "next/router";
import { apiRequest } from "@/lib/queryClient";
import { BlockRenderer } from "./BlockRenderer";
import { Flag } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface Question {
  id: string;
  question_id?: number;
  subject_code?: string;
  section_code?: string;
  prompt_blocks: any[];
  choices: Record<"A" | "B" | "C" | "D" | "E", any[]>;
  answerIndex: number;
  correct_answer?: string;
  explanation?: string;
  prompt?: string;
  image_urls?: {
    question?: string[];
    A?: string[];
    B?: string[];
    C?: string[];
    D?: string[];
    E?: string[];
  };
}

interface FullLengthQuizProps {
  questions: Question[];
  subjectId: string;
  timeElapsed: number;
  onExit: () => void;
  onSubmit: (answers?: { [key: number]: string }) => void;
  onSaveAndExit: (state: any) => void;
  savedState?: any;
}

export function FullLengthQuiz({ questions, subjectId, timeElapsed, onExit, onSubmit, onSaveAndExit, savedState }: FullLengthQuizProps) {
  const router = useRouter();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(savedState?.currentQuestionIndex || 0);
  const [userAnswers, setUserAnswers] = useState<{ [key: number]: string }>(savedState?.userAnswers || {});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<number>>(new Set(savedState?.flaggedQuestions || []));
  const [showQuestionPalette, setShowQuestionPalette] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [timerHidden, setTimerHidden] = useState(false);
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDirections, setShowDirections] = useState(true);

  // Subject-specific directions
  const getExamDirections = () => {
    const subjectKey = subjectId?.toString().toLowerCase();

    if (subjectKey === 'macroeconomics') {
      return {
        title: 'AP® Macroeconomics Practice Exam',
        sections: [
          {
            title: 'Section I: Multiple Choice',
            details: '60 Questions | 1 Hour 10 Minutes | 66% of Exam Score',
            description: 'Questions require the use of economics content knowledge and reasoning across the range of course topics and skills in skill categories 1, 2, and 3.'
          }
        ],
        units: [
          { name: 'Unit 1: Basic Economic Concepts', weight: '5-10%' },
          { name: 'Unit 2: Economic Indicators and the Business Cycle', weight: '12-17%' },
          { name: 'Unit 3: National Income and Price Determination', weight: '17-27%' },
          { name: 'Unit 4: Financial Sector', weight: '18-23%' },
          { name: 'Unit 5: Long-Run Consequences of Stabilization Policies', weight: '20-30%' },
          { name: 'Unit 6: Open Economy—International Trade and Finance', weight: '10-13%' }
        ]
      };
    } else if (subjectKey === 'computer-science-principles') {
      return {
        title: 'AP® Computer Science Principles Practice Exam',
        sections: [
          {
            title: 'Section I: End-of-Course Multiple-Choice Exam',
            details: '70 multiple-choice questions | 120 minutes | 70% of score | 4 answer options',
            description: ''
          }
        ],
        breakdown: [
          '57 single-select multiple-choice',
          '5 single-select with reading passage about a computing innovation',
          '8 multiple-select multiple-choice: select 2 answers'
        ],
        bigIdeas: [
          { name: 'Big Idea 1: Creative Development', weight: '10-13%' },
          { name: 'Big Idea 2: Data', weight: '17-22%' },
          { name: 'Big Idea 3: Algorithms and Programming', weight: '30-35%' },
          { name: 'Big Idea 4: Computer Systems and Networks', weight: '11-15%' },
          { name: 'Big Idea 5: Impact of Computing', weight: '21-26%' }
        ]
      };
    }

    return {
      title: 'Practice Exam Directions',
      sections: [
        {
          title: 'General Instructions',
          details: `This practice exam has ${questions.length} multiple-choice questions`,
          description: 'Each question has four suggested answers. Select the best answer for each question.'
        }
      ]
    };
  };

  const examDirections = getExamDirections();

  const currentQuestion = questions[currentQuestionIndex];

  const handleExitExam = () => {
    setShowExitDialog(true);
  };

  const handleConfirmExit = async () => {
    const examState = {
      currentQuestionIndex,
      userAnswers,
      flaggedQuestions: Array.from(flaggedQuestions),
      timeElapsed,
    };
    
    try {
      await apiRequest(
        "POST",
        `/api/user/subjects/${subjectId}/save-exam-state`,
        { examState }
      );
      router.push(`/study?subject=${subjectId}`);
    } catch (error) {
      console.error("Failed to save exam state:", error);
      router.push(`/study?subject=${subjectId}`);
    }
  };

  const handleAnswerSelect = (answer: string) => {
    setUserAnswers((prev) => ({ ...prev, [currentQuestionIndex]: answer }));
  };

  const toggleFlag = () => {
    setFlaggedQuestions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(currentQuestionIndex)) {
        newSet.delete(currentQuestionIndex);
      } else {
        newSet.add(currentQuestionIndex);
      }
      return newSet;
    });
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((i) => i + 1);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((i) => i - 1);
    }
  };

  const handleSubmitTest = async () => {
    setShowSubmitConfirm(false);
    setIsSubmitting(true);

    try {
      const correctCount = questions.reduce((count, question, index) => {
        const userAnswer = userAnswers[index];
        const correctLabel = String.fromCharCode(65 + question.answerIndex);
        return userAnswer === correctLabel ? count + 1 : count;
      }, 0);

      const percentage = Math.round((correctCount / questions.length) * 100);

      const formattedQuestions = questions.map(q => ({
        ...q,
        prompt_blocks: q.prompt_blocks || (q.prompt ? [{ type: 'text', content: q.prompt }] : []),
        choices: typeof q.choices === 'object' && !Array.isArray(q.choices) ? q.choices : 
          (Array.isArray(q.choices) ? q.choices.reduce((obj, choice, index) => {
            const label = String.fromCharCode(65 + index);
            return { ...obj, [label]: [choice] };
          }, {}) : {})
      }));

      const response = await apiRequest(
        "POST",
        `/api/user/subjects/${subjectId}/full-length-test`,
        {
          score: correctCount,
          percentage: percentage,
          totalQuestions: questions.length,
          questions: formattedQuestions,
          userAnswers: userAnswers
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to submit test: ${errorData.message || response.statusText}`);
      }

      const result = await response.json();
      const testId = result.data.id;

      await apiRequest(
        "DELETE",
        `/api/user/subjects/${subjectId}/delete-exam-state`
      );

      router.push(`/full-length-results?subject=${subjectId}&testId=${testId}`);
    } catch (error) {
      console.error("Error submitting test:", error);
      setIsSubmitting(false);
    }
  };

  const handleReviewSubmit = (updatedAnswers: { [key: number]: string }, updatedFlagged: Set<number>) => {
    setUserAnswers(updatedAnswers);
    setFlaggedQuestions(updatedFlagged);
    setIsReviewMode(false);
    setTimeout(() => {
      setShowSubmitConfirm(true);
    }, 100);
  };

  if (isReviewMode) {
    return (
      <QuizReviewPage
        questions={questions}
        userAnswers={userAnswers}
        flaggedQuestions={flaggedQuestions}
        onBack={() => setIsReviewMode(false)}
        onSubmit={handleReviewSubmit}
      />
    );
  }

  const allChoices = Object.keys(currentQuestion?.choices || {}) as Array<"A" | "B" | "C" | "D" | "E">;
  const choices = allChoices.filter((label) => {
    if (label !== "E") return true;
    const choiceBlocks = currentQuestion?.choices[label];
    if (!choiceBlocks || choiceBlocks.length === 0) return false;
    if (choiceBlocks.length === 1 && 
        choiceBlocks[0].type === "text" && 
        (!choiceBlocks[0].value || choiceBlocks[0].value.trim() === "")) {
      return false;
    }
    return true;
  });

  return (
    <div className="h-screen bg-gray-100 flex flex-col">
      <div className="fixed top-0 left-0 right-0 z-50">
        <QuizHeader
          title={`AP® ${subjectId.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')} Practice Exam`}
          timeElapsed={timeElapsed}
          onHideTimer={() => setTimerHidden(!timerHidden)}
          timerHidden={timerHidden}
          onExitExam={handleExitExam}
          examDirections={examDirections}
        />
      </div>

      <div className="flex-1 overflow-hidden mt-14 mb-12">
        <div className="h-full flex">
          {/* Left side - Question Prompt */}
          <div className="w-1/2 bg-white border-r border-gray-300 overflow-y-auto p-4 py-3">
            <div className="max-w-2xl text-sm leading-snug">
              <BlockRenderer blocks={currentQuestion?.prompt_blocks || []} />
            </div>
          </div>

          {/* Right side - Answer Choices */}
          <div className="w-1/2 bg-gray-50 overflow-y-auto p-4 py-3">
            <div className="max-w-2xl mx-auto text-sm leading-snug">
              {/* Question number and flag */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="bg-black text-white px-2.5 py-0.5 font-bold text-xs rounded">
                    {currentQuestionIndex + 1}
                  </div>
                  <button
                    onClick={toggleFlag}
                    className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-0.5 rounded border ${
                      flaggedQuestions.has(currentQuestionIndex) 
                        ? "bg-white border-gray-300 text-black" 
                        : "bg-white border-gray-300 text-gray-600 hover:text-black"
                    }`}
                  >
                    <Flag className={`h-3.5 w-3.5 ${flaggedQuestions.has(currentQuestionIndex) ? "fill-current" : ""}`} />
                    <span>Mark for Review</span>
                  </button>
                </div>
                <button className="px-2.5 py-0.5 text-xs font-semibold border border-gray-300 rounded bg-white hover:bg-gray-100">
                  ABC
                </button>
              </div>

              {/* Answer choices */}
              <div className="space-y-2">
                <RadioGroup value={userAnswers[currentQuestionIndex] || ""} onValueChange={handleAnswerSelect}>
                  {choices.map((label) => {
                    const isSelected = userAnswers[currentQuestionIndex] === label;
                    
                    return (
                      <div
                        key={label}
                        className={`flex items-start gap-2 p-4 rounded border-2 transition-all cursor-pointer ${
                          isSelected 
                            ? "border-blue-600 bg-white shadow-sm" 
                            : "border-gray-200 bg-white hover:border-gray-300"
                        }`}
                        onClick={() => handleAnswerSelect(label)}
                      >
                        <div className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center font-semibold text-xs ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50 text-blue-600'
                            : 'border-gray-400 bg-white text-gray-700'
                        }`}>
                          {label}
                        </div>
                        <div className="flex-1 pt-0 text-base leading-tight">
                          <BlockRenderer blocks={currentQuestion?.choices[label] || []} />
                        </div>
                      </div>
                    );
                  })}
                </RadioGroup>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-50">
        <QuizBottomBar
          currentQuestion={currentQuestionIndex + 1}
          totalQuestions={questions.length}
          onOpenPalette={() => setShowQuestionPalette(true)}
          onPrevious={handlePreviousQuestion}
          onNext={handleNextQuestion}
          canGoPrevious={currentQuestionIndex > 0}
          canGoNext={currentQuestionIndex < questions.length - 1}
          isLastQuestion={currentQuestionIndex === questions.length - 1}
          onSubmit={handleSubmitTest}
          onReview={currentQuestionIndex === questions.length - 1 ? () => setIsReviewMode(true) : undefined}
        />
      </div>

      <EnhancedQuestionPalette
        isOpen={showQuestionPalette}
        onClose={() => setShowQuestionPalette(false)}
        questions={questions}
        currentQuestion={currentQuestionIndex}
        userAnswers={userAnswers}
        flaggedQuestions={flaggedQuestions}
        onQuestionSelect={setCurrentQuestionIndex}
        onGoToReview={() => setIsReviewMode(true)}
      />

      <SubmitConfirmDialog
        isOpen={showSubmitConfirm}
        onClose={() => setShowSubmitConfirm(false)}
        onConfirm={handleSubmitTest}
      />

      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Exit the Exam?</AlertDialogTitle>
            <AlertDialogDescription>
              Your progress will be saved and you can continue this exam later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmExit}>
              Save and Exit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Directions Sheet - shown on first load */}
      <Sheet open={showDirections} onOpenChange={setShowDirections}>
        <SheetContent side="left" className="w-[600px] sm:w-[700px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-xl font-bold">Please read the directions carefully before beginning.</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-4 text-sm">
            {examDirections && (
              <>
                <h3 className="font-bold text-base">{examDirections.title}</h3>

                {examDirections.sections?.map((section, idx) => (
                  <div key={idx}>
                    <h4 className="font-semibold">{section.title}</h4>
                    <p className="font-medium">{section.details}</p>
                    {section.description && <p className="mt-2">{section.description}</p>}
                  </div>
                ))}

                {examDirections.breakdown && (
                  <ul className="list-disc pl-5 space-y-1">
                    {examDirections.breakdown.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                )}

                {examDirections.units && (
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-blue-50">
                        <tr>
                          <th className="text-left p-2 font-semibold">Units</th>
                          <th className="text-right p-2 font-semibold">Exam Weighting</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {examDirections.units.map((unit, idx) => (
                          <tr key={idx}>
                            <td className="p-2">{unit.name}</td>
                            <td className="p-2 text-right font-semibold text-blue-700">{unit.weight}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {examDirections.bigIdeas && (
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-blue-50">
                        <tr>
                          <th className="text-left p-2 font-semibold">Big Ideas</th>
                          <th className="text-right p-2 font-semibold">Exam Weighting</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {examDirections.bigIdeas.map((idea, idx) => (
                          <tr key={idx}>
                            <td className="p-2">{idea.name}</td>
                            <td className="p-2 text-right font-semibold text-blue-700">{idea.weight}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <p>Each question is followed by four suggested answers. Choose the one that best answers the question.</p>
              </>
            )}
            
            <p>You may use a calculator for this section. A calculator tool is available within the application.</p>
            <p>Reference materials can be accessed throughout the exam via the application toolbar.</p>
            <p>Navigate freely between questions until time runs out. The timer will display in red when 5 minutes remain.</p>
            <p className="mt-6"><strong>Note:</strong> AP® is a registered trademark of the College Board, which does not sponsor or endorse this practice exam. This interface is designed for educational purposes only.</p>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
