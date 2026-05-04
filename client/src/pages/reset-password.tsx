import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import { completePasswordReset, getEmailFromPasswordResetCode } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { ApMasterLogoMark } from "@/components/ui/ap-master-logo-mark";

function firstQueryValue(value: string | string[] | undefined): string | undefined {
  if (value === undefined) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

export default function ResetPassword() {
  const router = useRouter();
  const { toast } = useToast();
  const [isVisible, setIsVisible] = useState(false);
  const [routerReady, setRouterReady] = useState(false);
  const [checkingLink, setCheckingLink] = useState(true);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [oobCode, setOobCode] = useState<string | null>(null);
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setIsVisible(true);
  }, []);

  useEffect(() => {
    if (!router.isReady) return;

    setRouterReady(true);

    const code = firstQueryValue(router.query.oobCode);
    if (!code) {
      setLinkError("This reset link is missing required information. Please request a new password reset from the sign-in page.");
      setCheckingLink(false);
      return;
    }

    let cancelled = false;
    setOobCode(code);

    getEmailFromPasswordResetCode(code)
      .then((email) => {
        if (!cancelled) {
          setAccountEmail(email);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setLinkError(err instanceof Error ? err.message : "Invalid or expired reset link.");
          setOobCode(null);
        }
      })
      .finally(() => {
        if (!cancelled) setCheckingLink(false);
      });

    return () => {
      cancelled = true;
    };
  }, [router.isReady, router.query.oobCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oobCode) return;
    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await completePasswordReset(oobCode, password);
      toast({
        title: "Password updated",
        description: "You can now sign in with your new password.",
      });
      const loginHref =
        accountEmail?.trim()
          ? `/login?email=${encodeURIComponent(accountEmail.trim())}`
          : "/login";
      await router.replace(loginHref);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  };

  if (!routerReady || checkingLink) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3 text-slate-700 dark:text-slate-200">
          <Loader2 className="w-6 h-6 animate-spin" />
          <div className="text-sm font-medium">Verifying reset link…</div>
        </div>
      </div>
    );
  }

  if (linkError || !oobCode) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-white dark:bg-slate-950">
        <div
          className={`max-w-md w-full transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          }`}
        >
          <div className="mb-8 text-center">
            <Link href="/" className="inline-flex items-center gap-2.5 justify-center mb-8">
              <ApMasterLogoMark size={40} className="rounded-xl shadow-glow-sm" />
              <span className="text-xl font-display font-bold text-slate-900 dark:text-white">APMaster</span>
            </Link>
            <h1 className="text-2xl font-display font-bold text-slate-900 dark:text-white mb-2">Link issue</h1>
          </div>
          <Alert className="border-rose-200 dark:border-rose-800/50 bg-rose-50 dark:bg-rose-500/10 rounded-xl mb-6">
            <AlertDescription className="text-rose-600 dark:text-rose-400 text-sm">{linkError}</AlertDescription>
          </Alert>
          <Button asChild className="w-full h-12 rounded-xl">
            <Link href="/forgot-password">Request a new reset link</Link>
          </Button>
          <p className="text-center mt-6 text-sm text-slate-500">
            <Link href="/login" className="text-blue-600 dark:text-blue-400 font-semibold">
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-slate-950">
        <div className="absolute inset-0">
          <div
            className="absolute top-1/3 left-1/3 w-[380px] h-[380px] bg-blue-500/20 rounded-full blur-[100px] animate-blob"
            style={{ animationDuration: "9s" }}
          />
          <div
            className="absolute bottom-1/3 right-1/4 w-[320px] h-[320px] bg-violet-500/15 rounded-full blur-[100px] animate-blob"
            style={{ animationDuration: "11s", animationDelay: "2s" }}
          />
        </div>
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-10">
            <ApMasterLogoMark size={40} className="rounded-xl shadow-glow" />
            <span className="text-xl font-display font-bold text-white">APMaster</span>
          </Link>
          <h2 className="text-4xl xl:text-5xl font-display font-bold text-white leading-tight mb-6">
            Choose a new
            <br />
            <span className="text-gradient">password</span>
          </h2>
          <p className="text-lg text-slate-400 max-w-md leading-relaxed">
            Pick a strong password you haven&apos;t used elsewhere. You&apos;ll use it with your email next time you
            sign in.
          </p>
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
              href="/login"
              className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-blue-600 transition-colors font-medium group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              Back to sign in
            </Link>
          </div>

          <div className="lg:hidden mb-8">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <ApMasterLogoMark size={40} className="rounded-xl shadow-glow-sm" />
              <span className="text-xl font-display font-bold text-slate-900 dark:text-white">APMaster</span>
            </Link>
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-display font-bold text-slate-900 dark:text-white mb-2">Set new password</h1>
            {accountEmail && (
              <p className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-2 flex-wrap">
                <Mail className="w-4 h-4 shrink-0" />
                <span className="break-all">{accountEmail}</span>
              </p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="new-password" className="text-slate-700 dark:text-slate-300 font-medium text-sm">
                New password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4.5 h-4.5" />
                <Input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError("");
                  }}
                  className="pl-11 pr-11 h-12 rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:border-blue-500 focus:ring-blue-500/20 transition-all"
                  placeholder="At least 6 characters"
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

            <div className="space-y-2">
              <Label htmlFor="confirm-password" className="text-slate-700 dark:text-slate-300 font-medium text-sm">
                Confirm password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4.5 h-4.5" />
                <Input
                  id="confirm-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (error) setError("");
                  }}
                  className="pl-11 h-12 rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:border-blue-500 focus:ring-blue-500/20 transition-all"
                  placeholder="Confirm your password"
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
                  Updating…
                </>
              ) : (
                "Save new password"
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
