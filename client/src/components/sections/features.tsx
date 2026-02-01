
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
    <section className="py-24 md:py-32 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-5xl font-extrabold text-foreground mb-6 tracking-tight">
            Everything You Need to Succeed
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto font-medium">
            Our platform combines cutting-edge AI technology with proven learning methods to accelerate your progress.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="group p-8 rounded-3xl bg-background border border-transparent hover:border-khan-green/10 hover:shadow-2xl hover:shadow-khan-green/5 transition-all duration-500">
              <div className="w-16 h-16 bg-khan-green/10 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 group-hover:bg-khan-green group-hover:rotate-3 transition-all duration-500">
                <feature.icon className="w-8 h-8 text-khan-green group-hover:text-white transition-colors" />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-4 tracking-tight">{feature.title}</h3>
              <p className="text-muted-foreground leading-relaxed font-medium">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
