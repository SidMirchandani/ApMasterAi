
import { SubjectSection } from '../common/interfaces';

export const sections: SubjectSection[] = [
  { code: 'BEC', name: 'Basic Economic Concepts', weight: '5-10%', unitNumber: 1 },
  { code: 'EIBC', name: 'Economic Indicators & Business Cycle', weight: '12-17%', unitNumber: 2 },
  { code: 'NIPD', name: 'National Income & Price Determination', weight: '17-27%', unitNumber: 3 },
  { code: 'FS', name: 'Financial Sector', weight: '18-23%', unitNumber: 4 },
  { code: 'LRCSP', name: 'Long-Run Consequences of Stabilization Policies', weight: '20-30%', unitNumber: 5 },
  { code: 'OEITF', name: 'Open Economy—International Trade and Finance', weight: '10-13%', unitNumber: 6 },
];

export const unitToSectionMap: Record<string, string> = {
  unit1: 'BEC',
  unit2: 'EIBC',
  unit3: 'NIPD',
  unit4: 'FS',
  unit5: 'LRCSP',
  unit6: 'OEITF',
};
