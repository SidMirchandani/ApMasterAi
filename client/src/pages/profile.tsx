
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Loader2, User, Mail } from "lucide-react";
import Navigation from "@/components/ui/navigation";
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
      <div className="min-h-screen bg-khan-background">
        <Navigation />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-khan-green mx-auto mb-4"></div>
            <p className="text-khan-gray-medium">Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-khan-background">
      <Navigation />
      <main className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8 flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => router.push("/dashboard")}
              className="p-2"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-khan-gray-dark">Profile Settings</h1>
              <p className="text-khan-gray-medium mt-1">Manage your account information</p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-khan-green" />
                Personal Information
              </CardTitle>
              <CardDescription>
                Update your display name and personal details
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-khan-gray-dark font-medium flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={userProfile?.data?.email || user?.email || ""}
                    disabled
                    className="bg-gray-50 border-2 border-gray-200"
                  />
                  <p className="text-sm text-khan-gray-medium">Your email cannot be changed</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="text-khan-gray-dark font-medium">
                      First Name
                    </Label>
                    <Input
                      id="firstName"
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="border-2 border-gray-200 focus:border-khan-green"
                      placeholder="Enter your first name"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="text-khan-gray-dark font-medium">
                      Last Name
                    </Label>
                    <Input
                      id="lastName"
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="border-2 border-gray-200 focus:border-khan-green"
                      placeholder="Enter your last name"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-khan-gray-dark font-medium">Display Name</Label>
                  <div className="p-3 bg-gray-50 border-2 border-gray-200 rounded-md">
                    <p className="text-khan-gray-dark">
                      {firstName.trim() && lastName.trim() 
                        ? `${firstName.trim()} ${lastName.trim()}`
                        : firstName.trim() || "Not set"}
                    </p>
                  </div>
                  <p className="text-sm text-khan-gray-medium">
                    This is how your name will appear throughout the app
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="submit"
                    disabled={!hasChanges || updateProfileMutation.isPending}
                    className="bg-khan-green text-white hover:bg-khan-green-light transition-colors font-semibold"
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
                    className="border-2 border-khan-gray-light"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
