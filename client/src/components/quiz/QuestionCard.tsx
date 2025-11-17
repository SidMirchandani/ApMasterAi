import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Flag } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { BlockRenderer } from "./BlockRenderer";
import { Button } from "@/components/ui/button";

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
  selectedAnswer: string | null;
  isFlagged: boolean;
  onAnswerSelect: (answer: string) => void;
  onToggleFlag: () => void;
  isFullLength: boolean;
  isAnswerSubmitted?: boolean;
  isReviewMode?: boolean;
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
}: QuestionCardProps) {
  if (!question) {
    return null;
  }

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
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between border-b pb-3 -mx-6 px-6 -mt-6 pt-4 bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="bg-black text-white px-3 py-1 font-bold text-sm rounded">
              {questionNumber}
            </div>
            <button
              onClick={onToggleFlag}
              className={`flex items-center gap-2 text-sm font-medium ${
                isFlagged ? "text-black" : "text-gray-600"
              }`}
            >
              <Flag className={`h-4 w-4 ${isFlagged ? "fill-current" : ""}`} />
              <span>Mark for Review</span>
            </button>
          </div>
          {/* Placeholder for ABC button if needed, currently not implemented */}
          <button className="px-3 py-1 text-sm font-semibold border border-gray-300 rounded hover:bg-gray-100">
            ABC
          </button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-4">
        {/* Question Prompt */}
        <div className="mb-6 text-base leading-relaxed">
          <BlockRenderer blocks={question.prompt_blocks} />
        </div>

        {/* Choices */}
        <div className="space-y-3">
          <RadioGroup value={selectedAnswer || ""} onValueChange={onAnswerSelect}>
            {choices.map((label) => {
              const isUserAnswer = selectedAnswer === label;
              const isCorrectAnswer = label === correctAnswerLabel;

              // Determine background and border colors
              let bgColor = "bg-white";
              let borderColor = "border-gray-200";

              // Only show highlights in review mode
              if (isReviewMode) {
                if (isUserAnswer && isCorrect) {
                  // User's answer is correct - light green
                  bgColor = "bg-green-50";
                  borderColor = "border-green-500";
                } else if (isUserAnswer && !isCorrect) {
                  // User's answer is wrong - light red
                  bgColor = "bg-red-50";
                  borderColor = "border-red-500";
                } else if (isCorrectAnswer && !isCorrect) {
                  // Show correct answer in green when user was wrong
                  bgColor = "bg-green-50";
                  borderColor = "border-green-500";
                }
              } else if (isUserAnswer) {
                // During quiz, just highlight selected answer without showing correctness
                borderColor = "border-khan-blue";
              }

              return (
                <div
                  key={label}
                  className={`flex items-start gap-4 p-4 rounded-lg border transition-all cursor-pointer
                    ${bgColor} ${borderColor}
                    ${!shouldShowCorrectness && !isUserAnswer ? "hover:bg-gray-50 hover:border-gray-300" : ""}
                  `}
                  onClick={() => !isAnswerSubmitted && onAnswerSelect(label)}
                >
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full border-2 flex items-center justify-center font-semibold ${
                    isUserAnswer
                      ? 'border-gray-700 bg-gray-100'
                      : 'border-gray-400 bg-white'
                  }`}>
                    {label}
                  </div>
                  <div className="flex-1 pt-1.5">
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