
import { APSubject } from '../common/types';
import { macroeconomicsUnits } from './units';

const sections: Record<string, { code: string; name: string; unitNumber: number }> = {
  unit1: { code: 'BEC', name: 'Basic Economic Concepts', unitNumber: 1 },
  unit2: { code: 'EIBC', name: 'Economic Indicators & Business Cycle', unitNumber: 2 },
  unit3: { code: 'NIPD', name: 'National Income & Price Determination', unitNumber: 3 },
  unit4: { code: 'FS', name: 'Financial Sector', unitNumber: 4 },
  unit5: { code: 'LRCSP', name: 'Long-Run Consequences of Stabilization Policies', unitNumber: 5 },
  unit6: { code: 'OEITF', name: 'Open Economy - International Trade & Finance', unitNumber: 6 },
  BEC: { code: 'BEC', name: 'Basic Economic Concepts', unitNumber: 1 },
  EIBC: { code: 'EIBC', name: 'Economic Indicators & Business Cycle', unitNumber: 2 },
  NIPD: { code: 'NIPD', name: 'National Income & Price Determination', unitNumber: 3 },
  FS: { code: 'FS', name: 'Financial Sector', unitNumber: 4 },
  LRCSP: { code: 'LRCSP', name: 'Long-Run Consequences of Stabilization Policies', unitNumber: 5 },
  OEITF: { code: 'OEITF', name: 'Open Economy - International Trade & Finance', unitNumber: 6 },
};

const metadata = {
  displayName: 'AP Macroeconomics',
  description: 'National income, price determination, economic performance measures, and fiscal/monetary policy',
  units: 6,
  difficulty: 'Medium',
  examDate: 'May 8, 2026',
  examTitle: 'AP® Macroeconomics Practice Exam',
  examSections: [
    {
      title: 'Section I: Multiple Choice',
      details: '60 Questions | 1 Hour 10 Minutes | 66% of Exam Score',
      description: 'Questions require the use of economics content knowledge and reasoning across the range of course topics and skills in skill categories 1, 2, and 3.'
    }
  ],
  breakdown: [
    { name: 'Unit 1: Basic Economic Concepts', weight: '5-10%' },
    { name: 'Unit 2: Economic Indicators and the Business Cycle', weight: '12-17%' },
    { name: 'Unit 3: National Income and Price Determination', weight: '17-27%' },
    { name: 'Unit 4: Financial Sector', weight: '18-23%' },
    { name: 'Unit 5: Long-Run Consequences of Stabilization Policies', weight: '20-30%' },
    { name: 'Unit 6: Open Economy—International Trade and Finance', weight: '10-13%' }
  ]
};

export const apmacro: APSubject = {
  subjectCode: 'APMACRO',
  displayName: metadata.displayName,
  units: macroeconomicsUnits,
  sections,
  metadata
};
