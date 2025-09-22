import React, { useEffect } from "react";
import { useRouter } from "next/router";
import { useAuth } from "@/contexts/auth-context";
import Navigation from "@/components/ui/navigation";
import { Target, Clock, BarChart3, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PracticeTest() {
  const router = useRouter();
  const { id } = router.query;
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-khan-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-khan-green border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-khan-gray-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect to login
  }

  // Get test name from the ID (you can expand this with actual data later)
  const getTestName = (testId: string) => {
    const testMap: Record<string, string> = {
      "calculus-ab": "AP Calculus AB Practice Test",
      "calculus-bc": "AP Calculus BC Practice Test",
      biology: "AP Biology Practice Test",
      chemistry: "AP Chemistry Practice Test",
      "physics-1": "AP Physics 1 Practice Test",
      "us-history": "AP U.S. History Practice Test",
      "world-history": "AP World History Practice Test",
      "english-language": "AP English Language Practice Test",
      "english-literature": "AP English Literature Practice Test",
      psychology: "AP Psychology Practice Test",
    };
    return testMap[testId] || "AP Practice Test";
  };

  // ✅ Normalize id into a string
  const testId: string = Array.isArray(id) ? (id[0] || "") : (id || "");
  const testName: string = getTestName(testId);

  return (
    <div className="min-h-screen bg-khan-background">
      <Navigation />

      <div className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-khan-gray-dark mb-4">
              {testName}
            </h1>
            <p className="text-xl text-khan-gray-medium max-w-2xl mx-auto">
              Test your knowledge with real AP-style questions and get instant
              feedback.
            </p>
          </div>

          <div className="bg-white rounded-lg border-2 border-gray-100 p-8 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="text-center">
                <div className="w-14 h-14 bg-khan-blue rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Target className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-sm font-bold text-khan-gray-dark mb-1">
                  55 Questions
                </h3>
                <p className="text-xs text-khan-gray-medium">
                  Multiple choice & FRQ
                </p>
              </div>

              <div className="text-center">
                <div className="w-14 h-14 bg-khan-green rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Clock className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-sm font-bold text-khan-gray-dark mb-1">
                  3 Hours 15 Min
                </h3>
                <p className="text-xs text-khan-gray-medium">
                  Real exam timing
                </p>
              </div>

              <div className="text-center">
                <div className="w-14 h-14 bg-khan-purple rounded-lg flex items-center justify-center mx-auto mb-3">
                  <BarChart3 className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-sm font-bold text-khan-gray-dark mb-1">
                  Detailed Analytics
                </h3>
                <p className="text-xs text-khan-gray-medium">
                  Performance insights
                </p>
              </div>

              <div className="text-center">
                <div className="w-14 h-14 bg-khan-orange rounded-lg flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-sm font-bold text-khan-gray-dark mb-1">
                  Instant Feedback
                </h3>
                <p className="text-xs text-khan-gray-medium">
                  Explanations included
                </p>
              </div>
            </div>

            <div className="text-center">
              <h2 className="text-2xl font-bold text-khan-gray-dark mb-4">
                Practice Test Coming Soon
              </h2>
              <p className="text-khan-gray-medium mb-6">
                We're creating comprehensive practice tests with real AP-style
                questions for optimal exam preparation. Our diagnostic tests
                will help identify your strengths and areas for improvement.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  className="bg-khan-green text-white hover:bg-khan-green-light transition-colors px-6 py-3 font-semibold"
                  disabled
                >
                  Start Practice Test
                </Button>
                <Button
                  variant="outline"
                  className="border-2 border-khan-blue text-khan-blue hover:bg-khan-blue hover:text-white transition-colors px-6 py-3 font-semibold"
                  disabled
                >
                  Quick Diagnostic (15 min)
                </Button>
              </div>

              <p className="text-sm text-khan-gray-medium mt-4">
                Practice tests will be available soon. Stay tuned for updates!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
