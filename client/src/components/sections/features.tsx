import { Brain, Target, BarChart3, Clock } from "lucide-react";

export default function Features() {
  const features = [
    {
      icon: Brain,
      title: "Personalized Learning",
      description: "AI adapts to your learning style and provides explanations tailored to your understanding level.",
      color: "bg-khan-blue"
    },
    {
      icon: Target,
      title: "Practice by Topic",
      description: "Focus on specific areas where you need improvement with targeted practice questions.",
      color: "bg-khan-purple"
    },
    {
      icon: BarChart3,
      title: "Track Progress",
      description: "See detailed analytics on your strengths and areas that need more work.",
      color: "bg-khan-orange"
    },
    {
      icon: Clock,
      title: "Exam Simulation",
      description: "Practice under real exam conditions with accurate timing and question formats.",
      color: "bg-khan-red"
    }
  ];

  return (
    <section className="py-20 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-khan-gray-dark mb-4">
            Everything you need to succeed
          </h2>
          <p className="text-xl text-khan-gray-medium max-w-2xl mx-auto">
            Comprehensive AP preparation with personalized learning paths
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="bg-white p-6 rounded-lg border-2 border-gray-100 hover:border-khan-green/30 hover:shadow-md transition-all">
              <div className={`w-14 h-14 ${feature.color} rounded-lg flex items-center justify-center mb-4`}>
                <feature.icon className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-lg font-bold text-khan-gray-dark mb-3">{feature.title}</h3>
              <p className="text-khan-gray-medium leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}