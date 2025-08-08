import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/auth-context";
import Navigation from "@/components/ui/navigation";

const apSubjects = [
 {
   id: "calculus-ab",
   name: "AP Calculus AB",
   description: "Limits, derivatives, integrals, and the Fundamental Theorem of Calculus",
   units: 8,
   difficulty: "Hard",
   examDate: "May 5, 2025"
 },
 {
   id: "calculus-bc",
   name: "AP Calculus BC",
   description: "Advanced calculus including series, parametric equations, and polar coordinates",
   units: 10,
   difficulty: "Very Hard",
   examDate: "May 5, 2025"
 },
 {
   id: "biology",
   name: "AP Biology",
   description: "Molecular biology, genetics, evolution, ecology, and organism structure/function",
   units: 8,
   difficulty: "Hard",
   examDate: "May 12, 2025"
 },
 {
   id: "chemistry",
   name: "AP Chemistry",
   description: "Atomic structure, chemical bonding, thermodynamics, and laboratory techniques",
   units: 9,
   difficulty: "Hard",
   examDate: "May 6, 2025"
 },
 {
   id: "physics-1",
   name: "AP Physics 1",
   description: "Kinematics, dynamics, circular motion, energy, momentum, and waves",
   units: 7,
   difficulty: "Hard",
   examDate: "May 7, 2025"
 },
 {
   id: "us-history",
   name: "AP U.S. History",
   description: "American history from 1491 to present, including political, social, and economic themes",
   units: 9,
   difficulty: "Medium",
   examDate: "May 8, 2025"
 },
 {
   id: "world-history",
   name: "AP World History",
   description: "Global history from 1200 CE to present, focusing on historical thinking skills",
   units: 9,
   difficulty: "Medium",
   examDate: "May 15, 2025"
 },
 {
   id: "english-language",
   name: "AP English Language",
   description: "Rhetorical analysis, argument, and synthesis through reading and writing",
   units: 9,
   difficulty: "Medium",
   examDate: "May 13, 2025"
 },
 {
   id: "english-literature",
   name: "AP English Literature",
   description: "Literary analysis of poetry, prose, and drama from various time periods",
   units: 9,
   difficulty: "Medium",
   examDate: "May 21, 2025"
 },
 {
   id: "psychology",
   name: "AP Psychology",
   description: "Psychological science, research methods, and major psychological perspectives",
   units: 7,
   difficulty: "Easy",
   examDate: "May 9, 2025"
 }
];

const difficultyColors = {
  "Easy": "bg-green-100 text-green-800 border-green-200",
  "Medium": "bg-yellow-100 text-yellow-800 border-yellow-200",
  "Hard": "bg-orange-100 text-orange-800 border-orange-200",
  "Very Hard": "bg-red-100 text-red-800 border-red-200"
};


export default function Learn() {
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

  return (
    <div className="min-h-screen bg-khan-background">
      <Navigation />

      <div className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-khan-gray-dark mb-4">
              Choose Your <span className="text-khan-green">AP Subject</span>
            </h1>
            <p className="text-xl text-khan-gray-medium max-w-2xl mx-auto">
              Select an AP course to begin your personalized learning journey with practice tests and study materials.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {apSubjects.map((subject) => (
              <Card key={subject.id} className="bg-white hover:shadow-md transition-all border-2 border-gray-100 hover:border-khan-green/30">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between mb-2">
                    <CardTitle className="text-lg font-bold text-khan-gray-dark">
                      {subject.name}
                    </CardTitle>
                    <Badge
                      variant="outline"
                      className={difficultyColors[subject.difficulty as keyof typeof difficultyColors]}
                    >
                      {subject.difficulty}
                    </Badge>
                  </div>
                  <CardDescription className="text-khan-gray-medium leading-relaxed text-sm">
                    {subject.description}
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  <div className="flex items-center justify-between text-sm text-khan-gray-medium mb-6">
                    <div className="flex items-center space-x-1">
                      <BookOpen className="w-4 h-4" />
                      <span className="text-khan-gray-dark font-medium">{subject.units} Units</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="w-4 h-4" />
                      <span className="text-khan-gray-dark font-medium">{subject.examDate}</span>
                    </div>
                  </div>

                  <div className="flex flex-col space-y-3">
                    <Button
                      onClick={() => handleStartLearning(subject.id)}
                      className="bg-khan-green text-white hover:bg-khan-green-light transition-colors w-full font-semibold"
                    >
                      Start Learning
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => handleDiagnosticTest(subject.id)}
                      className="border-2 border-khan-blue text-khan-blue hover:bg-khan-blue hover:text-white transition-colors w-full font-semibold"
                    >
                      <Target className="mr-2 w-4 h-4" />
                      Practice Test
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>


        </div>
      </div>
    </div>
  );
}