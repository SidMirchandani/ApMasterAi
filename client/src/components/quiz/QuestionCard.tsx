import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Flag } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Question {
  id: string;
  prompt: string;
  choices: string[];
  answerIndex: number;
  explanation: string;
  subject_code?: string;
  section_code?: string;
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
        <div>
          <span className="font-bold mr-2">{label}.</span>
          {hasText && (
            <span className="inline">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{choice}</ReactMarkdown>
            </span>
          )}
        </div>

        {hasImages && (
          <div className="mt-2 space-y-2">
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
      <CardHeader>
        <div className="flex items-center justify-between border-b pb-3 -mx-6 px-6 -mt-6 pt-6">
          <div className="flex items-center gap-3">
            <div className="bg-black text-white px-3 py-1 font-semibold text-sm">
              {questionNumber}
            </div>
            <button
              onClick={onToggleFlag}
              className={`flex items-center gap-2 text-sm ${
                isFlagged ? "text-black" : "text-gray-600"
              }`}
            >
              <Flag className={`h-4 w-4 ${isFlagged ? "fill-current" : ""}`} />
              <span>Mark for Review</span>
            </button>
          </div>
          <button className="p-2 text-gray-600 hover:text-gray-900">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
            </svg>
          </button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {question.prompt && question.prompt.trim() && (
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {question.prompt}
          </ReactMarkdown>
        )}

        {question.image_urls?.question?.length > 0 && (
          <div className="space-y-2">
            {question.image_urls.question.map((img, ii) => (
              <img
                key={ii}
                src={img}
                className="rounded border max-w-full"
                alt="Question"
              />
            ))}
          </div>
        )}

        <div className="space-y-3">
          {question.choices.map((choice, i) => renderChoice(choice, i))}
        </div>
      </CardContent>
    </Card>
  );
}