
import { APSubject } from '../common/types';
import { microeconomicsUnits } from './units';

const sections: Record<string, { code: string; name: string; unitNumber: number }> = {
  unit1: { code: 'BEC', name: 'Basic Economic Concepts', unitNumber: 1 },
  unit2: { code: 'SD', name: 'Supply and Demand', unitNumber: 2 },
  unit3: { code: 'PCCPM', name: 'Production, Cost, and the Perfect Competition Model', unitNumber: 3 },
  unit4: { code: 'IC', name: 'Imperfect Competition', unitNumber: 4 },
  unit5: { code: 'FM', name: 'Factor Markets', unitNumber: 5 },
  unit6: { code: 'MFROG', name: 'Market Failure and the Role of Government', unitNumber: 6 },
};

const metadata = {
  displayName: 'AP Microeconomics',
  description: 'Supply and demand, market structures, factor markets, and market failure',
  units: 6,
  difficulty: 'Medium',
  examDate: 'May 15, 2025',
};

export const microeconomics: APSubject = {
  subjectCode: 'APMICRO',
  displayName: metadata.displayName,
  units: microeconomicsUnits,
  sections,
  metadata
};
