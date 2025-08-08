import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BookOpen, Eye, EyeOff, Loader2, Mail, Lock } from "lucide-react";
import { signUpWithEmail, loginWithEmail } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: ""
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (error) setError("");
  };

  const validateForm = () => {
    if (!formData.email || !formData.password) {
      setError("Please fill in all fields");
      return false;
    }
    
    if (!isLogin && formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return false;
    }
    
    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters long");
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    setError("");
    
    try {
      if (isLogin) {
        await loginWithEmail({
          email: formData.email,
          password: formData.password
        });
        toast({
          title: "Welcome back!",
          description: "You have successfully logged in.",
        });
      } else {
        await signUpWithEmail({
          email: formData.email,
          password: formData.password
        });
        toast({
          title: "Account created!",
          description: "Your account has been created successfully.",
        });
      }
      navigate("/dashboard", { replace: true });
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-khan-background flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <Link href="/" className="inline-flex items-center space-x-3 mb-8">
            <div className="w-12 h-12 bg-khan-green rounded-lg flex items-center justify-center">
              <BookOpen className="w-7 h-7 text-white" />
            </div>
            <span className="text-3xl font-bold text-khan-gray-dark">APMaster</span>
          </Link>
        </div>

        {/* Login/Signup Card */}
        <Card className="bg-white border-2 border-gray-100 shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-khan-gray-dark">
              {isLogin ? "Welcome back" : "Create your account"}
            </CardTitle>
            <CardDescription className="text-khan-gray-medium">
              {isLogin 
                ? "Sign in to continue your AP preparation journey" 
                : "Start your AP preparation journey today"}
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-khan-gray-dark font-medium">
                  Email address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-khan-gray-medium w-5 h-5" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleInputChange}
                    className="pl-10 border-2 border-gray-200 focus:border-khan-green"
                    placeholder="Enter your email"
                    data-testid="input-email"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-khan-gray-dark font-medium">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-khan-gray-medium w-5 h-5" />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={formData.password}
                    onChange={handleInputChange}
                    className="pl-10 pr-10 border-2 border-gray-200 focus:border-khan-green"
                    placeholder="Enter your password"
                    data-testid="input-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-khan-gray-medium hover:text-khan-gray-dark"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password Field (Signup only) */}
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-khan-gray-dark font-medium">
                    Confirm Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-khan-gray-medium w-5 h-5" />
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      required
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      className="pl-10 border-2 border-gray-200 focus:border-khan-green"
                      placeholder="Confirm your password"
                      data-testid="input-confirm-password"
                    />
                  </div>
                </div>
              )}

              {/* Error Alert */}
              {error && (
                <Alert className="border-khan-red/20 bg-khan-red/5">
                  <AlertDescription className="text-khan-red">
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-khan-green text-white hover:bg-khan-green-light transition-colors font-semibold py-3"
                data-testid="button-submit"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                    {isLogin ? "Signing in..." : "Creating account..."}
                  </>
                ) : (
                  isLogin ? "Sign In" : "Create Account"
                )}
              </Button>

              {/* Toggle Login/Signup */}
              <div className="text-center pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setError("");
                    setFormData({ email: "", password: "", confirmPassword: "" });
                  }}
                  className="text-khan-blue hover:text-khan-purple transition-colors font-medium"
                  data-testid="button-toggle-mode"
                >
                  {isLogin 
                    ? "Don't have an account? Sign up" 
                    : "Already have an account? Sign in"}
                </button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-khan-gray-medium">
          <p>
            By continuing, you agree to our{" "}
            <Link href="#" className="text-khan-blue hover:text-khan-purple transition-colors">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="#" className="text-khan-blue hover:text-khan-purple transition-colors">
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}