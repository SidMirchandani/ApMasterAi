import { Check } from "lucide-react";

export default function Benefits() {
  const benefits = [
    {
      title: "100% Free Access",
      description: "No hidden fees, premium tiers, or paywalls. Quality AP prep should be accessible to everyone.",
      iconBg: "bg-coral/10",
      iconColor: "text-coral"
    },
    {
      title: "Personalized Learning Path",
      description: "AI analyzes your performance and creates custom study plans that adapt to your progress.",
      iconBg: "bg-teal/10",
      iconColor: "text-teal"
    },
    {
      title: "Instant Feedback",
      description: "Get immediate explanations for every question with AI-powered insights and learning tips.",
      iconBg: "bg-sage/20",
      iconColor: "text-sage"
    },
    {
      title: "Proven Results",
      description: "Students using our beta version show average score improvements of 95% on practice tests.",
      iconBg: "bg-peach/20",
      iconColor: "text-coral"
    }
  ];

  return (
    <section id="benefits" className="py-20 bg-gradient-to-br from-navy/5 to-teal/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <img 
              src="https://images.unsplash.com/photo-1555066931-4365d14bab8c?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=800&h=600" 
              alt="AI technology being used in educational setting" 
              className="rounded-2xl shadow-2xl w-full h-auto"
            />
          </div>
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-navy mb-8">
              Why Choose <span className="text-teal">APMaster.ai</span>?
            </h2>
            
            <div className="space-y-6">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-start space-x-4">
                  <div className={`w-8 h-8 ${benefit.iconBg} rounded-full flex items-center justify-center flex-shrink-0 mt-1`}>
                    <Check className={`${benefit.iconColor} text-sm w-4 h-4`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-navy mb-2">{benefit.title}</h3>
                    <p className="text-navy/70">{benefit.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}