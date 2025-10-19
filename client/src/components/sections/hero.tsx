
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

export function Hero() {
  return (
    <section className="relative bg-gradient-to-b from-khan-background to-white py-12 md:py-20 lg:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-khan-gray-dark mb-4 sm:mb-6">
            Master AP Exams with
            <span className="text-khan-green block mt-2">AI-Powered Learning</span>
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-khan-gray-medium max-w-3xl mx-auto mb-6 sm:mb-8 px-4">
            Personalized study plans, adaptive practice tests, and instant feedback to help you ace your AP exams.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center px-4">
            <Link href="/signup">
              <Button size="lg" className="w-full sm:w-auto bg-khan-green hover:bg-khan-green-light text-white font-semibold px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg">
                Get Started Free
                <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            </Link>
            <Link href="/learn">
              <Button size="lg" variant="outline" className="w-full sm:w-auto border-2 border-khan-green text-khan-green hover:bg-khan-background font-semibold px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg">
                Browse Courses
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
