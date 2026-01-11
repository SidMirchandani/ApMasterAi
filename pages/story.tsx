import Navigation from "@/components/ui/navigation";
import Footer from "@/components/sections/footer";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, Lightbulb, Target, Users } from "lucide-react";

export default function Story() {
  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      
      <main className="max-w-4xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-2 bg-[#36b37e]/10 text-[#36b37e] rounded-full text-sm font-semibold mb-4">
            Our Story
          </span>
          <h1 className="text-4xl font-bold text-[#2d3b45] sm:text-5xl tracking-tight mb-4">
            Why We Built APMaster.ai
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            A journey from frustrated students to passionate problem-solvers
          </p>
        </div>

        <div className="prose prose-lg max-w-none text-gray-700 leading-relaxed space-y-8">
          <p className="text-xl">
            We've been there. The late nights cramming, the stress of expensive prep courses, the feeling that success was somehow out of reach. As students ourselves, we saw firsthand how the AP preparation landscape was broken.
          </p>

          <div className="grid md:grid-cols-2 gap-6 my-12">
            <Card className="border-2 border-gray-100">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mb-4">
                  <Heart className="w-6 h-6 text-red-500" />
                </div>
                <h3 className="font-semibold text-[#2d3b45] mb-2">The Problem We Saw</h3>
                <p className="text-gray-600 text-sm">
                  Quality AP prep was expensive, stressful, and inaccessible. Too many students were left behind simply because they couldn't afford the resources.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 border-gray-100">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-[#36b37e]/10 rounded-xl flex items-center justify-center mb-4">
                  <Lightbulb className="w-6 h-6 text-[#36b37e]" />
                </div>
                <h3 className="font-semibold text-[#2d3b45] mb-2">The Lightbulb Moment</h3>
                <p className="text-gray-600 text-sm">
                  We realized that AI could democratize education—providing personalized, adaptive learning to everyone, not just those who could pay for tutors.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 border-gray-100">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                  <Target className="w-6 h-6 text-blue-500" />
                </div>
                <h3 className="font-semibold text-[#2d3b45] mb-2">Our Mission</h3>
                <p className="text-gray-600 text-sm">
                  To make elite-level AP preparation accessible to every student, regardless of background, location, or financial situation.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 border-gray-100">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
                  <Users className="w-6 h-6 text-purple-500" />
                </div>
                <h3 className="font-semibold text-[#2d3b45] mb-2">Built By Students</h3>
                <p className="text-gray-600 text-sm">
                  APMaster.ai is built by students who understand the challenges you face, with input from educators who know what works.
                </p>
              </CardContent>
            </Card>
          </div>

          <h2 className="text-2xl font-bold text-[#2d3b45] mt-12">The Journey</h2>

          <p>
            It started with a simple observation: the students who got 5s on their AP exams weren't necessarily smarter—they just had access to better resources. Private tutors, expensive prep courses, and unlimited practice materials.
          </p>

          <p>
            We asked ourselves: what if AI could be that tutor? What if technology could provide personalized feedback, adaptive practice, and instant explanations—for free?
          </p>

          <p>
            That's when APMaster.ai was born. We spent months researching learning science, building AI models, and testing with real students. We talked to teachers, analyzed exam patterns, and refined our approach until we created something we're truly proud of.
          </p>

          <div className="bg-[#36b37e]/5 p-8 rounded-2xl border border-[#36b37e]/10 my-10">
            <p className="text-lg font-medium text-[#2d3b45] italic">
              "We built the tool we wished we had. Now we're giving it to every student who needs it."
            </p>
            <p className="text-[#36b37e] font-medium mt-4">— The APMaster Team</p>
          </div>

          <h2 className="text-2xl font-bold text-[#2d3b45] mt-12">What's Next</h2>

          <p>
            We're just getting started. Our roadmap includes more AP subjects, deeper AI personalization, and features designed with student feedback at every step. We're committed to staying free, staying student-focused, and continuing to prove that the best education doesn't have to come with a price tag.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
