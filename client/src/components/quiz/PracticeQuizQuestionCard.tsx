import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { BlockRenderer } from "./BlockRenderer";
import { BookmarkCheck, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type Block =
  | { type: "text"; value: string }
  | { type: "image"; url: string };

interface Question {
  id: string;
  question_id?: number;
  subject_code?: string;
  section_code?: string;
  prompt_blocks: Block[];
  choices: Record<"A" | "B" | "C" | "D" | "E", Block[]>;
  answerIndex: number;
  correct_answer?: string;
  explanation?: string;
  prompt?: string;
  subjectId?: string;
  image_urls?: {
    question?: string[];
    A?: string[];
    B?: string[];
    C?: string[];
    D?: string[];
    E?: string[];
  };
}

interface PracticeQuizQuestionCardProps {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
  selectedAnswer: string | null;
  onAnswerSelect: (answer: string) => void;
  isAnswerSubmitted?: boolean;
  cheatMode?: boolean;
  isBookmarked?: boolean;
  onToggleBookmark?: () => void;
}

export function PracticeQuizQuestionCard({
  question,
  questionNumber,
  totalQuestions,
  selectedAnswer,
  onAnswerSelect,
  isAnswerSubmitted = false,
  cheatMode = false,
  isBookmarked = false,
  onToggleBookmark,
}: PracticeQuizQuestionCardProps) {
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [reportReason, setReportReason] = useState<string>("");
  const [reportDetails, setReportDetails] = useState("");
  const [isReporting, setIsReporting] = useState(false);
  const { toast } = useToast();

  if (!question) {
    return null;
  }

  const handleReportSubmit = async () => {
    if (!reportReason) return;
    setIsReporting(true);
    try {
      const res = await apiRequest("POST", "/api/questions/report", {
        questionId: question.id,
        subjectId: question.subject_code || question.subjectId || "unknown",
        reason: reportReason,
        details: reportDetails,
      });
      if (res.ok) {
        toast({
          title: "Report submitted",
          description: "Thank you for helping us improve our questions.",
        });
        setIsReportDialogOpen(false);
        setReportReason("");
        setReportDetails("");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsReporting(false);
    }
  };

  const allChoices = Object.keys(question.choices) as Array<"A" | "B" | "C" | "D" | "E">;

  // Filter out choice E if it's blank
  const choices = allChoices.filter((label) => {
    if (label !== "E") return true;

    const choiceBlocks = question.choices[label];
    if (!choiceBlocks || choiceBlocks.length === 0) return false;

    // Check if it's only empty text
    if (choiceBlocks.length === 1 &&
        choiceBlocks[0].type === "text" &&
        (!choiceBlocks[0].value || choiceBlocks[0].value.trim() === "")) {
      return false;
    }

    return true;
  });

  const correctAnswerLabel = String.fromCharCode(65 + question.answerIndex);
  const isCorrect = selectedAnswer === correctAnswerLabel;

  return (
    <Card className="dark:bg-gray-900 dark:border-gray-800">
      <CardHeader className="pb-1 pt-2">
        <div className="flex items-center justify-between border-b dark:border-gray-800 pb-1 -mx-4 px-3 -mt-2 pt-1.5 bg-gray-50 dark:bg-gray-800 min-h-[48px]">
          <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Question {questionNumber} of {totalQuestions}
          </div>
          <div className="flex items-center gap-2">
            {onToggleBookmark && (
              <button
                onClick={onToggleBookmark}
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                  isBookmarked
                    ? 'bg-yellow-100 text-yellow-700 border border-yellow-300 dark:bg-yellow-900/40 dark:text-yellow-400 dark:border-yellow-600'
                    : 'bg-white text-gray-500 border border-gray-300 hover:bg-yellow-50 hover:text-yellow-600 hover:border-yellow-300 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700 dark:hover:bg-yellow-900/30 dark:hover:text-yellow-400'
                }`}
              >
                <BookmarkCheck className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-current' : ''}`} />
                {isBookmarked ? 'Saved' : 'Save for Review'}
              </button>
            )}
            <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
              <DialogTrigger asChild>
                <button
                  className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-white text-gray-500 border border-gray-300 hover:bg-red-50 hover:text-red-600 hover:border-red-300 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700 dark:hover:bg-red-900/30 dark:hover:text-red-400 transition-colors"
                  title="Report an issue with this question"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Report
                </button>
              </DialogTrigger>
              <DialogContent className="dark:bg-gray-900 dark:border-gray-800">
                <DialogHeader>
                  <DialogTitle className="dark:text-white">Report Question</DialogTitle>
                  <DialogDescription className="dark:text-gray-400">
                    Notice an error? Let us know so we can fix it.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label className="dark:text-gray-200">Reason</Label>
                    <Select value={reportReason} onValueChange={setReportReason}>
                      <SelectTrigger className="dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200">
                        <SelectValue placeholder="Select a reason" />
                      </SelectTrigger>
                      <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                        <SelectItem value="typo" className="dark:text-gray-200 dark:focus:bg-gray-700">Typo or formatting issue</SelectItem>
                        <SelectItem value="incorrect_answer" className="dark:text-gray-200 dark:focus:bg-gray-700">Incorrect answer</SelectItem>
                        <SelectItem value="wrong_explanation" className="dark:text-gray-200 dark:focus:bg-gray-700">Confusing or wrong explanation</SelectItem>
                        <SelectItem value="image_issue" className="dark:text-gray-200 dark:focus:bg-gray-700">Image not loading/unclear</SelectItem>
                        <SelectItem value="other" className="dark:text-gray-200 dark:focus:bg-gray-700">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="dark:text-gray-200">Details (optional)</Label>
                    <Textarea
                      placeholder="Tell us more about the issue..."
                      value={reportDetails}
                      onChange={(e) => setReportDetails(e.target.value)}
                      className="dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200 dark:placeholder:text-gray-500"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsReportDialogOpen(false)} className="dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
                    Cancel
                  </Button>
                  <Button
                    onClick={handleReportSubmit}
                    disabled={!reportReason || isReporting}
                    className="bg-red-600 hover:bg-red-700 text-white border-none"
                  >
                    {isReporting ? "Submitting..." : "Submit Report"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-2 p-0 pt-2 pb-2 px-3">
        {/* Question Prompt */}
        <div className="space-y-2 min-h-0 leading-snug">
          <BlockRenderer blocks={question.prompt_blocks || []} />
        </div>

        {/* Choices */}
        <div className="space-y-1">
          <RadioGroup value={selectedAnswer || ""} onValueChange={onAnswerSelect}>
            {choices.map((label) => {
              const isUserAnswer = selectedAnswer === label;
              const isCorrectAnswer = label === correctAnswerLabel;

              // Determine background and border colors
              let bgColor = "bg-white dark:bg-gray-900";
              let borderColor = "border-gray-200 dark:border-gray-800";

              if (cheatMode && isCorrectAnswer && !isAnswerSubmitted) {
                bgColor = "bg-green-50 dark:bg-green-900/30";
                borderColor = "border-green-300 dark:border-green-600";
              }

              if (isAnswerSubmitted) {
                if (isUserAnswer && isCorrect) {
                  bgColor = "bg-green-50 dark:bg-green-900/30";
                  borderColor = "border-green-500";
                } else if (isUserAnswer && !isCorrect) {
                  bgColor = "bg-red-50 dark:bg-red-900/30";
                  borderColor = "border-red-500";
                } else if (isCorrectAnswer && !isCorrect) {
                  bgColor = "bg-green-50 dark:bg-green-900/30";
                  borderColor = "border-green-500";
                }
              } else if (isUserAnswer) {
                borderColor = "border-blue-600";
              }

              return (
                <div
                  key={label}
                  className={`flex items-center gap-2 sm:gap-3 p-3 sm:p-3 rounded border transition-all cursor-pointer min-h-[48px]
                    ${bgColor} ${borderColor}
                    ${!isAnswerSubmitted && !isUserAnswer ? "hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-700" : ""}
                  `}
                  onClick={() => !isAnswerSubmitted && onAnswerSelect(label)}
                >
                  <div className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center font-semibold text-xs ${
                    isUserAnswer
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/50'
                      : 'border-gray-400 dark:border-gray-500 bg-white dark:bg-gray-800'
                  }`}>
                    <span className="dark:text-gray-200">{label}</span>
                  </div>
                  <div className="flex-1 text-sm leading-snug dark:text-gray-200">
                    <BlockRenderer blocks={question.choices[label]} />
                  </div>
                </div>
              );
            })}
          </RadioGroup>
        </div>
      </CardContent>
    </Card>
  );
}
