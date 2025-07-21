import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Shield, Gift, Heart } from "lucide-react";

export default function Waitlist() {
  const [email, setEmail] = useState("");
  const { toast } = useToast();

  const waitlistMutation = useMutation({
    mutationFn: async (email: string) => {
      const response = await apiRequest("POST", "/api/waitlist", { email });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Successfully joined waitlist!",
        description: "We'll notify you when the beta is ready.",
      });
      setEmail("");
    },
    onError: (error: any) => {
      const errorMessage = error.message.includes("409") 
        ? "This email is already registered for our waitlist"
        : error.message.includes("400")
        ? "Please enter a valid email address"
        : "Failed to join waitlist. Please try again.";
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast({
        title: "Error",
        description: "Please enter your email address",
        variant: "destructive",
      });
      return;
    }
    waitlistMutation.mutate(email.trim());
  };

  return (
    <section id="waitlist" className="py-20 bg-gradient-to-br from-teal/10 to-sage/10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="bg-white rounded-3xl shadow-2xl p-12">
          <h2 className="text-3xl md:text-4xl font-bold text-navy mb-6">
            Ready to <span className="text-coral">Transform</span> Your AP Prep?
          </h2>
          <p className="text-lg text-navy/70 mb-8 max-w-2xl mx-auto">
            Join our exclusive beta waitlist and be among the first to experience AI-powered AP preparation. Limited spots available for January 2026 launch.
          </p>
          
          <form onSubmit={handleSubmit} className="max-w-md mx-auto mb-8">
            <div className="flex flex-col sm:flex-row gap-4">
              <Input 
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 px-6 py-4 rounded-lg border border-sage/30 focus:ring-2 focus:ring-teal focus:border-transparent"
                disabled={waitlistMutation.isPending}
              />
              <Button 
                type="submit"
                disabled={waitlistMutation.isPending}
                className="bg-teal text-white px-8 py-4 rounded-lg hover:bg-teal/90 transition-colors font-semibold whitespace-nowrap disabled:opacity-50"
              >
                {waitlistMutation.isPending ? "Joining..." : "Join Waitlist"}
              </Button>
            </div>
          </form>
          
          <div className="flex justify-center items-center space-x-8 text-sm text-navy/60">
            <div className="flex items-center">
              <Shield className="text-teal mr-2 w-4 h-4" />
              No spam, ever
            </div>
            <div className="flex items-center">
              <Gift className="text-coral mr-2 w-4 h-4" />
              Early access perks
            </div>
            <div className="flex items-center">
              <Heart className="text-sage mr-2 w-4 h-4" />
              Always free
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}