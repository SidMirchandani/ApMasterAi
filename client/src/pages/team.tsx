import Navigation from "@/components/ui/navigation";
import SimpleFooter from "@/components/sections/simple-footer";
import { Linkedin, Mail, Users, ArrowUpRight, Target, ArrowRight } from "lucide-react";
import Link from "next/link";

const teamMembers = [
  {
    name: "Siddharth Mirchandani",
    role: "Co-founder",
    initials: "SM",
    email: "siddharth.mirchandani@gmail.com",
    linkedin: "https://www.linkedin.com/in/siddharth-mirchandani-b0b282264/",
    bio: "Passionate about education technology and making high-quality study materials accessible to all students.",
  },
  {
    name: "Vivana Satiani",
    role: "Co-founder",
    initials: "VS",
    email: "satianivivana@gmail.com",
    linkedin: "https://www.linkedin.com/in/vivanasatiani/",
    bio: "Dedicated to building intelligent tools that empower students to reach their full academic potential.",
  },
];

export default function Team() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B0F1A]">
      <Navigation />

      {/* Hero */}
      <section className="relative overflow-hidden pt-8 pb-10 md:pt-12 md:pb-14">

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-500/10 border border-blue-200/60 dark:border-blue-500/20 mb-4">
            <Users className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wider">
              The Team
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-display font-extrabold text-slate-900 dark:text-white tracking-tight mb-3">
            Meet Our{" "}
            <span className="bg-gradient-to-r from-blue-500 via-blue-600 to-blue-500 bg-clip-text text-transparent">
              Team
            </span>
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto font-medium leading-snug">
            The people behind APMaster working to democratize AP preparation.
          </p>
        </div>
      </section>

      {/* Team grid */}
      <section className="relative py-8 md:py-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {teamMembers.map((member, index) => (
              <div
                key={member.name}
                className="group relative rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-[1px] transition-all duration-150 ease-out"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Top accent */}
                <div className="h-1 w-full bg-blue-600 dark:bg-blue-500 opacity-80 group-hover:opacity-100 transition-opacity duration-150" />

                <div className="p-5 sm:p-6">
                  {/* Avatar */}
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    <div className="flex-shrink-0 mx-auto sm:mx-0">
                      <div className="w-20 h-20 rounded-xl bg-blue-600 dark:bg-blue-500 flex items-center justify-center shadow-sm group-hover:shadow-md transition-all duration-150 border-2 border-white dark:border-slate-800">
                        <span className="text-2xl font-black text-white">{member.initials}</span>
                      </div>
                    </div>
                    <div className="flex-1 text-center sm:text-left">
                      <h3 className="text-xl font-display font-bold text-slate-900 dark:text-white mb-0.5">
                        {member.name}
                      </h3>
                      <p className="text-blue-600 dark:text-blue-400 font-semibold text-sm mb-2">{member.role}</p>
                      <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm mb-4">
                        &ldquo;{member.bio}&rdquo;
                      </p>

                      {/* Social links */}
                      <div className="flex items-center justify-center sm:justify-start gap-2">
                        <a
                          href={member.linkedin}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-500 transition-all duration-150 ease-out font-medium text-xs"
                        >
                          <Linkedin className="w-3.5 h-3.5" />
                          LinkedIn
                          <ArrowUpRight className="w-3 h-3 opacity-70" />
                        </a>
                        <a
                          href={`mailto:${member.email}`}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-500 transition-all duration-150 ease-out font-medium text-xs"
                        >
                          <Mail className="w-3.5 h-3.5" />
                          Email
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* CTA to About / Mission */}
          <div className="mt-10 flex justify-center">
            <div className="inline-flex flex-col sm:flex-row items-center gap-3 p-4 rounded-xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:-translate-y-[1px] transition-all duration-150 ease-out w-full sm:w-auto">
              <div className="w-11 h-11 rounded-lg bg-blue-50 dark:bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                <Target className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="text-center sm:text-left">
                <p className="font-display font-bold text-slate-900 dark:text-white text-base">
                  Learn about our mission
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Democratizing AP preparation for every student
                </p>
              </div>
              <Link
                href="/about"
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-semibold text-sm px-4 py-2 rounded-lg shadow-sm hover:shadow-md transition-all duration-150 ease-out hover:scale-[1.02] active:scale-[0.98] group flex-shrink-0"
              >
                About Us
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <SimpleFooter />
    </div>
  );
}
