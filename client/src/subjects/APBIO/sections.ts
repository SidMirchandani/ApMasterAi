
import { SubjectSection } from '../common/interfaces';

export const sections: SubjectSection[] = [
  { code: 'COL', name: 'Chemistry of Life', weight: '8-11%', unitNumber: 1 },
  { code: 'CSF', name: 'Cell Structure and Function', weight: '10-13%', unitNumber: 2 },
  { code: 'CE', name: 'Cellular Energetics', weight: '12-16%', unitNumber: 3 },
  { code: 'CCCC', name: 'Cell Communication and Cell Cycle', weight: '10-15%', unitNumber: 4 },
  { code: 'HER', name: 'Heredity', weight: '8-11%', unitNumber: 5 },
  { code: 'GER', name: 'Gene Expression and Regulation', weight: '12-16%', unitNumber: 6 },
  { code: 'NS', name: 'Natural Selection', weight: '13-20%', unitNumber: 7 },
  { code: 'ECO', name: 'Ecology', weight: '10-15%', unitNumber: 8 },
];

export const unitToSectionMap: Record<string, string> = {
  unit1: 'COL',
  unit2: 'CSF',
  unit3: 'CE',
  unit4: 'CCCC',
  unit5: 'HER',
  unit6: 'GER',
  unit7: 'NS',
  unit8: 'ECO',
};
