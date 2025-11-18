
import { APSubject } from '../common/types';
import { biologyUnits } from './units';

const sections: Record<string, { code: string; name: string; unitNumber: number }> = {
  unit1: { code: 'COL', name: 'Chemistry of Life', unitNumber: 1 },
  unit2: { code: 'CSF', name: 'Cell Structure and Function', unitNumber: 2 },
  unit3: { code: 'CE', name: 'Cellular Energetics', unitNumber: 3 },
  unit4: { code: 'CCCC', name: 'Cell Communication and Cell Cycle', unitNumber: 4 },
  unit5: { code: 'HER', name: 'Heredity', unitNumber: 5 },
  unit6: { code: 'GER', name: 'Gene Expression and Regulation', unitNumber: 6 },
  unit7: { code: 'NS', name: 'Natural Selection', unitNumber: 7 },
  unit8: { code: 'ECO', name: 'Ecology', unitNumber: 8 },
};

const metadata = {
  displayName: 'AP Biology',
  description: 'Molecular biology, genetics, evolution, ecology, and organism structure/function',
  units: 8,
  difficulty: 'Hard',
  examDate: 'May 4, 2026',
};

export const apbio: APSubject = {
  subjectCode: 'APBIO',
  displayName: metadata.displayName,
  units: biologyUnits,
  sections,
  metadata
};
