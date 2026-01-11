import Navigation from "@/components/ui/navigation";
import Footer from "@/components/sections/footer";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function About() {
  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      
      <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="inline-block px-4 py-2 bg-[#36b37e]/10 text-[#36b37e] rounded-full text-sm font-semibold mb-6">
            About Us
          </span>
          <h1 className="text-4xl font-bold text-[#2d3b45] sm:text-5xl tracking-tight mb-6">
            A Message from Our Founders
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Why we're building the future of AP preparation
          </p>
        </div>
      </section>

      <main className="max-w-4xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <div className="prose prose-lg max-w-none text-gray-700 leading-relaxed">
          <div className="bg-gradient-to-r from-[#36b37e]/5 to-blue-50/50 p-8 rounded-2xl border-l-4 border-[#36b37e] mb-12">
            <p className="text-2xl font-bold text-[#2d3b45] italic m-0">
              "AP success shouldn't come with a price tag."
            </p>
          </div>
          
          <div className="space-y-6">
            <p>
              Too many students face AP exams feeling unprepared, not because they lack ability, but because high-quality resources are locked behind paywalls. Traditional test prep has become expensive, stressful, and unequal, creating gaps where opportunity should exist.
            </p>
            
            <p className="text-xl font-semibold text-[#2d3b45]">
              Our mission is to close that gap.
            </p>
            
            <p>
              APMaster.ai is designed to make elite-level AP preparation accessible to every student, regardless of background. By combining artificial intelligence, adaptive learning, and thoughtful design, we turn studying into a personalized, efficient, and confidence-building experience—not a burden.
            </p>
            
            <p>
              AI allows us to go beyond static textbooks and one-size-fits-all courses. It enables real-time feedback, targeted practice, and explanations that adjust to how you learn. Students can explore concepts deeply, fix weaknesses faster, and study on their own terms, without pressure or intimidation.
            </p>
            
            <p>
              But we don't believe technology should replace people. Education works best when innovation is paired with intention. That's why APMaster.ai is built with student voices, educator insight, and a commitment to accuracy, clarity, and fairness at its core.
            </p>
          </div>

          <div className="bg-[#36b37e]/5 p-10 rounded-3xl border border-[#36b37e]/10 my-12">
            <p className="text-xl font-bold text-[#2d3b45] mb-4">Our vision is simple but ambitious:</p>
            <p className="text-lg text-[#2d3b45] leading-relaxed">
              To democratize AP education, remove financial and structural barriers, and empower students everywhere to reach their full academic potential.
            </p>
          </div>
          
          <div className="text-center py-8">
            <p className="text-2xl font-bold text-[#2d3b45] mb-2">
              No gatekeeping. No unnecessary stress.
            </p>
            <p className="text-2xl font-bold text-[#36b37e]">
              Just smarter, more accessible learning.
            </p>
          </div>

          <p className="text-lg">
            APMaster.ai exists to prove that excellence in education should be available to everyone, not just a few.
          </p>

          <div className="mt-16 pt-10 border-t-2 border-gray-100">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div>
                <p className="font-bold text-xl text-[#2d3b45] mb-1">Vivana Satiani & Siddharth Mirchandani</p>
                <p className="text-[#36b37e] font-semibold">Founders, APMaster.ai</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-20 bg-gradient-to-r from-gray-50 to-[#36b37e]/5 rounded-3xl p-10 text-center">
          <h2 className="text-2xl font-bold text-[#2d3b45] mb-4">
            Want to learn more about our journey?
          </h2>
          <p className="text-gray-600 mb-6">
            Discover how APMaster.ai came to be and where we're headed.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/story">
              <Button className="bg-[#36b37e] hover:bg-[#2fa371] text-white px-6 py-3 rounded-xl font-semibold">
                Read Our Story
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
            <Link href="/get-involved">
              <Button variant="outline" className="border-2 border-gray-300 text-gray-700 hover:border-[#36b37e] hover:text-[#36b37e] px-6 py-3 rounded-xl font-semibold">
                Get Involved
              </Button>
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
