
import { SubjectSection } from '../common/interfaces';

export const sections: SubjectSection[] = [
  { code: 'BEC', name: 'Basic Economic Concepts', weight: '12-15%', unitNumber: 1 },
  { code: 'SD', name: 'Supply and Demand', weight: '20-25%', unitNumber: 2 },
  { code: 'PCCPM', name: 'Production, Cost, and the Perfect Competition Model', weight: '22-25%', unitNumber: 3 },
  { code: 'IC', name: 'Imperfect Competition', weight: '15-22%', unitNumber: 4 },
  { code: 'FM', name: 'Factor Markets', weight: '10-13%', unitNumber: 5 },
  { code: 'MFROG', name: 'Market Failure and the Role of Government', weight: '8-13%', unitNumber: 6 },
];

export const unitToSectionMap: Record<string, string> = {
  unit1: 'BEC',
  unit2: 'SD',
  unit3: 'PCCPM',
  unit4: 'IC',
  unit5: 'FM',
  unit6: 'MFROG',
};
