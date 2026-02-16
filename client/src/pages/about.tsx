import Navigation from "@/components/ui/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, Linkedin, Mail } from "lucide-react";

export default function About() {
  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      
      <main className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-[#36b37e] rounded-2xl mb-4 shadow-lg shadow-green-100">
            <BookOpen className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-[#2d3b45] sm:text-4xl tracking-tight mb-4">
            About APMaster.ai
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Democratizing elite-level AP preparation for every student.
          </p>
        </div>

        <Card className="border-none shadow-xl bg-gradient-to-br from-gray-50 to-white overflow-hidden mb-16">
          <CardContent className="p-6 sm:p-8">
            <div className="prose prose-lg max-w-none text-gray-700 leading-relaxed">
              <p className="text-2xl font-bold text-[#2d3b45] mb-4 border-l-4 border-[#36b37e] pl-6 italic">
                AP success shouldn’t come with a price tag.
              </p>
              
              <div className="space-y-4">
                <p>
                  Too many students face AP exams feeling unprepared, not because they lack ability, but because high-quality resources are locked behind paywalls. Traditional test prep has become expensive, stressful, and unequal, creating gaps where opportunity should exist.
                </p>
                
                <p className="font-semibold text-[#2d3b45]">
                  Our mission is to close that gap.
                </p>
                
                <p>
                  APMaster.ai is designed to make elite-level AP preparation accessible to every student, regardless of background. By combining artificial intelligence, adaptive learning, and thoughtful design, we turn studying into a personalized, efficient, and confidence-building experience—not a burden.
                </p>
                
                <p>
                  AI allows us to go beyond static textbooks and one-size-fits-all courses. It enables real-time feedback, targeted practice, and explanations that adjust to how you learn. Students can explore concepts deeply, fix weaknesses faster, and study on their own terms, without pressure or intimidation.
                </p>
                
                <p>
                  But we don’t believe technology should replace people. Education works best when innovation is paired with intention. That’s why APMaster.ai is built with student voices, educator insight, and a commitment to accuracy, clarity, and fairness at its core.
                </p>
                
                <div className="bg-[#36b37e]/5 p-6 rounded-2xl border border-[#36b37e]/10 my-6">
                  <p className="text-xl font-bold text-[#2d3b45] mb-4">Our vision is simple but ambitious:</p>
                  <p className="text-lg text-[#2d3b45]">
                    To democratize AP education, remove financial and structural barriers, and empower students everywhere to reach their full academic potential.
                  </p>
                </div>
                
                <p className="text-xl font-medium text-[#2d3b45]">
                  No gatekeeping. No unnecessary stress. Just smarter, more accessible learning.
                </p>
                
                <p>
                  APMaster.ai exists to prove that excellence in education should be available to everyone, not just a few.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mt-12">
          <h2 className="text-3xl font-bold text-[#2d3b45] text-center mb-6">Our Team</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="text-center group">
              <div className="w-32 h-32 bg-[#36b37e]/10 rounded-full mx-auto mb-4 flex items-center justify-center border-4 border-[#36b37e]/20 transition-all duration-300 group-hover:border-[#36b37e]">
                <span className="text-4xl font-bold text-[#36b37e]">SM</span>
              </div>
              <h3 className="text-2xl font-bold text-[#2d3b45] mb-2">Siddharth Mirchandani</h3>
              <p className="text-[#36b37e] font-semibold mb-4">Co-founder</p>
              <div className="flex justify-center gap-4">
                <a href="https://www.linkedin.com/in/siddharth-mirchandani-b0b282264/" target="_blank" rel="noopener noreferrer" className="p-2 rounded-full bg-gray-100 text-gray-600 hover:bg-[#36b37e] hover:text-white transition-colors">
                  <Linkedin className="w-5 h-5" />
                </a>
                <a href="mailto:siddharth.mirchandani@gmail.com" className="p-2 rounded-full bg-gray-100 text-gray-600 hover:bg-[#36b37e] hover:text-white transition-colors">
                  <Mail className="w-5 h-5" />
                </a>
              </div>
            </div>

            <div className="text-center group">
              <div className="w-32 h-32 bg-[#36b37e]/10 rounded-full mx-auto mb-4 flex items-center justify-center border-4 border-[#36b37e]/20 transition-all duration-300 group-hover:border-[#36b37e]">
                <span className="text-4xl font-bold text-[#36b37e]">VS</span>
              </div>
              <h3 className="text-2xl font-bold text-[#2d3b45] mb-2">Vivana Satiani</h3>
              <p className="text-[#36b37e] font-semibold mb-4">Co-founder</p>
              <div className="flex justify-center gap-4">
                <a href="https://www.linkedin.com/in/vivanasatiani/" target="_blank" rel="noopener noreferrer" className="p-2 rounded-full bg-gray-100 text-gray-600 hover:bg-[#36b37e] hover:text-white transition-colors">
                  <Linkedin className="w-5 h-5" />
                </a>
                <a href="mailto:satianivivana@gmail.com" className="p-2 rounded-full bg-gray-100 text-gray-600 hover:bg-[#36b37e] hover:text-white transition-colors">
                  <Mail className="w-5 h-5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-gray-50 border-t border-gray-200 py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center text-gray-500 text-sm">
          <p>&copy; {new Date().getFullYear()} APMaster.ai. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
