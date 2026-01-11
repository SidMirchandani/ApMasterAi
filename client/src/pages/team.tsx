import Navigation from "@/components/ui/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Linkedin, Mail } from "lucide-react";

const teamMembers = [
  {
    name: "Siddharth Mirchandani",
    role: "Co-founder",
    initials: "SM",
    email: "siddharth@apmaster.ai",
    linkedin: "https://linkedin.com",
    bio: "Passionate about education technology and making high-quality study materials accessible to all students."
  },
  {
    name: "Vivana Satiani",
    role: "Co-founder",
    initials: "VS",
    email: "vivana@apmaster.ai",
    linkedin: "https://linkedin.com",
    bio: "Dedicated to building intelligent tools that empower students to reach their full academic potential."
  }
];

export default function Team() {
  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      
      <main className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-extrabold text-[#2d3b45] sm:text-5xl tracking-tight mb-4">
            Meet Our Team
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            The people behind APMaster.ai working to democratize AP preparation.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-4xl mx-auto">
          {teamMembers.map((member) => (
            <Card key={member.name} className="border-none shadow-xl bg-gradient-to-br from-gray-50 to-white overflow-hidden group">
              <CardContent className="p-8 text-center">
                <div className="w-32 h-32 bg-[#36b37e]/10 rounded-full mx-auto mb-6 flex items-center justify-center border-4 border-[#36b37e]/20 transition-all duration-300 group-hover:border-[#36b37e]">
                  <span className="text-3xl font-bold text-[#36b37e]">{member.initials}</span>
                </div>
                <h3 className="text-2xl font-bold text-[#2d3b45] mb-2">{member.name}</h3>
                <p className="text-[#36b37e] font-semibold mb-4">{member.role}</p>
                <p className="text-gray-600 mb-6 italic">"{member.bio}"</p>
                <div className="flex justify-center gap-4">
                  <a href={member.linkedin} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full bg-gray-100 text-gray-600 hover:bg-[#36b37e] hover:text-white transition-colors">
                    <Linkedin className="w-5 h-5" />
                  </a>
                  <a href={`mailto:${member.email}`} className="p-2 rounded-full bg-gray-100 text-gray-600 hover:bg-[#36b37e] hover:text-white transition-colors">
                    <Mail className="w-5 h-5" />
                  </a>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>

      <footer className="bg-gray-50 border-t border-gray-200 py-12 mt-20">
        <div className="max-w-7xl mx-auto px-4 text-center text-gray-500 text-sm">
          <p>&copy; {new Date().getFullYear()} APMaster.ai. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}