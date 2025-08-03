import { Link } from "wouter";
import { BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Navigation() {
  return (
    <nav className="border-b border-khan-gray-light bg-white sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-khan-green rounded-lg flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-khan-gray-dark">APMaster</span>
          </Link>
          
          <div className="flex items-center space-x-6">
            <Link href="/learn" className="text-khan-gray-medium hover:text-khan-gray-dark font-medium transition-colors">
              Courses
            </Link>
            <Button 
              className="bg-khan-green text-white hover:bg-khan-green-light transition-colors font-semibold"
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