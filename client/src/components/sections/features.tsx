
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
    <section className="py-12 md:py-16 lg:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8 sm:mb-12 lg:mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-khan-gray-dark mb-3 sm:mb-4">
            Everything You Need to Succeed
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-khan-gray-medium max-w-2xl mx-auto px-4">
            Our platform combines cutting-edge AI technology with proven learning methods.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="border-khan-gray-light hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3 sm:pb-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-khan-green/10 rounded-lg flex items-center justify-center mb-3 sm:mb-4">
                  <feature.icon className="w-5 h-5 sm:w-6 sm:h-6 text-khan-green" />
                </div>
                <CardTitle className="text-lg sm:text-xl text-khan-gray-dark">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm sm:text-base text-khan-gray-medium">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
