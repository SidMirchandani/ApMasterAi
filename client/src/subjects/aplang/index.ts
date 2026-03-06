
import { APSubject } from '../common/types';
import { engLanguageUnits } from './units';

const sections: Record<string, { code: string; name: string; unitNumber: number }> = {
  unit1: { code: 'CRE', name: 'Claims, Reasoning, and Evidence', unitNumber: 1 },
  unit2: { code: 'SS', name: 'Synthesizing Sources', unitNumber: 2 },
  unit3: { code: 'RS', name: 'Rhetorical Situation', unitNumber: 3 },
  unit4: { code: 'OC', name: 'Organization and Commentary', unitNumber: 4 },
  unit5: { code: 'ARG', name: 'Argumentation', unitNumber: 5 },
  CRE: { code: 'CRE', name: 'Claims, Reasoning, and Evidence', unitNumber: 1 },
  SS: { code: 'SS', name: 'Synthesizing Sources', unitNumber: 2 },
  RS: { code: 'RS', name: 'Rhetorical Situation', unitNumber: 3 },
  OC: { code: 'OC', name: 'Organization and Commentary', unitNumber: 4 },
  ARG: { code: 'ARG', name: 'Argumentation', unitNumber: 5 },
};

const metadata = {
  displayName: 'AP English Language and Composition',
  description: 'Rhetorical analysis, argumentation, and nonfiction reading and writing',
  units: 5,
  difficulty: 'Medium',
  examDate: 'May 13, 2026',
  mcqOptionCount: 4,
  examTitle: 'AP® English Language and Composition Practice Exam',
  examSections: [
    {
      title: 'Section I: Multiple Choice',
      details: '45 Questions | 60 Minutes | 45% of Exam Score',
      description: 'Questions assess reading comprehension and rhetorical analysis of nonfiction texts'
    }
  ],
};

export const aplang: APSubject = {
  subjectCode: 'APLANG',
  displayName: metadata.displayName,
  units: engLanguageUnits,
  sections,
  metadata,
};
