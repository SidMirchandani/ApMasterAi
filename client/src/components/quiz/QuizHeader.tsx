
import { Button } from "@/components/ui/button";
import { Clock, Flag, BookOpen, Calculator, FileText, MoreVertical, LogOut, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface QuizHeaderProps {
  title: string;
  timeElapsed: number;
  onHideTimer?: () => void;
  timerHidden?: boolean;
  onExitExam?: () => void;
  showDirections?: boolean;
}

export function QuizHeader({ title, timeElapsed, onHideTimer, timerHidden = false }: QuizHeaderProps) {
  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="border-b border-gray-200 bg-white sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
            {showDirections && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-gray-700">
                    Directions <ChevronDown className="ml-1 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-80 max-h-96 overflow-y-auto">
                  <div className="p-4">
                    <p className="text-sm text-gray-600">Directions coming soon.</p>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-gray-700">
              <Clock className="h-5 w-5" />
              {!timerHidden && <span className="font-mono text-lg">{formatTime(timeElapsed)}</span>}
              {onHideTimer && (
                <Button variant="ghost" size="sm" onClick={onHideTimer}>
                  {timerHidden ? "Show" : "Hide"}
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" title="Highlight and Notes">
                <Flag className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" title="Calculator">
                <Calculator className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" title="Reference">
                <FileText className="h-5 w-5" />
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" title="More">
                    <MoreVertical className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onExitExam && (
                    <DropdownMenuItem onClick={onExitExam}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Exit the Exam
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
