import Navigation from "@/components/ui/navigation";
import { Hero } from "@/components/sections/hero";
import { Features } from "@/components/sections/features";
import { useRouter } from "next/router";
import { useAuth } from "@/hooks/useAuth";


export default function Home() {
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();

  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      <Hero />
      <Features />
    </div>
  );
}