import { Link } from "wouter";
import { BookOpen, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/auth-context";
import { logout } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

export default function Navigation() {
  const { user, isAuthenticated, loading } = useAuth();
  const { toast } = useToast();

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
          <Link href="/" className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-khan-green rounded-lg flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-khan-gray-dark">APMaster</span>
          </Link>
          
          <div className="flex items-center space-x-6">
            <Link 
              href="/learn" 
              className="text-khan-gray-medium hover:text-khan-gray-dark font-medium transition-colors"
              data-testid="link-courses"
            >
              Courses
            </Link>
            
            {loading ? (
              <div className="w-20 h-9 bg-gray-200 animate-pulse rounded" />
            ) : isAuthenticated && user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="border-2 border-khan-gray-light text-khan-gray-dark hover:bg-khan-background font-medium"
                    data-testid="button-user-menu"
                  >
                    <User className="w-4 h-4 mr-2" />
                    {user.email?.split('@')[0] || 'User'}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem asChild>
                    <Link href="/learn" className="cursor-pointer">
                      My Courses
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
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
                <Button 
                  variant="outline"
                  className="border-2 border-khan-green text-khan-green hover:bg-khan-green hover:text-white transition-colors font-semibold"
                  asChild
                  data-testid="button-login"
                >
                  <Link href="/login">Login</Link>
                </Button>
                <Button 
                  className="bg-khan-green text-white hover:bg-khan-green-light transition-colors font-semibold"
                  asChild
                  data-testid="button-sign-up"
                >
                  <Link href="/login">Sign Up</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}