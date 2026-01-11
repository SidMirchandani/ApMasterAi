import Navigation from "@/components/ui/navigation";
import Footer from "@/components/sections/footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, PenTool, Share2, Users, Mail, Github } from "lucide-react";
import Link from "next/link";

export default function GetInvolved() {
  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      
      <main className="max-w-5xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-2 bg-purple-100 text-purple-600 rounded-full text-sm font-semibold mb-4">
            Join the Movement
          </span>
          <h1 className="text-4xl font-bold text-[#2d3b45] sm:text-5xl tracking-tight mb-4">
            Get Involved
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Help us make AP education accessible to every student
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-16">
          <Card className="border-2 border-gray-100 hover:border-[#36b37e]/30 hover:shadow-xl transition-all duration-300">
            <CardContent className="p-8">
              <div className="w-14 h-14 bg-[#36b37e]/10 rounded-2xl flex items-center justify-center mb-6">
                <MessageSquare className="w-7 h-7 text-[#36b37e]" />
              </div>
              <h3 className="text-xl font-bold text-[#2d3b45] mb-3">Give Feedback</h3>
              <p className="text-gray-600 mb-6">
                Your voice matters. Tell us what's working, what isn't, and what features you'd love to see. We build with students, not just for them.
              </p>
              <Button variant="outline" className="w-full border-[#36b37e] text-[#36b37e] hover:bg-[#36b37e] hover:text-white">
                Share Feedback
              </Button>
            </CardContent>
          </Card>

          <Card className="border-2 border-gray-100 hover:border-blue-300 hover:shadow-xl transition-all duration-300">
            <CardContent className="p-8">
              <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mb-6">
                <PenTool className="w-7 h-7 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-[#2d3b45] mb-3">Content Contributors</h3>
              <p className="text-gray-600 mb-6">
                Are you an educator or AP expert? Help us create and review questions, explanations, and study materials.
              </p>
              <Button variant="outline" className="w-full border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white">
                Apply to Contribute
              </Button>
            </CardContent>
          </Card>

          <Card className="border-2 border-gray-100 hover:border-purple-300 hover:shadow-xl transition-all duration-300">
            <CardContent className="p-8">
              <div className="w-14 h-14 bg-purple-100 rounded-2xl flex items-center justify-center mb-6">
                <Share2 className="w-7 h-7 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold text-[#2d3b45] mb-3">Spread the Word</h3>
              <p className="text-gray-600 mb-6">
                Know students who could benefit from free AP prep? Share APMaster.ai with your classmates, study groups, and school.
              </p>
              <Button variant="outline" className="w-full border-purple-600 text-purple-600 hover:bg-purple-600 hover:text-white">
                Get Shareable Links
              </Button>
            </CardContent>
          </Card>

          <Card className="border-2 border-gray-100 hover:border-orange-300 hover:shadow-xl transition-all duration-300">
            <CardContent className="p-8">
              <div className="w-14 h-14 bg-orange-100 rounded-2xl flex items-center justify-center mb-6">
                <Users className="w-7 h-7 text-orange-600" />
              </div>
              <h3 className="text-xl font-bold text-[#2d3b45] mb-3">Campus Ambassadors</h3>
              <p className="text-gray-600 mb-6">
                Passionate about education equity? Become an APMaster ambassador at your school and help fellow students succeed.
              </p>
              <Button variant="outline" className="w-full border-orange-600 text-orange-600 hover:bg-orange-600 hover:text-white">
                Become an Ambassador
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="bg-gradient-to-r from-[#36b37e]/10 to-blue-50 rounded-3xl p-8 md:p-12 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-[#2d3b45] mb-4">
            Partner With Us
          </h2>
          <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
            Are you a school, organization, or company interested in bringing APMaster.ai to more students? Let's talk about partnerships.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="mailto:partnerships@apmaster.ai">
              <Button className="bg-[#36b37e] hover:bg-[#2fa371] text-white gap-2">
                <Mail className="w-5 h-5" />
                partnerships@apmaster.ai
              </Button>
            </a>
          </div>
        </div>

        <div className="mt-16 text-center">
          <h3 className="text-lg font-semibold text-[#2d3b45] mb-4">Connect With Us</h3>
          <div className="flex justify-center gap-6">
            <a href="#" className="text-gray-400 hover:text-[#36b37e] transition-colors">
              <Github className="w-6 h-6" />
            </a>
            <a href="mailto:hello@apmaster.ai" className="text-gray-400 hover:text-[#36b37e] transition-colors">
              <Mail className="w-6 h-6" />
            </a>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
