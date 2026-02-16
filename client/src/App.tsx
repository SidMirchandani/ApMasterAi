import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/auth-context";
import AuthErrorBoundary from "@/components/auth-error-boundary";
import { ThemeProvider } from "@/contexts/theme-context";

interface AppProps {
  children?: React.ReactNode;
}

function App({ children }: AppProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <AuthErrorBoundary>
            <AuthProvider>
              {children}
              <Toaster />
            </AuthProvider>
          </AuthErrorBoundary>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
