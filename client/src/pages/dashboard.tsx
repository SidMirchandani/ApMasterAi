import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/auth-context";
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
import { 
  BookOpen, 
  Clock, 
  Plus, 
  Trash2, 
  Target, 
  Home,
  History,
  BarChart3,
  User,
  Settings,
  LogOut,
  TrendingUp,
  CheckCircle
} from "lucide-react";
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

type SidebarTab = 'home' | 'history' | 'performance' | 'profile' | 'settings';

export default function Dashboard() {
  const { user, isAuthenticated, loading, logout } = useAuth();
  const [, navigate] = useLocation();
  const [userCourses, setUserCourses] = useState<UserCourse[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [activeTab, setActiveTab] = useState<SidebarTab>('home');
  const { toast } = useToast();

  useEffect(() => {
    console.log("Dashboard auth state:", { loading, isAuthenticated, user: !!user, uid: user?.uid });

    if (!loading && !isAuthenticated) {
      console.log("Not authenticated, redirecting to login");
      navigate("/login");
      return;
    }

    if (!user?.uid) {
      console.log("No user UID, skipping course subscription");
      return;
    }

    console.log("Setting up course subscription for user:", user.uid);

    // Subscribe to user's courses
    const coursesRef = collection(db, "users", user.uid, "courses");
    const q = query(coursesRef);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const courses: UserCourse[] = [];
      snapshot.forEach((doc) => {
        courses.push({ id: doc.id });
      });
      console.log("Loaded courses:", courses);
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

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const getUserCourseIds = () => userCourses.map(course => course.id);
  const availableCourses = apSubjects.filter(subject => !getUserCourseIds().includes(subject.id));
  const enrolledCourses = apSubjects.filter(subject => getUserCourseIds().includes(subject.id));

  const sidebarItems = [
    { id: 'home' as SidebarTab, label: 'Home', icon: Home },
    { id: 'history' as SidebarTab, label: 'Test History', icon: History },
    { id: 'performance' as SidebarTab, label: 'Performance', icon: BarChart3 },
    { id: 'profile' as SidebarTab, label: 'Profile', icon: User },
    { id: 'settings' as SidebarTab, label: 'Settings', icon: Settings },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-khan-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-khan-green border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-khan-gray-medium">Loading authentication...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect to login
  }

  if (loadingCourses) {
    return (
      <div className="min-h-screen bg-khan-background flex">
        <div className="w-64 bg-gray-200"></div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-khan-green border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-khan-gray-medium">Loading your courses...</p>
          </div>
        </div>
      </div>
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <div className="space-y-8">
            {/* Welcome Section */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold text-khan-gray-dark mb-2">
                  Welcome back, {user?.displayName || user?.email?.split('@')[0] || 'User'}!
                </h1>
                <p className="text-xl text-khan-gray-medium">
                  Continue your AP learning journey
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

            {/* Recent Tests Section */}
            <div>
              <h2 className="text-2xl font-bold text-khan-gray-dark mb-4">Recent Tests</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {enrolledCourses.slice(0, 4).map((subject) => (
                  <Card key={subject.id} className="bg-white border border-gray-200 hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/practice-test/${subject.id}`)}>
                    <CardContent className="p-4">
                      <div className="w-full h-24 bg-gray-100 rounded-lg flex items-center justify-center mb-3">
                        <BookOpen className="w-8 h-8 text-khan-green" />
                      </div>
                      <p className="text-sm font-medium text-khan-gray-dark truncate">{subject.name}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Suggested Actions */}
            <Card className="bg-gray-100">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-khan-gray-dark mb-2">Suggested Actions</h3>
                    <p className="text-khan-gray-medium">Next steps to improve your scores.</p>
                  </div>
                  <Button variant="outline" className="bg-white">
                    Take Action
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* My Courses */}
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
              <div>
                <h2 className="text-2xl font-bold text-khan-gray-dark mb-6">My Courses</h2>
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
              </div>
            )}
          </div>
        );

      case 'history':
        return (
          <div>
            <h1 className="text-4xl font-bold text-khan-gray-dark mb-6">Test History</h1>
            <Card>
              <CardContent className="p-8 text-center">
                <History className="w-16 h-16 text-khan-green mx-auto mb-4" />
                <h3 className="text-xl font-bold text-khan-gray-dark mb-2">No test history yet</h3>
                <p className="text-khan-gray-medium mb-6">Take your first practice test to see your history here.</p>
                <Button className="bg-khan-green text-white hover:bg-khan-green-light">
                  Take a Practice Test
                </Button>
              </CardContent>
            </Card>
          </div>
        );

      case 'performance':
        return (
          <div>
            <h1 className="text-4xl font-bold text-khan-gray-dark mb-6">Performance</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <TrendingUp className="w-5 h-5 mr-2 text-khan-green" />
                    Overall Progress
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-khan-gray-medium">Complete practice tests to track your progress over time.</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Target className="w-5 h-5 mr-2 text-khan-blue" />
                    Score Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-khan-gray-medium">Detailed breakdown of your performance by topic and question type.</p>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case 'profile':
        return (
          <div>
            <h1 className="text-4xl font-bold text-khan-gray-dark mb-6">Profile</h1>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-4 mb-6">
                  <div className="w-16 h-16 bg-khan-green rounded-full flex items-center justify-center">
                    <User className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-khan-gray-dark">{user?.displayName || 'User'}</h3>
                    <p className="text-khan-gray-medium">{user?.email}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-khan-gray-dark">Enrolled Courses</label>
                    <p className="text-khan-gray-medium">{enrolledCourses.length} courses</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-khan-gray-dark">Member Since</label>
                    <p className="text-khan-gray-medium">Recently joined</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'settings':
        return (
          <div>
            <h1 className="text-4xl font-bold text-khan-gray-dark mb-6">Settings</h1>
            <Card>
              <CardContent className="p-6">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-khan-gray-dark mb-2">Account Settings</h3>
                    <p className="text-khan-gray-medium mb-4">Manage your account preferences and settings.</p>
                    <Button variant="outline">Edit Profile</Button>
                  </div>

                  <div className="border-t pt-6">
                    <h3 className="text-lg font-semibold text-khan-gray-dark mb-2">Study Preferences</h3>
                    <p className="text-khan-gray-medium mb-4">Customize your learning experience.</p>
                    <Button variant="outline">Manage Preferences</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-white flex">
      {/* Sidebar */}
      <div className="w-64 bg-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-300">
          <h2 className="text-xl font-bold text-khan-gray-dark">AP Test Dashboard</h2>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <div className="space-y-2">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                    isActive 
                      ? 'bg-white text-khan-gray-dark shadow-sm' 
                      : 'text-khan-gray-medium hover:bg-gray-300 hover:text-khan-gray-dark'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-gray-300">
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left text-khan-gray-medium hover:bg-gray-300 hover:text-khan-gray-dark transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 bg-khan-background">
        <div className="p-8">
          {renderTabContent()}
        </div>

        {/* Action Log Sidebar */}
        <div className="fixed top-0 right-0 w-80 h-full bg-gray-200 p-6 border-l border-gray-300">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-khan-gray-dark mb-2">Action Log</h3>
            <p className="text-sm text-khan-gray-medium mb-4">View your latest test results.</p>
            <Button variant="outline" className="w-full">View</Button>
          </div>

          <div>
            <h3 className="text-lg font-bold text-khan-gray-dark mb-4">Available Tests</h3>
            <div className="space-y-3">
              {enrolledCourses.slice(0, 4).map((subject, index) => (
                <div key={subject.id} className="flex items-center justify-between p-3 bg-white rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-khan-green rounded-full flex items-center justify-center">
                      <BookOpen className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-sm text-khan-gray-dark">{subject.name.split(' ')[1] || 'Test'}</p>
                      <p className="text-xs text-khan-gray-medium">Score: {85 + index * 5}%</p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => navigate(`/practice-test/${subject.id}`)}>
                    Test
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}