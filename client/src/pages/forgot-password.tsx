import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Brain, Loader2, Mail, Target, Zap } from "lucide-react";
import { requestPasswordResetEmail } from "@/lib/auth";
import { ApMasterLogoMark } from "@/components/ui/ap-master-logo-mark";

const SUCCESS_COPY =
  "If this address has an account with a password, check your email for a reset link. If you usually sign in with Google, use “Continue with Google” on the login page.";

export default function ForgotPassword() {
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  useEffect(() => {
    if (!router.isReady) return;
    const raw = router.query.email;
    const fromQuery = Array.isArray(raw) ? raw[0] : raw;
    if (typeof fromQuery === "string" && fromQuery.trim()) {
      setEmail(fromQuery.trim());
    }
  }, [router.isReady, router.query.email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      setError("Please enter your email address.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await requestPasswordResetEmail(trimmed);
      setSubmitted(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-slate-950">
        <div className="absolute inset-0">
          <div
            className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-blue-500/20 rounded-full blur-[100px] animate-blob"
            style={{ animationDuration: "8s" }}
          />
          <div
            className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] bg-violet-500/15 rounded-full blur-[100px] animate-blob"
            style={{ animationDuration: "10s", animationDelay: "3s" }}
          />
          <div
            className="absolute top-1/2 right-1/3 w-[250px] h-[250px] bg-cyan-500/10 rounded-full blur-[80px] animate-blob"
            style={{ animationDuration: "12s", animationDelay: "5s" }}
          />
        </div>
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
            backgroundSize: "40px 40px",
          }}
        />
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20">
          <div className="mb-10">
            <Link href="/" className="inline-flex items-center gap-2.5 group">
              <ApMasterLogoMark size={40} className="rounded-xl shadow-glow" />
              <span className="text-xl font-display font-bold text-white">APMaster</span>
            </Link>
          </div>
          <h2 className="text-4xl xl:text-5xl font-display font-bold text-white leading-tight mb-6">
            Reset your
            <br />
            <span className="text-gradient">password</span>
          </h2>
          <p className="text-lg text-slate-400 max-w-md mb-12 leading-relaxed">
            We&apos;ll email you a secure link to choose a new password when your account uses email
            and password sign-in.
          </p>
          <div className="space-y-4">
            {[
              { icon: Brain, text: "Safe, one-time reset link" },
              { icon: Target, text: "Works with your existing account" },
              { icon: Zap, text: "Back to studying in minutes" },
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

      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-12 bg-white dark:bg-slate-950 relative">
        <div className="absolute inset-0 mesh-gradient lg:hidden pointer-events-none" />
        <div
          className={`max-w-md w-full relative z-10 transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          }`}
        >
          <div className="mb-8">
            <Link
              href={
                email.trim()
                  ? `/login?email=${encodeURIComponent(email.trim())}`
                  : "/login"
              }
              className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-blue-600 transition-colors font-medium group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              Back to sign in
            </Link>
          </div>

          <div className="lg:hidden mb-8">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <ApMasterLogoMark size={40} className="rounded-xl shadow-glow-sm" />
              <span className="text-xl font-display font-bold text-slate-900 dark:text-white">
                APMaster
              </span>
            </Link>
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-display font-bold text-slate-900 dark:text-white mb-2">
              Forgot password
            </h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium">
              Enter the email you use for APMaster
            </p>
          </div>

          {submitted ? (
            <div className="space-y-6">
              <Alert className="border-emerald-200 dark:border-emerald-800/50 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl">
                <AlertDescription className="text-emerald-800 dark:text-emerald-200 text-sm leading-relaxed">
                  {SUCCESS_COPY}
                </AlertDescription>
              </Alert>
              <Button
                type="button"
                variant="outline"
                className="w-full h-12 rounded-xl"
                onClick={() => {
                  setSubmitted(false);
                  setEmail("");
                }}
              >
                Use a different email
              </Button>
              <p className="text-center text-sm text-slate-500 dark:text-slate-400">
                <Link
                  href={
                    email.trim()
                      ? `/login?email=${encodeURIComponent(email.trim())}`
                      : "/login"
                  }
                  className="text-blue-600 dark:text-blue-400 font-semibold hover:text-blue-700"
                >
                  Return to sign in
                </Link>
              </p>
            </div>
          ) : (
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
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError("");
                    }}
                    className="pl-11 h-12 rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:border-blue-500 focus:ring-blue-500/20 transition-all"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              {error && (
                <Alert className="border-rose-200 dark:border-rose-800/50 bg-rose-50 dark:bg-rose-500/10 rounded-xl">
                  <AlertDescription className="text-rose-600 dark:text-rose-400 text-sm">{error}</AlertDescription>
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
                    Sending…
                  </>
                ) : (
                  "Send reset link"
                )}
              </Button>

              <p className="text-center pt-2 text-sm text-slate-500 dark:text-slate-400">
                Remember your password?{" "}
                <Link
                  href={
                    email.trim()
                      ? `/login?email=${encodeURIComponent(email.trim())}`
                      : "/login"
                  }
                  className="text-blue-600 dark:text-blue-400 font-semibold hover:text-blue-700"
                >
                  Sign in
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
