import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const faqs = [
  {
    question: "Is APMaster.ai really free?",
    answer: "Yes! APMaster.ai is completely free for all students. We believe that high-quality AP preparation should be accessible to everyone, regardless of financial background. No hidden fees, no premium tiers—just free, effective learning."
  },
  {
    question: "How does the AI personalize my learning?",
    answer: "Our AI analyzes your performance across questions, identifies patterns in your mistakes, and adapts the difficulty and focus of your practice sessions accordingly. It also provides personalized explanations that match your learning style and recommends specific units or concepts to review."
  },
  {
    question: "Which AP subjects are available?",
    answer: "We currently offer AP Macroeconomics, AP Microeconomics, AP Psychology, AP Chemistry, AP Computer Science Principles, AP US Government, and AP Biology. We're continuously adding more subjects based on student demand."
  },
  {
    question: "How accurate are the practice questions?",
    answer: "Our questions are aligned with official College Board curriculum frameworks and exam formats. They're reviewed by educators and continuously refined based on student feedback and the latest exam patterns."
  },
  {
    question: "Can I use APMaster.ai on my phone?",
    answer: "Absolutely! APMaster.ai is fully responsive and works great on phones, tablets, and computers. Study whenever and wherever works best for you."
  },
  {
    question: "How is APMaster.ai different from other AP prep services?",
    answer: "Unlike expensive prep courses or static study materials, APMaster.ai uses AI to create a truly personalized experience. We adapt in real-time to your needs, provide instant feedback, and focus on efficiency—helping you learn more in less time, without the stress or cost."
  },
  {
    question: "Do I need to create an account?",
    answer: "Creating a free account allows us to track your progress, personalize your learning path, and sync your data across devices. It takes less than a minute to sign up, and we only ask for essential information."
  }
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="py-24 bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-2 bg-blue-50 text-blue-600 rounded-full text-sm font-semibold mb-4">
            FAQ
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-[#2d3b45] mb-6">
            Frequently Asked Questions
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Everything you need to know about APMaster.ai
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="border-2 border-gray-100 rounded-2xl overflow-hidden hover:border-gray-200 transition-colors"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full text-left p-6 flex items-center justify-between gap-4 bg-white hover:bg-gray-50 transition-colors"
              >
                <span className="font-semibold text-[#2d3b45] text-lg">{faq.question}</span>
                <ChevronDown
                  className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform ${
                    openIndex === index ? "rotate-180" : ""
                  }`}
                />
              </button>
              <AnimatePresence>
                {openIndex === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="px-6 pb-6">
                      <p className="text-gray-600 leading-relaxed">{faq.answer}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-gray-500">
            Still have questions?{" "}
            <a href="mailto:support@apmaster.ai" className="text-[#36b37e] font-semibold hover:underline">
              Contact our team
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}
