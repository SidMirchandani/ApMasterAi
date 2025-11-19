
import { APSubject } from '../common/types';
import { biologyUnits } from './units';

const sections: Record<string, { code: string; name: string; unitNumber: number }> = {
  unit1: { code: 'CL', name: 'Chemistry of Life', unitNumber: 1 },
  unit2: { code: 'CSF', name: 'Cell Structure and Function', unitNumber: 2 },
  unit3: { code: 'CE', name: 'Cellular Energetics', unitNumber: 3 },
  unit4: { code: 'CCC', name: 'Cell Communication and Cell Cycle', unitNumber: 4 },
  unit5: { code: 'HER', name: 'Heredity', unitNumber: 5 },
  unit6: { code: 'GER', name: 'Gene Expression and Regulation', unitNumber: 6 },
  unit7: { code: 'NS', name: 'Natural Selection', unitNumber: 7 },
  unit8: { code: 'ECO', name: 'Ecology', unitNumber: 8 },
  CL: { code: 'CL', name: 'Chemistry of Life', unitNumber: 1 },
  CSF: { code: 'CSF', name: 'Cell Structure and Function', unitNumber: 2 },
  CE: { code: 'CE', name: 'Cellular Energetics', unitNumber: 3 },
  CCC: { code: 'CCC', name: 'Cell Communication and Cell Cycle', unitNumber: 4 },
  HER: { code: 'HER', name: 'Heredity', unitNumber: 5 },
  GER: { code: 'GER', name: 'Gene Expression and Regulation', unitNumber: 6 },
  NS: { code: 'NS', name: 'Natural Selection', unitNumber: 7 },
  ECO: { code: 'ECO', name: 'Ecology', unitNumber: 8 },
};

const metadata = {
  displayName: 'AP Biology',
  description: 'Cell biology, genetics, evolution, and ecology',
  units: 8,
  difficulty: 'Hard',
  examDate: 'May 11, 2026',
  examTitle: 'AP® Biology Practice Exam',
  examSections: [
    {
      title: 'Section I: Multiple Choice',
      details: '60 Questions | 1 Hour 30 Minutes | 50% of Exam Score',
      description: 'Questions assess understanding of biological concepts and scientific practices'
    }
  ],
};

export const apbio: APSubject = {
  subjectCode: 'APBIO',
  displayName: metadata.displayName,
  units: biologyUnits,
  sections,
  metadata,
  unitToSectionMap: {
    'unit1': 'CL',
    'unit2': 'CSF',
    'unit3': 'CE',
    'unit4': 'CCC',
    'unit5': 'HER',
    'unit6': 'GER',
    'unit7': 'NS',
    'unit8': 'ECO',
  }
};
