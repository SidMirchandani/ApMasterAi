import Navigation from "@/components/ui/navigation";
import Footer from "@/components/sections/footer";
import { Linkedin, Mail, Users, ArrowUpRight } from "lucide-react";
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
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <Navigation />

      {/* Hero */}
      <section className="relative overflow-hidden pt-12 pb-16 md:pt-20 md:pb-24">
        <div className="absolute inset-0 mesh-gradient-intense pointer-events-none" />
        <div className="absolute top-1/4 right-0 w-[400px] h-[400px] bg-violet-400/10 dark:bg-violet-500/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-[300px] h-[300px] bg-emerald-400/10 dark:bg-emerald-500/5 rounded-full blur-[80px] pointer-events-none" />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-50 dark:bg-violet-500/10 border border-violet-200/60 dark:border-violet-500/20 mb-8">
            <Users className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
            <span className="text-xs font-semibold text-violet-700 dark:text-violet-300 uppercase tracking-wider">
              The Team
            </span>
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-display font-extrabold text-slate-900 dark:text-white tracking-tight mb-6">
            Meet Our{" "}
            <span className="bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 bg-clip-text text-transparent">
              Team
            </span>
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto font-medium leading-relaxed">
            The people behind APMaster working to democratize AP preparation.
          </p>
        </div>
      </section>

      {/* Team grid */}
      <section className="relative py-12 md:py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {teamMembers.map((member, index) => (
              <div
                key={member.name}
                className="group relative rounded-3xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-900 overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.06)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.2)] hover:shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_20px_50px_rgba(0,0,0,0.35)] transition-all duration-300 hover:-translate-y-1"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Top accent */}
                <div className="h-1 w-full bg-gradient-to-r from-emerald-500 to-teal-500 opacity-80 group-hover:opacity-100 transition-opacity" />

                <div className="p-8 sm:p-10">
                  {/* Avatar */}
                  <div className="flex flex-col sm:flex-row sm:items-start gap-6">
                    <div className="flex-shrink-0 mx-auto sm:mx-0">
                      <div className="w-28 h-28 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-[0_8px_24px_rgba(16,185,129,0.25)] group-hover:shadow-[0_12px_32px_rgba(16,185,129,0.35)] transition-shadow duration-300 border-2 border-white dark:border-slate-800">
                        <span className="text-3xl font-black text-white">{member.initials}</span>
                      </div>
                    </div>
                    <div className="flex-1 text-center sm:text-left">
                      <h3 className="text-2xl font-display font-bold text-slate-900 dark:text-white mb-1">
                        {member.name}
                      </h3>
                      <p className="text-emerald-600 dark:text-emerald-400 font-semibold mb-4">{member.role}</p>
                      <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm mb-6">
                        &ldquo;{member.bio}&rdquo;
                      </p>

                      {/* Social links */}
                      <div className="flex items-center justify-center sm:justify-start gap-2">
                        <a
                          href={member.linkedin}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-emerald-500 hover:text-white transition-all duration-200 font-medium text-sm"
                        >
                          <Linkedin className="w-4 h-4" />
                          LinkedIn
                          <ArrowUpRight className="w-3.5 h-3.5 opacity-70" />
                        </a>
                        <a
                          href={`mailto:${member.email}`}
                          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-emerald-500 hover:text-white transition-all duration-200 font-medium text-sm"
                        >
                          <Mail className="w-4 h-4" />
                          Email
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Back to About */}
          <div className="mt-16 text-center">
            <Link
              href="/about"
              className="inline-flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 font-medium transition-colors"
            >
              <ArrowUpRight className="w-4 h-4 rotate-180" />
              Learn about our mission
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
