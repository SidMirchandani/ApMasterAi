
import { APSubject } from '../common/types';
import { calculusUnits } from './units';

const sections: Record<string, { code: string; name: string; unitNumber: number }> = {
  unit1: { code: 'LIM', name: 'Limits and Continuity', unitNumber: 1 },
  unit2: { code: 'DDF', name: 'Differentiation: Definition and Fundamental Properties', unitNumber: 2 },
  unit3: { code: 'DCI', name: 'Differentiation: Composite, Implicit, and Inverse Functions', unitNumber: 3 },
  unit4: { code: 'CAD', name: 'Contextual Applications of Differentiation', unitNumber: 4 },
  unit5: { code: 'AAD', name: 'Analytical Applications of Differentiation', unitNumber: 5 },
  unit6: { code: 'IAC', name: 'Integration and Accumulation of Change', unitNumber: 6 },
  unit7: { code: 'DE', name: 'Differential Equations', unitNumber: 7 },
  unit8: { code: 'AI', name: 'Applications of Integration', unitNumber: 8 },
  LIM: { code: 'LIM', name: 'Limits and Continuity', unitNumber: 1 },
  DDF: { code: 'DDF', name: 'Differentiation: Definition and Fundamental Properties', unitNumber: 2 },
  DCI: { code: 'DCI', name: 'Differentiation: Composite, Implicit, and Inverse Functions', unitNumber: 3 },
  CAD: { code: 'CAD', name: 'Contextual Applications of Differentiation', unitNumber: 4 },
  AAD: { code: 'AAD', name: 'Analytical Applications of Differentiation', unitNumber: 5 },
  IAC: { code: 'IAC', name: 'Integration and Accumulation of Change', unitNumber: 6 },
  DE: { code: 'DE', name: 'Differential Equations', unitNumber: 7 },
  AI: { code: 'AI', name: 'Applications of Integration', unitNumber: 8 },
};

const metadata = {
  displayName: 'AP Calculus AB',
  description: 'Limits, derivatives, integrals, and the Fundamental Theorem of Calculus',
  units: 8,
  difficulty: 'Hard',
  examDate: 'May 5, 2026',
  examTitle: 'AP® Calculus AB Practice Exam',
  examSections: [
    {
      title: 'Section I: Multiple Choice',
      details: '45 Questions | 1 Hour 45 Minutes | 50% of Exam Score',
      description: 'Part A: 30 questions (60 minutes) - No calculator\nPart B: 15 questions (45 minutes) - Graphing calculator required'
    }
  ],
};

export const apcalcab: APSubject = {
  subjectCode: 'APCALCAB',
  displayName: metadata.displayName,
  units: calculusUnits,
  sections,
  metadata,
  unitToSectionMap: {
    'unit1': 'LIM',
    'unit2': 'DDF',
    'unit3': 'DCI',
    'unit4': 'CAD',
    'unit5': 'AAD',
    'unit6': 'IAC',
    'unit7': 'DE',
    'unit8': 'AI',
  }
};
