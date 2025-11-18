
import { SubjectSection } from '../common/interfaces';

export const sections: SubjectSection[] = [
  { code: 'LC', name: 'Limits and Continuity', weight: '10-12%', unitNumber: 1 },
  { code: 'DDFP', name: 'Differentiation: Definition and Fundamental Properties', weight: '10-12%', unitNumber: 2 },
  { code: 'DCIF', name: 'Differentiation: Composite, Implicit, and Inverse Functions', weight: '9-13%', unitNumber: 3 },
  { code: 'CAD', name: 'Contextual Applications of Differentiation', weight: '10-15%', unitNumber: 4 },
  { code: 'AAD', name: 'Analytical Applications of Differentiation', weight: '15-18%', unitNumber: 5 },
  { code: 'IAC', name: 'Integration and Accumulation of Change', weight: '17-20%', unitNumber: 6 },
  { code: 'DE', name: 'Differential Equations', weight: '6-12%', unitNumber: 7 },
  { code: 'AI', name: 'Applications of Integration', weight: '10-15%', unitNumber: 8 },
];

export const unitToSectionMap: Record<string, string> = {
  unit1: 'LC',
  unit2: 'DDFP',
  unit3: 'DCIF',
  unit4: 'CAD',
  unit5: 'AAD',
  unit6: 'IAC',
  unit7: 'DE',
  unit8: 'AI',
};
