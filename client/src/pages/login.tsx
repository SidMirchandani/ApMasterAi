import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, Loader2, Mail, Lock, ArrowLeft, Sparkles, Brain, Zap, Target } from "lucide-react";
import { loginWithEmail, signInWithGoogle, getGoogleRedirectResult } from "@/lib/auth";
import { auth } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const router = useRouter();
  const { toast } = useToast();
  const [isVisible, setIsVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [authChecked, setAuthChecked] = useState(false);
  const [redirectPending, setRedirectPending] = useState(false);
  const [redirectResultChecked, setRedirectResultChecked] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  useEffect(() => {
    let cancelled = false;

    // 1. Immediate Session Check: If Firebase already has a user, move them now
    if (!auth) {
      setAuthChecked(true);
      setRedirectPending(false);
      setRedirectResultChecked(true);
      return;
    }

    const hasPendingRedirectFlag =
      typeof window !== "undefined" &&
      sessionStorage.getItem("googleRedirectPending") === "1";
    setRedirectPending(hasPendingRedirectFlag);

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && !cancelled) {
        if (typeof window !== "undefined") {
          sessionStorage.removeItem("googleRedirectPending");
        }
        setRedirectPending(false);
        console.log("Session detected, redirecting...");
        router.replace("/dashboard");
        return;
      }
      if (!cancelled) setAuthChecked(true);
    });

    // 2. Handle Redirect Result: Catch the data coming back from the Google redirect
    getGoogleRedirectResult()
      .then((result) => {
        if (!cancelled) setRedirectResultChecked(true);
        if (cancelled || !result) return;
        if (typeof window !== "undefined") {
          sessionStorage.removeItem("googleRedirectPending");
        }
        setRedirectPending(false);
        toast({
          title: "Welcome back!",
          description: "You have successfully logged in with Google.",
        });
        router.replace("/dashboard");
      })
      .catch((err: unknown) => {
        if (!cancelled) setRedirectResultChecked(true);
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "Sign-in failed";
        console.error("Redirect error:", err);
        // Only show error if it's a real failure, not just a fresh page load
        if (!message.includes("auth/operation-not-supported")) {
          setError(message);
        }
        if (typeof window !== "undefined") {
          sessionStorage.removeItem("googleRedirectPending");
        }
        setRedirectPending(false);
      });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [router, toast]);

  const shouldShowAuthGate =
    loading || !authChecked || (redirectPending && !redirectResultChecked);

  if (shouldShowAuthGate) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3 text-slate-700 dark:text-slate-200">
          <Loader2 className="w-6 h-6 animate-spin" />
          <div className="text-sm font-medium">Signing you in…</div>
        </div>
      </div>
    );
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError("");
  };

  const validateForm = () => {
    if (!formData.email || !formData.password) { setError("Please fill in all fields"); return false; }
    if (formData.password.length < 6) { setError("Password must be at least 6 characters long"); return false; }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);
    setError("");
    try {
      await loginWithEmail({ email: formData.email, password: formData.password });
      toast({ title: "Welcome back!", description: "You have successfully logged in." });
      router.replace("/dashboard");
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError("");
    try {
      await signInWithGoogle();
      // Redirect will navigate away; on return we handle it via getGoogleRedirectResult().
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel - decorative */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-slate-950">
        {/* Animated mesh */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-blue-500/20 rounded-full blur-[100px] animate-blob" style={{ animationDuration: "8s" }} />
          <div className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] bg-violet-500/15 rounded-full blur-[100px] animate-blob" style={{ animationDuration: "10s", animationDelay: "3s" }} />
          <div className="absolute top-1/2 right-1/3 w-[250px] h-[250px] bg-cyan-500/10 rounded-full blur-[80px] animate-blob" style={{ animationDuration: "12s", animationDelay: "5s" }} />
        </div>

        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
          backgroundSize: "40px 40px",
        }} />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20">
          <div className="mb-10">
            <Link href="/" className="inline-flex items-center gap-2.5 group">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-glow">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-display font-bold text-white">
                APMaster
              </span>
            </Link>
          </div>

          <h2 className="text-4xl xl:text-5xl font-display font-bold text-white leading-tight mb-6">
            Welcome back to
            <br />
            <span className="text-gradient">smarter learning</span>
          </h2>
          <p className="text-lg text-slate-400 max-w-md mb-12 leading-relaxed">
            Pick up right where you left off. Your personalized study plan is waiting.
          </p>

          {/* Feature pills */}
          <div className="space-y-4">
            {[
              { icon: Brain, text: "AI adapts to your learning style" },
              { icon: Target, text: "Focus on your weak areas" },
              { icon: Zap, text: "Get instant, detailed feedback" },
            ].map(({ icon: Icon, text }, i) => (
              <div key={i} className="flex items-center gap-3 text-slate-300">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-blue-400" />
                </div>
                <span className="text-sm font-medium">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-12 bg-white dark:bg-slate-950 relative">
        {/* Subtle mesh on mobile */}
        <div className="absolute inset-0 mesh-gradient lg:hidden pointer-events-none" />

        <div
          className={`max-w-md w-full relative z-10 transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          }`}
        >
          <div className="mb-8">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-blue-600 transition-colors font-medium group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              Back to home
            </Link>
          </div>

          {/* Logo on mobile */}
          <div className="lg:hidden mb-8">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-glow-sm">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-display font-bold text-slate-900 dark:text-white">
                APMaster
              </span>
            </Link>
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-display font-bold text-slate-900 dark:text-white mb-2">
              Welcome back
            </h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium">
              Sign in to continue your AP preparation
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-700 dark:text-slate-300 font-medium text-sm">
                Email address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4.5 h-4.5" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className="pl-11 h-12 rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:border-blue-500 focus:ring-blue-500/20 transition-all"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-700 dark:text-slate-300 font-medium text-sm">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4.5 h-4.5" />
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  className="pl-11 pr-11 h-12 rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:border-blue-500 focus:ring-blue-500/20 transition-all"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                </button>
              </div>
            </div>

            {error && (
              <Alert className="border-rose-200 dark:border-rose-800/50 bg-rose-50 dark:bg-rose-500/10 rounded-xl">
                <AlertDescription className="text-rose-600 dark:text-rose-400 text-sm">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold rounded-xl shadow-[0_4px_14px_rgba(59,130,246,0.25)] hover:shadow-[0_6px_20px_rgba(59,130,246,0.35)] transition-all duration-300"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-200 dark:border-slate-700" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white dark:bg-slate-950 px-3 text-slate-400 font-medium">Or</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              disabled={loading}
              onClick={handleGoogleSignIn}
              className="w-full h-12 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all duration-300 font-semibold"
            >
              <svg className="mr-2.5 w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </Button>

            <p className="text-center pt-4 text-sm text-slate-500 dark:text-slate-400">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="text-blue-600 dark:text-blue-400 hover:text-blue-700 font-semibold transition-colors">
                Sign up free
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
