
import { APSubject } from '../common/types';
import { calculusBCUnits } from './units';

const sections: Record<string, { code: string; name: string; unitNumber: number }> = {
  unit1: { code: 'LIM', name: 'Limits and Continuity', unitNumber: 1 },
  unit2: { code: 'DDF', name: 'Differentiation: Definition and Fundamental Properties', unitNumber: 2 },
  unit3: { code: 'DCI', name: 'Differentiation: Composite, Implicit, and Inverse Functions', unitNumber: 3 },
  unit4: { code: 'CAD', name: 'Contextual Applications of Differentiation', unitNumber: 4 },
  unit5: { code: 'AAD', name: 'Analytical Applications of Differentiation', unitNumber: 5 },
  unit6: { code: 'IAC', name: 'Integration and Accumulation of Change', unitNumber: 6 },
  unit7: { code: 'DE', name: 'Differential Equations', unitNumber: 7 },
  unit8: { code: 'AI', name: 'Applications of Integration', unitNumber: 8 },
  unit9: { code: 'PPV', name: 'Parametric Equations, Polar Coordinates, and Vector-Valued Functions', unitNumber: 9 },
  unit10: { code: 'ISS', name: 'Infinite Sequences and Series', unitNumber: 10 },
  LIM: { code: 'LIM', name: 'Limits and Continuity', unitNumber: 1 },
  DDF: { code: 'DDF', name: 'Differentiation: Definition and Fundamental Properties', unitNumber: 2 },
  DCI: { code: 'DCI', name: 'Differentiation: Composite, Implicit, and Inverse Functions', unitNumber: 3 },
  CAD: { code: 'CAD', name: 'Contextual Applications of Differentiation', unitNumber: 4 },
  AAD: { code: 'AAD', name: 'Analytical Applications of Differentiation', unitNumber: 5 },
  IAC: { code: 'IAC', name: 'Integration and Accumulation of Change', unitNumber: 6 },
  DE: { code: 'DE', name: 'Differential Equations', unitNumber: 7 },
  AI: { code: 'AI', name: 'Applications of Integration', unitNumber: 8 },
  PPV: { code: 'PPV', name: 'Parametric Equations, Polar Coordinates, and Vector-Valued Functions', unitNumber: 9 },
  ISS: { code: 'ISS', name: 'Infinite Sequences and Series', unitNumber: 10 },
};

const metadata = {
  displayName: 'AP Calculus BC',
  description: 'Limits, derivatives, integrals, parametric/polar/vector functions, and infinite series',
  units: 10,
  difficulty: 'Very Hard',
  examDate: 'May 5, 2026',
  examTitle: 'AP® Calculus BC Practice Exam',
  examSections: [
    {
      title: 'Section I: Multiple Choice',
      details: '45 Questions | 1 Hour 45 Minutes | 50% of Exam Score',
      description: 'Part A: 30 questions (60 minutes) - No calculator\nPart B: 15 questions (45 minutes) - Graphing calculator required'
    }
  ],
};

export const apcalcbc: APSubject = {
  subjectCode: 'APCALCBC',
  displayName: metadata.displayName,
  units: calculusBCUnits,
  sections,
  metadata,
};
