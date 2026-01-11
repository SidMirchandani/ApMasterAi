import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, X, ChevronRight, BarChart3, BookOpen, Target, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const sampleQuestions = [
  {
    subject: "AP Macroeconomics",
    question: "If the Federal Reserve wants to decrease inflation, which of the following actions would be most appropriate?",
    options: [
      "Decrease the discount rate",
      "Buy government securities",
      "Increase reserve requirements",
      "Decrease the federal funds rate"
    ],
    correctAnswer: 2,
    explanation: "Increasing reserve requirements reduces the money supply, which helps decrease inflation by reducing the amount of money banks can lend."
  },
  {
    subject: "AP Psychology",
    question: "Which part of the brain is primarily responsible for processing emotions like fear and aggression?",
    options: [
      "Hippocampus",
      "Amygdala",
      "Cerebellum",
      "Prefrontal cortex"
    ],
    correctAnswer: 1,
    explanation: "The amygdala is the brain's emotional processing center, particularly for fear responses and emotional memories."
  }
];

export function InteractiveDemos() {
  const [activeDemo, setActiveDemo] = useState<"question" | "dashboard" | "progress">("question");
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [currentQuestion] = useState(0);

  const question = sampleQuestions[currentQuestion];

  const handleAnswerSelect = (index: number) => {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(index);
    setTimeout(() => setShowExplanation(true), 500);
  };

  const resetQuestion = () => {
    setSelectedAnswer(null);
    setShowExplanation(false);
  };

  return (
    <section className="py-24 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-2 bg-[#36b37e]/10 text-[#36b37e] rounded-full text-sm font-semibold mb-4">
            Try It Yourself
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-[#2d3b45] mb-6">
            Experience APMaster
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            See how our AI-powered platform adapts to your learning style
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-4 mb-12">
          {[
            { id: "question", label: "Practice Question", icon: BookOpen },
            { id: "dashboard", label: "Smart Dashboard", icon: BarChart3 },
            { id: "progress", label: "Progress Tracking", icon: Target }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveDemo(tab.id as typeof activeDemo)}
              className={`flex items-center gap-2 px-6 py-3 rounded-full font-medium transition-all ${
                activeDemo === tab.id
                  ? "bg-[#36b37e] text-white shadow-lg shadow-[#36b37e]/25"
                  : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
              }`}
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {activeDemo === "question" && (
            <motion.div
              key="question"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="max-w-3xl mx-auto border-2 border-gray-100 shadow-xl overflow-hidden">
                <div className="bg-gradient-to-r from-[#36b37e] to-[#2fa371] p-4">
                  <div className="flex items-center justify-between text-white">
                    <span className="text-sm font-medium opacity-90">{question.subject}</span>
                    <span className="px-3 py-1 bg-white/20 rounded-full text-xs font-medium">
                      Practice Mode
                    </span>
                  </div>
                </div>
                <CardContent className="p-8">
                  <p className="text-lg font-medium text-[#2d3b45] mb-8 leading-relaxed">
                    {question.question}
                  </p>

                  <div className="space-y-3">
                    {question.options.map((option, index) => {
                      const isSelected = selectedAnswer === index;
                      const isCorrect = index === question.correctAnswer;
                      const showResult = selectedAnswer !== null;

                      return (
                        <button
                          key={index}
                          onClick={() => handleAnswerSelect(index)}
                          disabled={selectedAnswer !== null}
                          className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center gap-4 ${
                            showResult
                              ? isCorrect
                                ? "border-[#36b37e] bg-[#36b37e]/10"
                                : isSelected
                                ? "border-red-400 bg-red-50"
                                : "border-gray-200 opacity-50"
                              : "border-gray-200 hover:border-[#36b37e] hover:bg-gray-50 cursor-pointer"
                          }`}
                        >
                          <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                            showResult
                              ? isCorrect
                                ? "bg-[#36b37e] text-white"
                                : isSelected
                                ? "bg-red-400 text-white"
                                : "bg-gray-200 text-gray-500"
                              : "bg-gray-100 text-gray-600"
                          }`}>
                            {showResult ? (
                              isCorrect ? <Check className="w-4 h-4" /> : isSelected ? <X className="w-4 h-4" /> : String.fromCharCode(65 + index)
                            ) : (
                              String.fromCharCode(65 + index)
                            )}
                          </span>
                          <span className={showResult && !isCorrect && !isSelected ? "text-gray-400" : "text-gray-700"}>
                            {option}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <AnimatePresence>
                    {showExplanation && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-6"
                      >
                        <div className="p-6 bg-blue-50 rounded-xl border border-blue-100">
                          <div className="flex items-start gap-3">
                            <Zap className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="font-semibold text-blue-900 mb-2">AI Explanation</p>
                              <p className="text-blue-800 leading-relaxed">{question.explanation}</p>
                            </div>
                          </div>
                        </div>
                        <div className="mt-4 text-center">
                          <Button onClick={resetQuestion} variant="outline" className="gap-2">
                            Try Another Question <ChevronRight className="w-4 h-4" />
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {activeDemo === "dashboard" && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="max-w-4xl mx-auto border-2 border-gray-100 shadow-xl overflow-hidden">
                <CardContent className="p-8">
                  <div className="grid md:grid-cols-3 gap-6 mb-8">
                    {[
                      { label: "Questions Practiced", value: "1,247", change: "+84 this week", color: "text-[#36b37e]" },
                      { label: "Mastery Score", value: "76%", change: "+12% improvement", color: "text-blue-600" },
                      { label: "Study Streak", value: "14 days", change: "Personal best!", color: "text-purple-600" }
                    ].map((stat, i) => (
                      <div key={i} className="bg-gray-50 rounded-2xl p-6 text-center">
                        <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
                        <p className="text-gray-600 font-medium mt-1">{stat.label}</p>
                        <p className="text-sm text-gray-500 mt-2">{stat.change}</p>
                      </div>
                    ))}
                  </div>

                  <div className="bg-gradient-to-r from-[#36b37e]/10 to-blue-50 rounded-2xl p-6">
                    <h4 className="font-semibold text-[#2d3b45] mb-4">AI Recommendation</h4>
                    <p className="text-gray-600 mb-4">
                      Based on your recent performance, we recommend focusing on <span className="font-semibold text-[#36b37e]">Monetary Policy</span> concepts. 
                      You're showing great progress in Supply & Demand!
                    </p>
                    <div className="flex gap-3">
                      <span className="px-3 py-1 bg-[#36b37e]/20 text-[#36b37e] rounded-full text-sm font-medium">Focus Area</span>
                      <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium">Review Needed</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {activeDemo === "progress" && (
            <motion.div
              key="progress"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="max-w-4xl mx-auto border-2 border-gray-100 shadow-xl overflow-hidden">
                <CardContent className="p-8">
                  <h4 className="font-semibold text-[#2d3b45] mb-6 text-lg">Unit Progress</h4>
                  <div className="space-y-6">
                    {[
                      { unit: "Unit 1: Basic Economics", progress: 92, status: "Mastered" },
                      { unit: "Unit 2: Supply & Demand", progress: 78, status: "Proficient" },
                      { unit: "Unit 3: Monetary Policy", progress: 45, status: "Learning" },
                      { unit: "Unit 4: Fiscal Policy", progress: 23, status: "Just Started" }
                    ].map((item, i) => (
                      <div key={i}>
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium text-gray-700">{item.unit}</span>
                          <span className={`text-sm font-medium ${
                            item.progress >= 80 ? "text-[#36b37e]" : 
                            item.progress >= 50 ? "text-blue-600" : 
                            item.progress >= 25 ? "text-yellow-600" : "text-gray-500"
                          }`}>{item.status}</span>
                        </div>
                        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${item.progress}%` }}
                            transition={{ duration: 1, delay: i * 0.1 }}
                            className={`h-full rounded-full ${
                              item.progress >= 80 ? "bg-[#36b37e]" : 
                              item.progress >= 50 ? "bg-blue-500" : 
                              item.progress >= 25 ? "bg-yellow-500" : "bg-gray-300"
                            }`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-8 p-4 bg-purple-50 rounded-xl border border-purple-100">
                    <p className="text-purple-800 text-sm">
                      <span className="font-semibold">Projected Score:</span> Based on your current progress, you're on track for a <span className="font-bold">4 or 5</span> on the AP exam!
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
