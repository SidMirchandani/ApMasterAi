import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Flag, Bookmark, AlertTriangle } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { BlockRenderer } from "./BlockRenderer";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  subjectId?: string;
  // Legacy fields for backward compatibility
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

interface QuestionCardProps {
  question: Question;
  questionNumber: number;
  totalQuestions?: number;
  selectedAnswer: string | null;
  isFlagged: boolean;
  onAnswerSelect: (answer: string) => void;
  onToggleFlag: () => void;
  isFullLength: boolean;
  isAnswerSubmitted?: boolean;
  isReviewMode?: boolean;
  hidePracticeQuizElements?: boolean;
  cheatMode?: boolean;
  isBookmarked?: boolean;
  onToggleBookmark?: () => void;
}

export function QuestionCard({
  question,
  questionNumber,
  selectedAnswer,
  isFlagged,
  onAnswerSelect,
  onToggleFlag,
  isFullLength,
  isAnswerSubmitted = false,
  isReviewMode = false,
  hidePracticeQuizElements = false,
  cheatMode = false,
  isBookmarked = false,
  onToggleBookmark,
}: QuestionCardProps) {
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

  const correctAnswerLabel = String.fromCharCode(65 + question.answerIndex); // A = 65

  const isCorrect = selectedAnswer === correctAnswerLabel;
  const shouldShowCorrectness = isAnswerSubmitted || isFullLength;

  return (
    <Card className={`${isFlagged ? "border-red-500 border-2" : ""}`}>
      <CardHeader className="pb-1 pt-2">
        <div className="flex items-center justify-between border-b pb-1 -mx-4 px-3 -mt-2 pt-1.5 bg-gray-50 min-h-[48px]">
          <div className="flex items-center gap-2">
            {!hidePracticeQuizElements && (
              <div className="bg-black text-white px-2 py-0.5 font-bold text-xs rounded">
                {questionNumber}
              </div>
            )}
            {isFullLength && (
              <button
                onClick={onToggleFlag}
                className={`flex items-center gap-1 text-xs font-medium ${
                  isFlagged ? "text-black" : "text-gray-600"
                }`}
              >
                <Flag className={`h-3 w-3 ${isFlagged ? "fill-current" : ""}`} />
                <span>Mark for Review</span>
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {onToggleBookmark && (
              <button
                onClick={onToggleBookmark}
                className={`p-1 rounded transition-colors ${isBookmarked ? 'text-yellow-500' : 'text-gray-400 hover:text-yellow-500'}`}
                title={isBookmarked ? "Remove bookmark" : "Bookmark this question"}
              >
                <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
              </button>
            )}
            <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
              <DialogTrigger asChild>
                <button
                  className="p-1 rounded text-gray-400 hover:text-red-500 transition-colors"
                  title="Report an issue with this question"
                >
                  <AlertTriangle className="w-4 h-4" />
                </button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Report Question</DialogTitle>
                  <DialogDescription>
                    Notice an error? Let us know so we can fix it.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Reason</Label>
                    <Select value={reportReason} onValueChange={setReportReason}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a reason" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="typo">Typo or formatting issue</SelectItem>
                        <SelectItem value="incorrect_answer">Incorrect answer</SelectItem>
                        <SelectItem value="wrong_explanation">Confusing or wrong explanation</SelectItem>
                        <SelectItem value="image_issue">Image not loading/unclear</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Details (optional)</Label>
                    <Textarea
                      placeholder="Tell us more about the issue..."
                      value={reportDetails}
                      onChange={(e) => setReportDetails(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsReportDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleReportSubmit}
                    disabled={!reportReason || isReporting}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    {isReporting ? "Submitting..." : "Submit Report"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            {!hidePracticeQuizElements && (
              <button className="px-2 py-0.5 text-xs font-semibold border border-gray-300 rounded hover:bg-gray-100">
                ABC
              </button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-2 p-0 pt-2 pb-2 px-3">
        {/* Question Counter for Practice Quizzes */}
        {hidePracticeQuizElements && totalQuestions && (
          <div className="text-sm font-semibold text-gray-700 mb-2">
            Question {questionNumber} of {totalQuestions}
          </div>
        )}

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

              // Determine the background and border color for this choice
              let bgColor = "bg-white";
              let borderColor = "border-gray-200";

              // Show correct answer in cheat mode (before submission/review)
              if (cheatMode && isCorrectAnswer && !isAnswerSubmitted && !isReviewMode) {
                bgColor = "bg-green-50";
                borderColor = "border-green-300";
              }

              if (isReviewMode) {
                // Review mode: always show correct/incorrect
                if (isUserAnswer && isCorrect) {
                  bgColor = "bg-green-50";
                  borderColor = "border-green-500";
                } else if (isUserAnswer && !isCorrect) {
                  bgColor = "bg-red-50";
                  borderColor = "border-red-500";
                } else if (isCorrectAnswer && !isCorrect) {
                  bgColor = "bg-green-50";
                  borderColor = "border-green-500";
                }
              } else if (isAnswerSubmitted) {
                // Answer submitted (practice quiz)
                if (isUserAnswer && isCorrect) {
                  bgColor = "bg-green-50";
                  borderColor = "border-green-500";
                } else if (isUserAnswer && !isCorrect) {
                  bgColor = "bg-red-50";
                  borderColor = "border-red-500";
                } else if (isCorrectAnswer && !isCorrect) {
                  bgColor = "bg-green-50";
                  borderColor = "border-green-500";
                }
              } else if (isUserAnswer) {
                // Selected but not submitted yet
                borderColor = "border-blue-600";
              }

              return (
                <div
                  key={label}
                  className={`flex items-center gap-2 p-3 rounded border transition-all cursor-pointer min-h-[48px]
                    ${bgColor} ${borderColor}
                    ${!shouldShowCorrectness && !isUserAnswer ? "hover:bg-gray-50 hover:border-gray-300" : ""}
                  `}
                  onClick={() => !isAnswerSubmitted && onAnswerSelect(label)}
                >
                  <div className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center font-semibold text-xs ${
                    isUserAnswer
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-400 bg-white'
                  }`}>
                    {label}
                  </div>
                  <div className="flex-1 text-sm leading-snug">
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