
import { APSubject } from '../common/types';
import { engLiteratureUnits } from './units';

const sections: Record<string, { code: string; name: string; unitNumber: number }> = {
  unit1: { code: 'SF1', name: 'Short Fiction I', unitNumber: 1 },
  unit2: { code: 'PO1', name: 'Poetry I', unitNumber: 2 },
  unit3: { code: 'LF1', name: 'Longer Fiction or Drama I', unitNumber: 3 },
  unit4: { code: 'SF2', name: 'Short Fiction II', unitNumber: 4 },
  unit5: { code: 'PO2', name: 'Poetry II', unitNumber: 5 },
  unit6: { code: 'LF2', name: 'Longer Fiction or Drama II', unitNumber: 6 },
  unit7: { code: 'SF3', name: 'Short Fiction III', unitNumber: 7 },
  unit8: { code: 'PO3', name: 'Poetry III', unitNumber: 8 },
  unit9: { code: 'LF3', name: 'Longer Fiction or Drama III', unitNumber: 9 },
  SF1: { code: 'SF1', name: 'Short Fiction I', unitNumber: 1 },
  PO1: { code: 'PO1', name: 'Poetry I', unitNumber: 2 },
  LF1: { code: 'LF1', name: 'Longer Fiction or Drama I', unitNumber: 3 },
  SF2: { code: 'SF2', name: 'Short Fiction II', unitNumber: 4 },
  PO2: { code: 'PO2', name: 'Poetry II', unitNumber: 5 },
  LF2: { code: 'LF2', name: 'Longer Fiction or Drama II', unitNumber: 6 },
  SF3: { code: 'SF3', name: 'Short Fiction III', unitNumber: 7 },
  PO3: { code: 'PO3', name: 'Poetry III', unitNumber: 8 },
  LF3: { code: 'LF3', name: 'Longer Fiction or Drama III', unitNumber: 9 },
};

const metadata = {
  displayName: 'AP English Literature and Composition',
  description: 'Literary analysis of fiction, poetry, and drama from various periods and genres',
  units: 9,
  difficulty: 'Hard',
  examDate: 'May 6, 2026',
  examTitle: 'AP® English Literature and Composition Practice Exam',
  examSections: [
    {
      title: 'Section I: Multiple Choice',
      details: '55 Questions | 1 Hour | 45% of Exam Score',
      description: 'Questions assess close reading and analysis of prose fiction and poetry passages'
    }
  ],
};

export const aplit: APSubject = {
  subjectCode: 'APLIT',
  displayName: metadata.displayName,
  units: engLiteratureUnits,
  sections,
  metadata,
};
