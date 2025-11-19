
import { APSubject } from '../common/types';
import { microeconomicsUnits } from './units';

const sections: Record<string, { code: string; name: string; unitNumber: number }> = {
  unit1: { code: 'BEC', name: 'Basic Economic Concepts', unitNumber: 1 },
  unit2: { code: 'SD', name: 'Supply and Demand', unitNumber: 2 },
  unit3: { code: 'PC', name: 'Production, Cost, and the Perfect Competition Model', unitNumber: 3 },
  unit4: { code: 'IMP', name: 'Imperfect Competition', unitNumber: 4 },
  unit5: { code: 'FM', name: 'Factor Markets', unitNumber: 5 },
  unit6: { code: 'MF', name: 'Market Failure and the Role of Government', unitNumber: 6 },
};

const metadata = {
  displayName: 'AP Microeconomics',
  description: 'Supply and demand, market structures, factor markets, and market failure',
  units: 6,
  difficulty: 'Medium',
  examDate: 'May 4, 2026',
  examTitle: 'AP® Microeconomics Practice Exam',
  examSections: [
    {
      title: 'Section I: Multiple Choice',
      details: '60 Questions | 1 Hour 10 Minutes | 66.65% of Exam Score',
      description: 'Questions require the use of economics content knowledge and reasoning across the range of course topics and skills.'
    }
  ],
  breakdown: [
    { name: 'Unit 1: Basic Economic Concepts', weight: '12-15%' },
    { name: 'Unit 2: Supply and Demand', weight: '20-25%' },
    { name: 'Unit 3: Production, Cost, and the Perfect Competition Model', weight: '22-25%' },
    { name: 'Unit 4: Imperfect Competition', weight: '15-22%' },
    { name: 'Unit 5: Factor Markets', weight: '10-13%' },
    { name: 'Unit 6: Market Failure and the Role of Government', weight: '8-13%' }
  ]
};

export const apmicro: APSubject = {
  subjectCode: 'APMICRO',
  displayName: metadata.displayName,
  units: microeconomicsUnits,
  sections,
  metadata,
};
