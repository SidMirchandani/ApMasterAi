import { useParams, useLocation } from "wouter";
import { useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import Navigation from "@/components/ui/navigation";
import { BookOpen, Clock, Target, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Course() {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, loading, navigate]);

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

  // Get course name from the ID (you can expand this with actual data later)
  const getCourseName = (courseId: string) => {
    const courseMap: Record<string, string> = {
      "calculus-ab": "AP Calculus AB",
      "calculus-bc": "AP Calculus BC",
      "biology": "AP Biology",
      "chemistry": "AP Chemistry",
      "physics-1": "AP Physics 1",
      "us-history": "AP U.S. History",
      "world-history": "AP World History",
      "english-language": "AP English Language",
      "english-literature": "AP English Literature",
      "psychology": "AP Psychology"
    };
    return courseMap[courseId] || "AP Course";
  };

  const courseName = getCourseName(id || "");

  return (
    <div className="min-h-screen bg-khan-background">
      <Navigation />

      <div className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-khan-gray-dark mb-4">
              {courseName}
            </h1>
            <p className="text-xl text-khan-gray-medium max-w-2xl mx-auto">
              Master the concepts and skills you need to succeed on your AP exam.
            </p>
          </div>

          <div className="bg-white rounded-lg border-2 border-gray-100 p-8 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-khan-green rounded-lg flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-bold text-khan-gray-dark mb-2">Study Materials</h3>
                <p className="text-khan-gray-medium">Comprehensive lessons and explanations</p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-khan-blue rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Target className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-bold text-khan-gray-dark mb-2">Practice Questions</h3>
                <p className="text-khan-gray-medium">Real AP-style problems and solutions</p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-khan-purple rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-bold text-khan-gray-dark mb-2">Timed Practice</h3>
                <p className="text-khan-gray-medium">Exam simulation with real timing</p>
              </div>
            </div>

            <div className="text-center">
              <h2 className="text-2xl font-bold text-khan-gray-dark mb-4">Course Content Coming Soon</h2>
              <p className="text-khan-gray-medium mb-6">
                We're building comprehensive study materials and practice questions for {courseName}.
                Check back soon for updates!
              </p>
              <div className="flex items-center justify-center space-x-2 text-khan-green">
                <Users className="w-5 h-5" />
                <span className="font-medium">Join thousands of students preparing for success</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}