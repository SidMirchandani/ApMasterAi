import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "What is APMaster.ai?",
    answer: "APMaster.ai is an AI-powered study platform designed specifically to help students excel in their AP courses and exams through personalized practice, real-time feedback, and adaptive learning."
  },
  {
    question: "How does the AI help me study?",
    answer: "Our AI analyzes your performance to identify knowledge gaps, provides detailed explanations for every question, and generates personalized study plans to focus on the areas where you need the most improvement."
  },
  {
    question: "Is APMaster.ai free to use?",
    answer: "We offer a range of free resources to ensure every student has access to high-quality AP prep. We also have premium features for students who want more intensive preparation."
  },
  {
    question: "Which AP subjects do you support?",
    answer: "We currently support major AP subjects including Computer Science, Macroeconomics, and more, with new subjects being added regularly."
  }
];

export function FAQ() {
  return (
    <section className="py-24 bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-extrabold text-[#2d3b45] sm:text-4xl">
            Frequently Asked Questions
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Everything you need to know about preparing with APMaster.ai
          </p>
        </div>

        <Accordion type="single" collapsible className="w-full space-y-4">
          {faqs.map((faq, index) => (
            <AccordionItem 
              key={index} 
              value={`item-${index}`}
              className="bg-white border border-gray-200 rounded-xl px-6 shadow-sm overflow-hidden"
            >
              <AccordionTrigger className="text-left font-semibold text-[#2d3b45] hover:no-underline py-4">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-gray-600 pb-4">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}