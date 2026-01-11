
import { Brain, Target, TrendingUp, ShieldCheck, Zap, MessageSquare, ListChecks, BarChart3 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: Brain,
    title: "AI Personalization",
    description: "Our proprietary algorithm maps your knowledge and crafts a custom study path tailored to your specific goals.",
    color: "bg-blue-500",
  },
  {
    icon: Target,
    title: "Adaptive Practice",
    description: "Smart questions that get harder as you improve, ensuring you're always challenged but never overwhelmed.",
    color: "bg-green-500",
  },
  {
    icon: MessageSquare,
    title: "24/7 AI Tutoring",
    description: "Stuck on a problem? Our AI tutor provides step-by-step explanations and clarifies complex concepts instantly.",
    color: "bg-purple-500",
  },
  {
    icon: BarChart3,
    title: "Score Analytics",
    description: "Detailed performance breakdown by unit and skill level. Know exactly where you stand before exam day.",
    color: "bg-orange-500",
  },
  {
    icon: ShieldCheck,
    title: "Official Content",
    description: "All materials are aligned with the latest College Board standards and updated annually by AP experts.",
    color: "bg-red-500",
  },
  {
    icon: ListChecks,
    title: "Full-Length Exams",
    description: "Proctored simulation tests that mirror the real exam experience, including timing and scoring scales.",
    color: "bg-cyan-500",
  }
];

export function Features() {
  return (
    <section className="py-24 md:py-32 bg-gray-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-20">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-khan-green/10 text-khan-green text-sm font-bold mb-6">
            <Zap className="w-4 h-4 fill-current" />
            <span>Platform Features</span>
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-foreground mb-6 tracking-tight">
            The Smartest Way to Get a 5
          </h2>
          <p className="text-xl text-muted-foreground font-medium leading-relaxed">
            Stop guessing and start growing. Our all-in-one platform provides the tools, data, and support you need to excel.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div 
              key={index} 
              className="group p-10 rounded-[2.5rem] bg-white border border-border hover:border-khan-green/20 hover:shadow-[0_20px_50px_rgba(0,0,0,0.05)] transition-all duration-500 relative overflow-hidden"
            >
              <div className="relative z-10">
                <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 group-hover:bg-khan-green group-hover:text-white transition-all duration-500">
                  <feature.icon className="w-8 h-8 transition-colors" />
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-4 tracking-tight">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed font-medium">
                  {feature.description}
                </p>
              </div>
              
              {/* Subtle background glow */}
              <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-gray-50 rounded-full blur-3xl group-hover:bg-khan-green/5 transition-colors duration-500" />
            </div>
          ))}
        </div>
        
        <div className="mt-20 p-12 rounded-[3rem] bg-[#2d3b45] text-white relative overflow-hidden">
           <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-10">
              <div className="max-w-xl">
                 <h3 className="text-3xl md:text-4xl font-black mb-6 leading-tight">Ready to boost your score?</h3>
                 <p className="text-lg text-gray-300 font-medium mb-8">
                    Join thousands of students who have already transformed their AP prep experience with APMaster.
                 </p>
                 <Link href="/signup">
                    <Button size="lg" className="bg-khan-green hover:bg-khan-green/90 text-white font-bold px-10 py-7 text-lg rounded-2xl">
                       Get Started For Free
                    </Button>
                 </Link>
              </div>
              <div className="grid grid-cols-2 gap-6 w-full md:w-auto">
                 <div className="p-6 rounded-3xl bg-white/10 backdrop-blur-sm border border-white/10 text-center">
                    <div className="text-3xl font-black mb-1">5.0</div>
                    <div className="text-xs font-bold uppercase tracking-wider text-gray-400">Avg Target Score</div>
                 </div>
                 <div className="p-6 rounded-3xl bg-white/10 backdrop-blur-sm border border-white/10 text-center">
                    <div className="text-3xl font-black mb-1">1.2pt</div>
                    <div className="text-xs font-bold uppercase tracking-wider text-gray-400">Avg Improvement</div>
                 </div>
                 <div className="p-6 rounded-3xl bg-white/10 backdrop-blur-sm border border-white/10 text-center">
                    <div className="text-3xl font-black mb-1">100%</div>
                    <div className="text-xs font-bold uppercase tracking-wider text-gray-400">Curriculum Coverage</div>
                 </div>
                 <div className="p-6 rounded-3xl bg-white/10 backdrop-blur-sm border border-white/10 text-center">
                    <div className="text-3xl font-black mb-1">24/7</div>
                    <div className="text-xs font-bold uppercase tracking-wider text-gray-400">Expert Support</div>
                 </div>
              </div>
           </div>
           
           {/* Abstract background shapes */}
           <div className="absolute top-0 right-0 w-96 h-96 bg-khan-green/10 rounded-full blur-[100px] -mr-48 -mt-48" />
           <div className="absolute bottom-0 left-0 w-96 h-96 bg-khan-blue/10 rounded-full blur-[100px] -ml-48 -mb-48" />
        </div>
      </div>
    </section>
  );
}
