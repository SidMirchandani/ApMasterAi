import { Brain, Mail, Globe, Rocket, Twitter, Instagram, Linkedin, Github } from "lucide-react";

export default function Footer() {
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <footer id="contact" className="bg-navy text-white py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center mb-6">
              <Brain className="text-teal text-2xl mr-3" />
              <span className="text-2xl font-bold">APMaster.ai</span>
            </div>
            <p className="text-white/70 mb-6 leading-relaxed max-w-md">
              Empowering students across the U.S. with AI-powered AP test preparation. Free, accessible, and effective.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center hover:bg-teal transition-colors">
                <Twitter className="w-4 h-4" />
              </a>
              <a href="#" className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center hover:bg-teal transition-colors">
                <Instagram className="w-4 h-4" />
              </a>
              <a href="#" className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center hover:bg-teal transition-colors">
                <Linkedin className="w-4 h-4" />
              </a>
              <a href="#" className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center hover:bg-teal transition-colors">
                <Github className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2 text-white/70">
              <li>
                <button 
                  onClick={() => scrollToSection('features')}
                  className="hover:text-teal transition-colors text-left"
                >
                  Features
                </button>
              </li>
              <li>
                <button 
                  onClick={() => scrollToSection('benefits')}
                  className="hover:text-teal transition-colors text-left"
                >
                  Benefits
                </button>
              </li>
              <li>
                <button 
                  onClick={() => scrollToSection('about')}
                  className="hover:text-teal transition-colors text-left"
                >
                  About
                </button>
              </li>
              <li>
                <a href="#" className="hover:text-teal transition-colors">Privacy Policy</a>
              </li>
              <li>
                <a href="#" className="hover:text-teal transition-colors">Terms of Service</a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold mb-4">Contact</h3>
            <div className="space-y-2 text-white/70">
              <p className="flex items-center">
                <Mail className="mr-2 w-4 h-4" />
                hello@apmaster.ai
              </p>
              <p className="flex items-center">
                <Globe className="mr-2 w-4 h-4" />
                www.apmaster.ai
              </p>
              <p className="text-sm mt-4">
                <Rocket className="text-teal mr-2 w-4 h-4 inline" />
                Launching January 2026
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 mt-12 pt-8 text-center text-white/60">
          <p>&copy; 2024 APMaster.ai. All rights reserved. Building the future of AP test preparation.</p>
        </div>
      </div>
    </footer>
  );
}
