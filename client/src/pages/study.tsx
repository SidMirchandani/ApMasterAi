import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { BookOpen, Target, ArrowLeft } from "lucide-react";
import Navigation from "@/components/ui/navigation";
import { useAuth } from "@/contexts/auth-context";

const masteryLevels = [
  {
    level: 3,
    title: "Qualified (3)",
    description: "I need foundational practice and review of core concepts",
    color: "bg-yellow-100 text-yellow-800 border-yellow-200"
  },
  {
    level: 4,
    title: "Well Qualified (4)", 
    description: "I have good understanding but want to strengthen weak areas",
    color: "bg-blue-100 text-blue-800 border-blue-200"
  },
  {
    level: 5,
    title: "Extremely Well Qualified (5)",
    description: "I want challenging problems to perfect my mastery",
    color: "bg-green-100 text-green-800 border-green-200"
  }
];

export default function Study() {
  const { isAuthenticated, loading } = useAuth();
  const [location, navigate] = useLocation();
  const [showMasteryModal, setShowMasteryModal] = useState(true);
  const [selectedMastery, setSelectedMastery] = useState<string>("4");
  const [subject, setSubject] = useState<any>(null);

  // Get subject ID from URL
  const subjectId = new URLSearchParams(location.split('?')[1] || '').get('subject');

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, loading, navigate]);

  useEffect(() => {
    // In a real app, you'd fetch the subject data based on subjectId
    // For now, we'll use mock data
    if (subjectId) {
      setSubject({
        id: subjectId,
        name: subjectId.charAt(0).toUpperCase() + subjectId.slice(1),
        description: `Advanced Placement ${subjectId.charAt(0).toUpperCase() + subjectId.slice(1)}`
      });
    }
  }, [subjectId]);

  const handleStartStudy = () => {
    setShowMasteryModal(false);
    // Here you would typically start the actual study session
    console.log(`Starting study session for ${subject?.name} at mastery level ${selectedMastery}`);
  };

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
    return null;
  }

  if (!subject) {
    return (
      <div className="min-h-screen bg-khan-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-khan-gray-dark mb-4">Subject not found</h1>
            <Button onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="mr-2 w-4 h-4" />
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-khan-background">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/dashboard')}
            className="mb-4 text-khan-gray-medium hover:text-khan-gray-dark"
          >
            <ArrowLeft className="mr-2 w-4 h-4" />
            Back to Dashboard
          </Button>
          
          <div className="flex items-center space-x-3 mb-2">
            <BookOpen className="w-8 h-8 text-khan-green" />
            <h1 className="text-3xl font-bold text-khan-gray-dark">{subject.name}</h1>
          </div>
          <p className="text-khan-gray-medium">{subject.description}</p>
        </div>

        {!showMasteryModal ? (
          <Card className="max-w-4xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Target className="w-6 h-6 text-khan-green" />
                <span>Study Session - Level {selectedMastery}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-khan-green rounded-full flex items-center justify-center mx-auto mb-6">
                  <BookOpen className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-khan-gray-dark mb-4">
                  Study session starting soon...
                </h2>
                <p className="text-khan-gray-medium mb-6">
                  Get ready for targeted practice at mastery level {selectedMastery}
                </p>
                <Button 
                  onClick={() => setShowMasteryModal(true)}
                  variant="outline"
                  className="border-khan-green text-khan-green hover:bg-khan-green hover:text-white"
                >
                  Change Mastery Level
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>

      {/* Mastery Level Selection Modal */}
      <Dialog open={showMasteryModal} onOpenChange={setShowMasteryModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Target className="w-6 h-6 text-khan-green" />
              <span>Choose Your Mastery Level</span>
            </DialogTitle>
            <DialogDescription>
              Select the AP level that matches your current understanding of {subject?.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <RadioGroup 
              value={selectedMastery} 
              onValueChange={setSelectedMastery}
              className="space-y-3"
            >
              {masteryLevels.map((level) => (
                <div key={level.level} className="flex items-start space-x-3">
                  <RadioGroupItem 
                    value={level.level.toString()} 
                    id={level.level.toString()}
                    className="mt-1"
                    data-testid={`mastery-level-${level.level}`}
                  />
                  <Label 
                    htmlFor={level.level.toString()} 
                    className="flex-1 cursor-pointer"
                  >
                    <div className="flex items-center space-x-2 mb-1">
                      <Badge className={level.color}>
                        Level {level.level}
                      </Badge>
                      <span className="font-semibold text-khan-gray-dark">
                        {level.title}
                      </span>
                    </div>
                    <p className="text-sm text-khan-gray-medium leading-relaxed">
                      {level.description}
                    </p>
                  </Label>
                </div>
              ))}
            </RadioGroup>

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button 
                variant="outline" 
                onClick={() => navigate('/dashboard')}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleStartStudy}
                className="bg-khan-green text-white hover:bg-khan-green-light"
                data-testid="button-start-study"
              >
                Start Studying
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}