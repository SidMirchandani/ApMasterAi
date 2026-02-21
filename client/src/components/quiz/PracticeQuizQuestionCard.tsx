import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { RadioGroup } from "@/components/ui/radio-group";
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
  const choices = allChoices.filter((label) => {
    if (label !== "E") return true;
    const choiceBlocks = question.choices[label];
    if (!choiceBlocks || choiceBlocks.length === 0) return false;
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
    <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
      <CardHeader className="p-0">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 px-4 py-3 bg-gray-50/50 dark:bg-gray-800/50">
          <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Question {questionNumber} of {totalQuestions}
          </div>
          <div className="flex items-center gap-2">
            {onToggleBookmark && (
              <button
                onClick={onToggleBookmark}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border ${
                  isBookmarked
                    ? 'bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-900/40 dark:text-yellow-400 dark:border-yellow-600'
                    : 'bg-white text-gray-500 border-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700 dark:hover:bg-gray-700'
                }`}
              >
                <BookmarkCheck className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-current' : ''}`} />
                {isBookmarked ? 'Saved' : 'Save'}
              </button>
            )}
            <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
              <DialogTrigger asChild>
                <button
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-white text-gray-500 border border-gray-300 hover:bg-red-50 hover:text-red-600 hover:border-red-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-all duration-200"
                  title="Report issue"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Report
                </button>
              </DialogTrigger>
              <DialogContent className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
                <DialogHeader>
                  <DialogTitle className="text-gray-900 dark:text-gray-100">Report Question</DialogTitle>
                  <DialogDescription className="text-gray-500 dark:text-gray-400">
                    Help us improve by describing the issue with this question.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label className="text-gray-700 dark:text-gray-300">Reason</Label>
                    <Select value={reportReason} onValueChange={setReportReason}>
                      <SelectTrigger className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100">
                        <SelectValue placeholder="Select a reason" />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                        <SelectItem value="typo">Typo or formatting</SelectItem>
                        <SelectItem value="incorrect_answer">Incorrect answer</SelectItem>
                        <SelectItem value="wrong_explanation">Wrong explanation</SelectItem>
                        <SelectItem value="image_issue">Image issue</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-700 dark:text-gray-300">Details</Label>
                    <Textarea
                      placeholder="Describe the issue..."
                      value={reportDetails}
                      onChange={(e) => setReportDetails(e.target.value)}
                      className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 min-h-[100px]"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setIsReportDialogOpen(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
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
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        <div className="text-gray-900 dark:text-white leading-relaxed text-base">
          <BlockRenderer blocks={question.prompt_blocks || []} />
        </div>

        <div className="space-y-3">
          {choices.map((label) => {
            const isUserAnswer = selectedAnswer === label;
            const isCorrectAnswer = label === correctAnswerLabel;

            let borderColor = "border-gray-200 dark:border-gray-800";
            let bgColor = "bg-white dark:bg-gray-900";
            let textColor = "text-gray-700 dark:text-white";

            if (cheatMode && isCorrectAnswer && !isAnswerSubmitted) {
              borderColor = "border-green-300 dark:border-green-500";
              bgColor = "bg-green-50/50 dark:bg-green-900/20";
            }

            if (isAnswerSubmitted) {
              if (isCorrectAnswer) {
                borderColor = "border-green-500 dark:border-green-600";
                bgColor = "bg-green-50/50 dark:bg-green-900/20";
                textColor = "text-green-700 dark:text-green-300";
              } else if (isUserAnswer && !isCorrect) {
                borderColor = "border-red-500 dark:border-red-600";
                bgColor = "bg-red-50/50 dark:bg-red-900/20";
                textColor = "text-red-700 dark:text-red-300";
              }
            } else if (isUserAnswer) {
              borderColor = "border-blue-500 dark:border-blue-600";
              bgColor = "bg-blue-50/30 dark:bg-blue-900/10";
              textColor = "text-blue-700 dark:text-blue-300";
            } else {
              bgColor = "bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/50";
            }

            return (
              <button
                key={label}
                disabled={isAnswerSubmitted}
                onClick={() => onAnswerSelect(label)}
                className={`w-full flex items-start gap-4 p-4 rounded-xl border-2 transition-all duration-200 text-left
                  ${borderColor} ${bgColor} ${isAnswerSubmitted ? 'cursor-default' : 'cursor-pointer hover:shadow-sm'}
                `}
              >
                <div className={`flex-shrink-0 w-7 h-7 rounded-lg border-2 flex items-center justify-center font-bold text-sm transition-colors
                  ${isUserAnswer 
                    ? 'bg-blue-600 border-blue-600 text-white' 
                    : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-white'
                  }
                `}>
                  {label}
                </div>
                <div className={`flex-1 text-base leading-relaxed ${textColor}`}>
                  <BlockRenderer blocks={question.choices[label]} />
                </div>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
