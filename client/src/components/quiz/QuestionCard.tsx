import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Flag } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { BlockRenderer } from "./BlockRenderer";

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
}: QuestionCardProps) {
  if (!question) {
    return null;
  }
  const renderChoice = (choice: string, index: number) => {
    const label = String.fromCharCode(65 + index);

    const hasText = choice && choice.trim() !== '';
    const hasImages = question.image_urls?.[label]?.length > 0;

    // Skip choice E only if both text and images are completely empty
    if (label === 'E' && !hasText && !hasImages) {
      return null;
    }

    const isSelected = selectedAnswer === label;
    const correctLabel = String.fromCharCode(65 + question.answerIndex);
    const isCorrect = label === correctLabel;

    let className = "w-full text-left p-3 rounded border transition ";

    if (isAnswerSubmitted) {
      if (isCorrect) {
        className += "border-green-500 bg-green-50";
      } else if (isSelected) {
        className += "border-red-500 bg-red-50";
      } else {
        className += "border-gray-300 bg-white";
      }
    } else {
      className += isSelected
        ? "border-khan-blue bg-blue-50"
        : "border-gray-300 bg-white hover:bg-gray-50";
    }

    return (
      <button
        key={label}
        onClick={() => !isAnswerSubmitted && onAnswerSelect(label)}
        className={className}
        disabled={isAnswerSubmitted}
      >
        <div className="text-sm">
          <span className="font-bold mr-1.5">{label}.</span>
          {hasText && (
            <span className="inline">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{choice}</ReactMarkdown>
            </span>
          )}
        </div>

        {hasImages && (
          <div className="mt-1.5 space-y-1.5">
            {question.image_urls[label]?.map((img, ii) => (
              <img key={ii} src={img} className="rounded border max-w-full" alt={`Choice ${label}`} />
            ))}
          </div>
        )}
      </button>
    );
  };

  return (
    <Card className="border border-gray-300">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between border-b pb-2 -mx-6 px-6 -mt-6 pt-4">
          <div className="flex items-center gap-2">
            <div className="bg-black text-white px-2 py-0.5 font-semibold text-xs">
              {questionNumber}
            </div>
            <button
              onClick={onToggleFlag}
              className={`flex items-center gap-1.5 text-xs ${
                isFlagged ? "text-black" : "text-gray-600"
              }`}
            >
              <Flag className={`h-3.5 w-3.5 ${isFlagged ? "fill-current" : ""}`} />
              <span className="hidden sm:inline">Mark for Review</span>
            </button>
          </div>
          <button className="p-1.5 text-gray-600 hover:text-gray-900">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
            </svg>
          </button>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pt-3">
        {/* Question Prompt */}
          <div className="mb-6">
            <BlockRenderer blocks={question.prompt_blocks} />
          </div>

        <div className="space-y-3">
          {/* Choices */}
          <RadioGroup value={selectedAnswer} onValueChange={setSelectedAnswer}>
              <div className="space-y-3">
                {(['A', 'B', 'C', 'D', 'E'] as const).map((choiceLabel, index) => {
                  const choiceBlocks = question.choices[choiceLabel];

                  if (!choiceBlocks || choiceBlocks.length === 0) {
                    return null;
                  }

                  return (
                    <div
                      key={choiceLabel}
                      className={`flex items-start space-x-3 p-4 rounded-lg border-2 transition-all ${
                        selectedAnswer === choiceLabel
                          ? 'border-khan-blue bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <RadioGroupItem
                        value={choiceLabel}
                        id={`choice-${choiceLabel}`}
                        className="mt-1"
                      />
                      <Label
                        htmlFor={`choice-${choiceLabel}`}
                        className="flex-1 cursor-pointer"
                      >
                        <span className="font-semibold mr-2">{choiceLabel}.</span>
                        <div className="inline">
                          <BlockRenderer blocks={choiceBlocks} className="inline-block" />
                        </div>
                      </Label>
                    </div>
                  );
                })}
              </div>
            </RadioGroup>
        </div>
      </CardContent>
    </Card>
  );
}