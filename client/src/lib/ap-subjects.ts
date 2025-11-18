import { getAllSubjects, getLegacyIdForSubjectCode } from '@/subjects';

// Generate apSubjects array from subject registry
export const apSubjects = [
  {
    id: "macroeconomics",
    name: "AP Macroeconomics",
    description:
      "Economic indicators, national income, fiscal policy, monetary policy, and international trade",
    units: 6,
    difficulty: "Medium",
    examDate: "May 15, 2026",
    isActive: true,
  },
  {
    id: "microeconomics",
    name: "AP Microeconomics",
    description:
      "Supply and demand, market structures, factor markets, and market failures",
    units: 6,
    difficulty: "Medium",
    examDate: "May 12, 2026",
    isActive: true,
  },
  {
    id: "computer-science-principles",
    name: "AP Computer Science Principles",
    description:
      "Computational thinking, programming, internet, data analysis, and impact of computing",
    units: 5,
    difficulty: "Easy",
    examDate: "May 14, 2026",
    isActive: true,
  },
  {
    id: "chemistry",
    name: "AP Chemistry",
    description:
      "Atomic structure, bonding, reactions, kinetics, thermodynamics, and equilibrium",
    units: 9,
    difficulty: "Hard",
    examDate: "May 5, 2026",
    isActive: true,
  },
  {
    id: "government",
    name: "AP U.S. Government and Politics",
    description:
      "Constitutional foundations, branches of government, civil liberties and rights, political ideologies, and participation",
    units: 5,
    difficulty: "Medium",
    examDate: "May 5, 2026",
    isActive: true,
  },
  {
    id: "psychology",
    name: "AP Psychology",
    description:
      "Biological bases, cognition, development, social psychology, and mental and physical health",
    units: 5,
    difficulty: "Medium",
    examDate: "May 6, 2026",
    isActive: true,
  },
];

export const difficultyColors = {
  "Easy": "bg-green-100 text-green-800 border-green-200",
  "Medium": "bg-yellow-100 text-yellow-800 border-yellow-200",
  "Hard": "bg-orange-100 text-orange-800 border-orange-200",
  "Very Hard": "bg-red-100 text-red-800 border-red-200"
};