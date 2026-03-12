
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Loader2, User, Mail } from "lucide-react";
import Navigation from "@/components/ui/navigation";
import SimpleFooter from "@/components/sections/simple-footer";
import { useAuth } from "@/contexts/auth-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Profile() {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [hasChanges, setHasChanges] = useState(false);

  const { data: userProfile, isLoading: profileLoading } = useQuery<{
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

  useEffect(() => {
    if (userProfile?.data) {
      setFirstName(userProfile.data.firstName || "");
      setLastName(userProfile.data.lastName || "");
    }
  }, [userProfile]);

  useEffect(() => {
    if (userProfile?.data) {
      const changed = 
        firstName !== (userProfile.data.firstName || "") ||
        lastName !== (userProfile.data.lastName || "");
      setHasChanges(changed);
    }
  }, [firstName, lastName, userProfile]);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/login");
    }
  }, [loading, isAuthenticated, router]);

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      const displayName = `${firstName.trim()} ${lastName.trim()}`.trim();
      const response = await apiRequest("POST", "/api/user/profile", {
        displayName,
        email: user?.email,
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update profile");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userProfile"] });
      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated.",
      });
      setHasChanges(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating profile",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim()) {
      toast({
        title: "Validation error",
        description: "First name is required.",
        variant: "destructive",
      });
      return;
    }
    updateProfileMutation.mutate();
  };

  if (loading || profileLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0B0F1A]">
        <Navigation />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="relative w-12 h-12 mx-auto mb-4">
              <div className="absolute inset-0 rounded-full border-2 border-blue-200 dark:border-blue-800" />
              <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-blue-500 animate-spin" />
            </div>
            <p className="text-slate-500 dark:text-slate-400 font-medium">Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B0F1A] relative overflow-hidden">

      <Navigation />
      <main className="py-6 px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-3xl mx-auto">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-display font-bold text-slate-900 dark:text-white">Profile Settings</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Manage your account information</p>
          </div>

          <Card className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
                <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                Personal Information
              </CardTitle>
              <CardDescription className="text-slate-500 dark:text-slate-400">
                Update your display name and personal details
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-slate-900 dark:text-slate-100 font-medium flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={userProfile?.data?.email || user?.email || ""}
                    disabled
                    className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                  <p className="text-sm text-slate-500 dark:text-slate-400">Your email cannot be changed</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="text-slate-900 dark:text-slate-100 font-medium">
                      First Name
                    </Label>
                    <Input
                      id="firstName"
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="border border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl bg-white dark:bg-slate-800/50 transition-all duration-150 ease-out"
                      placeholder="Enter your first name"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="text-slate-900 dark:text-slate-100 font-medium">
                      Last Name
                    </Label>
                    <Input
                      id="lastName"
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="border border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl bg-white dark:bg-slate-800/50 transition-all duration-150 ease-out"
                      placeholder="Enter your last name"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-900 dark:text-slate-100 font-medium">Display Name</Label>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl">
                    <p className="text-slate-900 dark:text-white">
                      {firstName.trim() && lastName.trim() 
                        ? `${firstName.trim()} ${lastName.trim()}`
                        : firstName.trim() || "Not set"}
                    </p>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    This is how your name will appear throughout the app
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    type="submit"
                    disabled={!hasChanges || updateProfileMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-semibold rounded-xl shadow-sm hover:shadow-md transition-all duration-150 ease-out hover:scale-[1.02] active:scale-[0.98]"
                  >
                    {updateProfileMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push("/dashboard")}
                    className="border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all duration-150 ease-out"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
      <SimpleFooter />
    </div>
  );
}
