
import { APSubject } from '../common/types';
import { calculusUnits } from './units';

const sections: Record<string, { code: string; name: string; unitNumber: number }> = {
  unit1: { code: 'LC', name: 'Limits and Continuity', unitNumber: 1 },
  unit2: { code: 'DDFP', name: 'Differentiation: Definition and Fundamental Properties', unitNumber: 2 },
  unit3: { code: 'DCIF', name: 'Differentiation: Composite, Implicit, and Inverse Functions', unitNumber: 3 },
  unit4: { code: 'CAD', name: 'Contextual Applications of Differentiation', unitNumber: 4 },
  unit5: { code: 'AAD', name: 'Analytical Applications of Differentiation', unitNumber: 5 },
  unit6: { code: 'IAC', name: 'Integration and Accumulation of Change', unitNumber: 6 },
  unit7: { code: 'DE', name: 'Differential Equations', unitNumber: 7 },
  unit8: { code: 'AI', name: 'Applications of Integration', unitNumber: 8 },
};

const metadata = {
  displayName: 'AP Calculus AB',
  description: 'Limits, derivatives, integrals, and the Fundamental Theorem of Calculus',
  units: 8,
  difficulty: 'Hard',
  examDate: 'May 5, 2025',
};

export const calculus: APSubject = {
  subjectCode: 'APCALCAB',
  displayName: metadata.displayName,
  units: calculusUnits,
  sections,
  metadata
};
