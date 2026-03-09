import type { AppProps } from 'next/app';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../client/src/contexts/auth-context';
import { ThemeProvider } from '../client/src/contexts/theme-context';
import { Toaster } from '../client/src/components/ui/toaster';
import { TooltipProvider } from '../client/src/components/ui/tooltip';
import 'katex/dist/katex.min.css';
import '../client/src/index.css';

const queryClient = new QueryClient();

export default function App({ Component, pageProps }: AppProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <AuthProvider>
            <Component {...pageProps} />
            <Toaster />
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
