import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Star } from "lucide-react";
import { Link } from "wouter";

export default function Hero() {
  return (
    <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto text-center">
        <div className="mb-8">
          <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-gemini-blue/10 to-gemini-purple/10 border border-gemini-blue/20 rounded-full px-4 py-2 text-sm">
            <Sparkles className="w-4 h-4 text-gemini-blue" />
            <span className="text-gemini-blue font-medium">Powered by Gemini AI</span>
          </div>
        </div>
        
        <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-6 leading-tight">
          Master Your <span className="bg-gradient-to-r from-gemini-blue to-gemini-purple bg-clip-text text-transparent">AP Exams</span>
        </h1>
        
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed">
          AI-powered personalized learning that adapts to your pace. Take diagnostic tests, access comprehensive study materials, and track your progress across all AP subjects.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
          <Button 
            size="lg"
            className="bg-gradient-to-r from-gemini-blue to-gemini-purple text-white hover:opacity-90 transition-opacity px-8 py-4 text-lg font-semibold"
            asChild
          >
            <Link href="/learn">
              Start Learning
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
          </Button>
          
          <Button 
            variant="outline" 
            size="lg"
            className="border-2 border-gray-300 text-gray-700 hover:bg-gray-50 px-8 py-4 text-lg font-semibold"
          >
            Take Diagnostic Test
          </Button>
        </div>
        
        <div className="flex items-center justify-center space-x-6 text-sm text-gray-500">
          <div className="flex items-center space-x-1">
            <div className="flex space-x-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-current text-yellow-400" />
              ))}
            </div>
            <span>4.9/5 from students</span>
          </div>
          <div className="h-4 w-px bg-gray-300" />
          <span>100% Free • No Signup Required</span>
        </div>
      </div>
    </section>
  );
}