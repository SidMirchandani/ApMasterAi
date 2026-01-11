import { BookOpen } from "lucide-react";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-[#2d3b45] text-white py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          <div className="md:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 bg-[#36b37e] rounded flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold">APMaster</span>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed">
              Making elite-level AP preparation accessible to every student, regardless of background.
            </p>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider text-gray-400">Platform</h4>
            <ul className="space-y-3 text-sm">
              <li><Link href="/signup" className="text-gray-300 hover:text-[#36b37e] transition-colors">Get Started</Link></li>
              <li><Link href="/login" className="text-gray-300 hover:text-[#36b37e] transition-colors">Sign In</Link></li>
              <li><Link href="/learn" className="text-gray-300 hover:text-[#36b37e] transition-colors">Browse Courses</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider text-gray-400">Company</h4>
            <ul className="space-y-3 text-sm">
              <li><Link href="/about" className="text-gray-300 hover:text-[#36b37e] transition-colors">About Us</Link></li>
              <li><Link href="/story" className="text-gray-300 hover:text-[#36b37e] transition-colors">Our Story</Link></li>
              <li><Link href="/get-involved" className="text-gray-300 hover:text-[#36b37e] transition-colors">Get Involved</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider text-gray-400">Connect</h4>
            <ul className="space-y-3 text-sm">
              <li><a href="mailto:hello@apmaster.ai" className="text-gray-300 hover:text-[#36b37e] transition-colors">hello@apmaster.ai</a></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-700 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-400 text-sm">
            &copy; {new Date().getFullYear()} APMaster.ai. All rights reserved.
          </p>
          <p className="text-gray-500 text-sm">
            Built with purpose. Free forever.
          </p>
        </div>
      </div>
    </footer>
  );
}
