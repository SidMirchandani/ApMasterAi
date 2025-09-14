import { Button } from "@/components/ui/button";
import { ArrowRight, BookOpen, Star } from "lucide-react";
import Link from "next/link";

export default function Hero() {
  return (
    <section className="bg-khan-background pt-20 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto text-center">
        <div className="mb-8">
          <div className="inline-flex items-center space-x-2 bg-khan-green/10 border border-khan-green/20 rounded-full px-4 py-2 text-sm">
            <BookOpen className="w-4 h-4 text-khan-green" />
            <span className="text-khan-green font-medium">AI-Powered Learning</span>
          </div>
        </div>
        
        <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-khan-gray-dark mb-6 leading-tight">
          Master Your <span className="text-khan-green">AP Exams</span>
        </h1>
        
        <p className="text-xl text-khan-gray-medium mb-8 max-w-2xl mx-auto leading-relaxed">
          Personalized learning that adapts to your pace. Practice with real AP questions, get instant feedback, and track your progress across all subjects.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
          <Link href="/learn">
            <Button 
              size="lg"
              className="bg-khan-green text-white hover:bg-khan-green-light transition-colors px-8 py-4 text-lg font-semibold"
            >
              Start Learning
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        </div>
        
        <div className="flex items-center justify-center space-x-6 text-sm text-khan-gray-medium">
          <div className="flex items-center space-x-1">
            <div className="flex space-x-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-current text-khan-orange" />
              ))}
            </div>
            <span>Trusted by thousands of students</span>
          </div>
          <div className="h-4 w-px bg-khan-gray-light" />
          <span>100% Free • Start Learning Today</span>
        </div>
      </div>
    </section>
  );
}