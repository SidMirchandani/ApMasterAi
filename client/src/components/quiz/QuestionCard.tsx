import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
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

  return (
    <Card className="border border-gray-300 shadow-sm">
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
          <RadioGroup value={selectedAnswer || undefined} onValueChange={onAnswerSelect}>
            {(['A', 'B', 'C', 'D', 'E'] as const).map((choiceLabel) => {
              const choiceBlocks = question.choices[choiceLabel];

              if (!choiceBlocks || choiceBlocks.length === 0) {
                return null;
              }

              const isSelected = selectedAnswer === choiceLabel;

              return (
                <div
                  key={choiceLabel}
                  className={`flex items-start gap-4 p-4 rounded-lg border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-gray-400 bg-gray-50'
                      : 'border-gray-300 bg-white hover:bg-gray-50'
                  }`}
                  onClick={() => !isAnswerSubmitted && onAnswerSelect(choiceLabel)}
                >
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full border-2 flex items-center justify-center font-semibold ${
                    isSelected
                      ? 'border-gray-700 bg-gray-100'
                      : 'border-gray-400 bg-white'
                  }`}>
                    {choiceLabel}
                  </div>
                  <div className="flex-1 pt-1.5">
                    <BlockRenderer blocks={choiceBlocks} />
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