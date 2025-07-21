import Navigation from "@/components/ui/navigation";
import Hero from "@/components/sections/hero";
import Features from "@/components/sections/features";

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      <Hero />
      <Features />
    </div>
  );
}
