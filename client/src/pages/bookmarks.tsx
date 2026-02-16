import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bookmark, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import Navigation from "@/components/ui/navigation";
import { useAuth } from "@/contexts/auth-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface BookmarkedQuestion {
  id: string;
  questionId: string;
  subjectId: string;
  unitId: string;
  prompt: string;
  choices: string[] | Record<string, any>;
  answerIndex: number;
  explanation: string;
  sectionCode?: string;
  createdAt?: any;
}

export default function BookmarksPage() {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const subjectId = router.query.subject as string | undefined;
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/login");
    }
  }, [loading, isAuthenticated, router]);

  const { data: bookmarksResponse, isLoading } = useQuery<{
    success: boolean;
    data: BookmarkedQuestion[];
  }>({
    queryKey: ["bookmarks", subjectId || "all"],
    queryFn: async () => {
      const url = subjectId
        ? `/api/user/bookmarks?subjectId=${subjectId}`
        : "/api/user/bookmarks";
      const res = await apiRequest("GET", url);
      if (!res.ok) throw new Error("Failed to fetch bookmarks");
      return res.json();
    },
    enabled: isAuthenticated && !!user,
  });

  const removeMutation = useMutation({
    mutationFn: async (question: BookmarkedQuestion) => {
      const res = await apiRequest("POST", "/api/user/bookmarks/toggle", {
        questionId: question.questionId,
        subjectId: question.subjectId,
      });
      if (!res.ok) throw new Error("Failed to remove bookmark");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookmarks"], exact: false });
      toast({ title: "Bookmark removed" });
    },
  });

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const bookmarks = bookmarksResponse?.data || [];

  const getChoiceLabel = (choices: any, answerIndex: number): string => {
    if (Array.isArray(choices)) {
      return choices[answerIndex] || "N/A";
    }
    const keys = Object.keys(choices);
    return keys[answerIndex] || "N/A";
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950">
        <Navigation />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-khan-green"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <Navigation />

      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Bookmark className="w-6 h-6 text-yellow-500 fill-current" />
            Saved Questions
          </h1>
          <Badge variant="outline" className="text-sm dark:border-gray-600 dark:text-gray-300">
            {bookmarks.length} saved
          </Badge>
        </div>

        {bookmarks.length === 0 ? (
          <div className="text-center py-16">
            <Bookmark className="mx-auto h-16 w-16 text-gray-300 dark:text-gray-600 mb-4" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">No saved questions yet</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              Bookmark questions during practice to review them later
            </p>
            <Button
              onClick={() => router.push("/dashboard")}
              className="bg-khan-green hover:bg-khan-green-light text-white"
            >
              Start Practicing
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {bookmarks.map((bm) => {
              const isExpanded = expandedIds.has(bm.id);
              const correctLetter = String.fromCharCode(65 + bm.answerIndex);

              return (
                <Card key={bm.id} className="border border-gray-200 dark:border-gray-700 dark:bg-gray-900">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className="bg-khan-green text-white text-xs">
                            {bm.subjectId}
                          </Badge>
                          {bm.unitId && (
                            <Badge variant="outline" className="text-xs dark:border-gray-600 dark:text-gray-300">
                              {bm.unitId}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-800 dark:text-gray-200 line-clamp-2">
                          {typeof bm.prompt === "string" ? bm.prompt : "Question"}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleExpand(bm.id)}
                          className="h-8 w-8 p-0 dark:text-gray-400"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeMutation.mutate(bm)}
                          className="h-8 w-8 p-0 text-gray-400 hover:text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 space-y-3">
                        <div>
                          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Correct Answer</p>
                          <p className="text-sm text-green-700 dark:text-green-400 font-medium">
                            {correctLetter}. {getChoiceLabel(bm.choices, bm.answerIndex)}
                          </p>
                        </div>
                        {bm.explanation && (
                          <div>
                            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Explanation</p>
                            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                              {bm.explanation}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
