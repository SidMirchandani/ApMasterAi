
import { BookOpen, Brain, Target, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const features = [
  {
    icon: Brain,
    title: "AI-Powered Learning",
    description: "Get personalized study recommendations based on your performance and learning style."
  },
  {
    icon: Target,
    title: "Adaptive Practice",
    description: "Practice with questions that adapt to your skill level and focus on areas you need to improve."
  },
  {
    icon: TrendingUp,
    title: "Progress Tracking",
    description: "Monitor your progress with detailed analytics and insights into your learning journey."
  },
  {
    icon: BookOpen,
    title: "Comprehensive Content",
    description: "Access complete course materials covering all AP subjects with expert-created content."
  }
];

export function Features() {
  return (
    <section className="py-24 md:py-32 bg-background/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-6xl font-semibold text-foreground mb-6 tracking-tight">
            Designed for <span className="italic font-light">Performance.</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto font-light leading-relaxed">
            Our platform merges clinical precision with intuitive design to accelerate your academic trajectory.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {features.map((feature, index) => (
            <div key={index} className="group p-10 rounded-[2rem] bg-background border border-border/50 hover:border-primary/20 hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500">
              <div className="w-14 h-14 bg-primary/5 rounded-2xl flex items-center justify-center mb-10 group-hover:scale-110 group-hover:bg-primary group-hover:rotate-3 transition-all duration-500">
                <feature.icon className="w-7 h-7 text-primary group-hover:text-primary-foreground transition-colors" />
              </div>
              <h3 className="text-2xl font-semibold text-foreground mb-4 tracking-tight">{feature.title}</h3>
              <p className="text-muted-foreground leading-relaxed font-light text-lg">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
