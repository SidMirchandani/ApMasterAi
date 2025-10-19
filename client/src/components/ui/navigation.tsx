import Link from "next/link";
import { useRouter } from "next/router";
import { BookOpen, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/auth-context";
import { logout } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export default function Navigation() {
  const router = useRouter();
  const location = router.pathname;
  const { user, isAuthenticated, loading } = useAuth();
  const { toast } = useToast();

  // Detect if user is in quiz/test mode
  const isInQuizMode = location === "/quiz" && router.query.unit;

  const handleDisabledClick = (e: React.MouseEvent) => {
    if (isInQuizMode) {
      e.preventDefault();
      toast({
        title: "Test in Progress",
        description: "You cannot navigate away during a test. Use the 'Exit Test' button to leave.",
        duration: 3000,
      });
    }
  };

  const { data: userProfile } = useQuery<{
    success: boolean;
    data: {
      firstName: string;
      lastName: string;
      displayName: string;
      email: string;
    };
  }>({
    queryKey: ["userProfile"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/user/me");
      if (!response.ok) {
        throw new Error("Failed to fetch user profile");
      }
      return response.json();
    },
    enabled: isAuthenticated && !!user,
  });

  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to logout",
        variant: "destructive",
      });
    }
  };

  return (
    <nav className="border-b border-khan-gray-light bg-white sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link
            href={isAuthenticated ? "/dashboard" : "/"}
            className={`flex items-center space-x-2 sm:space-x-3 flex-shrink-0 ${isInQuizMode ? 'pointer-events-none opacity-60' : ''}`}
            onClick={handleDisabledClick}
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-khan-green rounded-lg flex items-center justify-center">
              <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <span className="text-xl sm:text-2xl font-bold text-khan-gray-dark">APMaster</span>
          </Link>

          <div className="flex items-center space-x-3 sm:space-x-4 md:space-x-6">
            {isAuthenticated && (
              <>
                <Link
                  href="/learn"
                  className={`text-sm sm:text-base text-khan-gray-medium hover:text-khan-gray-dark font-medium transition-colors ${
                    location === "/learn"
                      ? "text-khan-green"
                      : ""
                  } ${isInQuizMode ? 'pointer-events-none opacity-60' : ''}`}
                  data-testid="link-courses"
                  onClick={handleDisabledClick}
                >
                  Courses
                </Link>

                <Link
                  href="/dashboard"
                  className={`text-sm sm:text-base text-khan-gray-medium hover:text-khan-gray-dark font-medium transition-colors ${
                    location === "/dashboard"
                      ? "text-khan-green"
                      : ""
                  } ${isInQuizMode ? 'pointer-events-none opacity-60' : ''}`}
                  data-testid="link-dashboard"
                  onClick={handleDisabledClick}
                >
                  Dashboard
                </Link>
              </>
            )}

            {loading ? (
              <div className="w-16 sm:w-20 h-8 sm:h-9 bg-gray-200 animate-pulse rounded" />
            ) : isAuthenticated && user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className={`border-2 border-khan-gray-light text-khan-gray-dark hover:bg-khan-background font-medium text-sm sm:text-base px-2 sm:px-4 ${isInQuizMode ? 'opacity-60' : ''}`}
                    data-testid="button-user-menu"
                    disabled={isInQuizMode}
                    onClick={handleDisabledClick}
                  >
                    <User className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">Account</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        Welcome back{userProfile?.data?.firstName ? `, ${userProfile.data.firstName}` : ''}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user?.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => router.push("/profile")}
                    className="cursor-pointer"
                    data-testid="button-profile"
                  >
                    <User className="w-4 h-4 mr-2" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="cursor-pointer text-khan-red focus:text-khan-red"
                    data-testid="button-logout"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Link href="/login">
                  <Button
                    variant="outline"
                    className="border-2 border-khan-green text-khan-green hover:bg-khan-green hover:text-white transition-colors font-semibold text-sm sm:text-base px-3 sm:px-4"
                    data-testid="button-login"
                  >
                    Login
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button className="bg-khan-green text-white hover:bg-khan-green-light transition-colors font-semibold text-sm sm:text-base px-3 sm:px-4" data-testid="button-sign-up">
                    Sign Up
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}