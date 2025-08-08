
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/auth-context";
import Navigation from "@/components/ui/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { BookOpen, Clock, Plus, Trash2, Target } from "lucide-react";
import { apSubjects, difficultyColors } from "@/lib/ap-subjects";
import { db } from "@/lib/firebase";
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot,
  query
} from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";

interface UserCourse {
  id: string;
}

export default function Dashboard() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const [userCourses, setUserCourses] = useState<UserCourse[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate("/login");
      return;
    }

    if (!user?.uid) return;

    // Subscribe to user's courses
    const coursesRef = collection(db, "users", user.uid, "courses");
    const q = query(coursesRef);
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const courses: UserCourse[] = [];
      snapshot.forEach((doc) => {
        courses.push({ id: doc.id });
      });
      setUserCourses(courses);
      setLoadingCourses(false);
    }, (error) => {
      console.error("Error fetching courses:", error);
      setLoadingCourses(false);
    });

    return () => unsubscribe();
  }, [user?.uid, isAuthenticated, loading, navigate]);

  const addCourse = async (courseId: string) => {
    if (!user?.uid) return;

    try {
      const courseRef = doc(db, "users", user.uid, "courses", courseId);
      await setDoc(courseRef, { id: courseId });
      
      toast({
        title: "Course added!",
        description: "The course has been added to your dashboard.",
      });
    } catch (error) {
      console.error("Error adding course:", error);
      toast({
        title: "Error",
        description: "Failed to add course. Please try again.",
        variant: "destructive",
      });
    }
  };

  const deleteCourse = async (courseId: string) => {
    if (!user?.uid) return;

    try {
      const courseRef = doc(db, "users", user.uid, "courses", courseId);
      await deleteDoc(courseRef);
      
      toast({
        title: "Course removed",
        description: "The course has been removed from your dashboard.",
      });
    } catch (error) {
      console.error("Error deleting course:", error);
      toast({
        title: "Error",
        description: "Failed to remove course. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getUserCourseIds = () => userCourses.map(course => course.id);
  const availableCourses = apSubjects.filter(subject => !getUserCourseIds().includes(subject.id));
  const enrolledCourses = apSubjects.filter(subject => getUserCourseIds().includes(subject.id));

  if (loading || loadingCourses) {
    return (
      <div className="min-h-screen bg-khan-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-khan-green border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-khan-gray-medium">Loading dashboard...</p>
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
          <div className="flex items-center justify-between mb-12">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-khan-gray-dark mb-4">
                My <span className="text-khan-green">Dashboard</span>
              </h1>
              <p className="text-xl text-khan-gray-medium">
                Manage your AP courses and track your progress.
              </p>
            </div>
            
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-khan-green text-white hover:bg-khan-green-light transition-colors font-semibold">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Courses
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add AP Courses</DialogTitle>
                  <DialogDescription>
                    Select from available AP courses to add to your dashboard.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  {availableCourses.map((subject) => (
                    <Card key={subject.id} className="bg-white border-2 border-gray-100">
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
                        <CardDescription className="text-khan-gray-medium text-sm">
                          {subject.description}
                        </CardDescription>
                      </CardHeader>
                      <CardFooter>
                        <Button
                          onClick={() => addCourse(subject.id)}
                          className="bg-khan-green text-white hover:bg-khan-green-light transition-colors w-full"
                          size="sm"
                        >
                          Add Course
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                  
                  {availableCourses.length === 0 && (
                    <div className="col-span-2 text-center py-8">
                      <p className="text-khan-gray-medium">
                        You've added all available AP courses!
                      </p>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {enrolledCourses.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-khan-green/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <BookOpen className="w-12 h-12 text-khan-green" />
              </div>
              <h2 className="text-2xl font-bold text-khan-gray-dark mb-4">
                No courses added yet
              </h2>
              <p className="text-khan-gray-medium mb-8 max-w-md mx-auto">
                Start your AP journey by adding courses to your dashboard. 
                You can choose from our comprehensive selection of AP subjects.
              </p>
              <Button 
                onClick={() => setIsAddDialogOpen(true)}
                className="bg-khan-green text-white hover:bg-khan-green-light transition-colors font-semibold"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Course
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {enrolledCourses.map((subject) => (
                <Card key={subject.id} className="bg-white hover:shadow-md transition-all border-2 border-gray-100 hover:border-khan-green/30">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between mb-2">
                      <CardTitle className="text-lg font-bold text-khan-gray-dark">
                        {subject.name}
                      </CardTitle>
                      <div className="flex items-center space-x-2">
                        <Badge
                          variant="outline"
                          className={difficultyColors[subject.difficulty as keyof typeof difficultyColors]}
                        >
                          {subject.difficulty}
                        </Badge>
                        <Button
                          onClick={() => deleteCourse(subject.id)}
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
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
                        onClick={() => navigate(`/course/${subject.id}`)}
                        className="bg-khan-green text-white hover:bg-khan-green-light transition-colors w-full font-semibold"
                      >
                        Continue Learning
                      </Button>

                      <Button
                        variant="outline"
                        onClick={() => navigate(`/practice-test/${subject.id}`)}
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
          )}
        </div>
      </div>
    </div>
  );
}
