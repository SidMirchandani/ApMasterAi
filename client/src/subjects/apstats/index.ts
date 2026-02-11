
import { APSubject } from '../common/types';
import { statisticsUnits } from './units';

const sections: Record<string, { code: string; name: string; unitNumber: number }> = {
  unit1: { code: 'EOV', name: 'Exploring One-Variable Data', unitNumber: 1 },
  unit2: { code: 'ETV', name: 'Exploring Two-Variable Data', unitNumber: 2 },
  unit3: { code: 'CD', name: 'Collecting Data', unitNumber: 3 },
  unit4: { code: 'PRD', name: 'Probability, Random Variables, and Distributions', unitNumber: 4 },
  unit5: { code: 'SD', name: 'Sampling Distributions', unitNumber: 5 },
  unit6: { code: 'ICP', name: 'Inference for Categorical Data: Proportions', unitNumber: 6 },
  unit7: { code: 'IQM', name: 'Inference for Quantitative Data: Means', unitNumber: 7 },
  unit8: { code: 'ICC', name: 'Inference for Categorical Data: Chi-Square', unitNumber: 8 },
  unit9: { code: 'IQS', name: 'Inference for Quantitative Data: Slopes', unitNumber: 9 },
  EOV: { code: 'EOV', name: 'Exploring One-Variable Data', unitNumber: 1 },
  ETV: { code: 'ETV', name: 'Exploring Two-Variable Data', unitNumber: 2 },
  CD: { code: 'CD', name: 'Collecting Data', unitNumber: 3 },
  PRD: { code: 'PRD', name: 'Probability, Random Variables, and Distributions', unitNumber: 4 },
  SD: { code: 'SD', name: 'Sampling Distributions', unitNumber: 5 },
  ICP: { code: 'ICP', name: 'Inference for Categorical Data: Proportions', unitNumber: 6 },
  IQM: { code: 'IQM', name: 'Inference for Quantitative Data: Means', unitNumber: 7 },
  ICC: { code: 'ICC', name: 'Inference for Categorical Data: Chi-Square', unitNumber: 8 },
  IQS: { code: 'IQS', name: 'Inference for Quantitative Data: Slopes', unitNumber: 9 },
};

const metadata = {
  displayName: 'AP Statistics',
  description: 'Data analysis, probability, statistical inference, and experimental design',
  units: 9,
  difficulty: 'Hard',
  examDate: 'May 12, 2026',
  examTitle: 'AP® Statistics Practice Exam',
  examSections: [
    {
      title: 'Section I: Multiple Choice',
      details: '40 Questions | 1 Hour 30 Minutes | 50% of Exam Score',
      description: 'Questions assess statistical concepts, methods, and interpretation of data'
    }
  ],
};

export const apstats: APSubject = {
  subjectCode: 'APSTATS',
  displayName: metadata.displayName,
  units: statisticsUnits,
  sections,
  metadata,
};
