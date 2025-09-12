
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/auth-context";
import AuthErrorBoundary from "@/components/auth-error-boundary";

interface AppProps {
  children: React.ReactNode;
}

function App({ children }: AppProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthErrorBoundary>
          <AuthProvider>
            {children}
            <Toaster />
          </AuthProvider>
        </AuthErrorBoundary>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
