
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
    <section className="py-24 md:py-32 bg-[#f8f9fa]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-20">
          <h2 className="text-3xl md:text-4xl font-extrabold text-[#2d3b45] mb-6 tracking-tight">
            Everything You Need to Succeed
          </h2>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto font-medium leading-relaxed">
            Our platform combines cutting-edge AI technology with proven learning methods to accelerate your progress and boost your scores.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="group p-8 rounded-2xl bg-white border border-gray-200 hover:border-[#36b37e]/20 hover:shadow-xl hover:shadow-[#36b37e]/5 transition-all duration-500">
              <div className="w-14 h-14 bg-[#36b37e]/10 rounded-xl flex items-center justify-center mb-8 group-hover:scale-110 group-hover:bg-[#36b37e] transition-all duration-500 shadow-sm shadow-[#36b37e]/10">
                <feature.icon className="w-7 h-7 text-[#36b37e] group-hover:text-white transition-colors" />
              </div>
              <h3 className="text-xl font-bold text-[#2d3b45] mb-4 tracking-tight">{feature.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed font-medium">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
