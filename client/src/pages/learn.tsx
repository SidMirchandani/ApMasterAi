import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Clock, BookOpen, Target } from "lucide-react";
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
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);

  const handleStartLearning = (subjectId: string) => {
    setSelectedSubject(subjectId);
    // Here we would navigate to the specific subject page
    // For now, we'll show a placeholder
  };

  const handleDiagnosticTest = (subjectId: string) => {
    // Navigate to diagnostic test for the subject
    console.log(`Starting diagnostic test for ${subjectId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Choose Your <span className="bg-gradient-to-r from-gemini-blue to-gemini-purple bg-clip-text text-transparent">AP Subject</span>
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Select an AP course to begin your personalized learning journey with AI-powered study materials and practice tests.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {apSubjects.map((subject) => (
              <Card key={subject.id} className="hover:shadow-lg transition-shadow border-gray-200">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg font-semibold text-gray-900">
                      {subject.name}
                    </CardTitle>
                    <Badge 
                      variant="outline" 
                      className={difficultyColors[subject.difficulty as keyof typeof difficultyColors]}
                    >
                      {subject.difficulty}
                    </Badge>
                  </div>
                  <CardDescription className="text-gray-600 leading-relaxed">
                    {subject.description}
                  </CardDescription>
                </CardHeader>
                
                <CardContent>
                  <div className="flex items-center justify-between text-sm text-gray-500 mb-6">
                    <div className="flex items-center space-x-1">
                      <BookOpen className="w-4 h-4" />
                      <span>{subject.units} Units</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="w-4 h-4" />
                      <span>{subject.examDate}</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col space-y-3">
                    <Button 
                      onClick={() => handleStartLearning(subject.id)}
                      className="bg-gradient-to-r from-gemini-blue to-gemini-purple text-white hover:opacity-90 transition-opacity w-full"
                    >
                      Start Learning
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                    
                    <Button 
                      variant="outline"
                      onClick={() => handleDiagnosticTest(subject.id)}
                      className="border-gray-300 text-gray-700 hover:bg-gray-50 w-full"
                    >
                      <Target className="mr-2 w-4 h-4" />
                      Diagnostic Test
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="mt-16 text-center">
            <div className="bg-white rounded-xl border border-gray-200 p-8 max-w-2xl mx-auto">
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">Not sure where to start?</h3>
              <p className="text-gray-600 mb-6">
                Take our comprehensive assessment to identify which AP subjects align with your interests and academic strengths.
              </p>
              <Button 
                variant="outline"
                size="lg"
                className="border-2 border-gemini-blue text-gemini-blue hover:bg-gemini-blue hover:text-white"
              >
                <Target className="mr-2 w-5 h-5" />
                Take Full Assessment
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}