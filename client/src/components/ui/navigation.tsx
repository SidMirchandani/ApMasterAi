import { Link } from "wouter";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Navigation() {
  return (
    <nav className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-gemini-blue to-gemini-purple rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-semibold text-gray-900">APMaster.ai</span>
          </Link>
          
          <div className="flex items-center space-x-6">
            <Link href="/learn" className="text-gray-600 hover:text-gray-900 font-medium transition-colors">
              Start Learning
            </Link>
            <Button 
              className="bg-gradient-to-r from-gemini-blue to-gemini-purple text-white hover:opacity-90 transition-opacity"
              asChild
            >
              <Link href="/learn">Get Started</Link>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}