
import { APSubject } from '../common/types';
import { worldHistoryUnits } from './units';

const sections: Record<string, { code: string; name: string; unitNumber: number }> = {
  unit1: { code: 'GT', name: 'The Global Tapestry', unitNumber: 1 },
  unit2: { code: 'NE', name: 'Networks of Exchange', unitNumber: 2 },
  unit3: { code: 'LBE', name: 'Land-Based Empires', unitNumber: 3 },
  unit4: { code: 'TI', name: 'Transoceanic Interconnections', unitNumber: 4 },
  unit5: { code: 'REV', name: 'Revolutions', unitNumber: 5 },
  unit6: { code: 'COI', name: 'Consequences of Industrialization', unitNumber: 6 },
  unit7: { code: 'GC', name: 'Global Conflict', unitNumber: 7 },
  unit8: { code: 'CWD', name: 'Cold War and Decolonization', unitNumber: 8 },
  unit9: { code: 'GLO', name: 'Globalization', unitNumber: 9 },
  GT: { code: 'GT', name: 'The Global Tapestry', unitNumber: 1 },
  NE: { code: 'NE', name: 'Networks of Exchange', unitNumber: 2 },
  LBE: { code: 'LBE', name: 'Land-Based Empires', unitNumber: 3 },
  TI: { code: 'TI', name: 'Transoceanic Interconnections', unitNumber: 4 },
  REV: { code: 'REV', name: 'Revolutions', unitNumber: 5 },
  COI: { code: 'COI', name: 'Consequences of Industrialization', unitNumber: 6 },
  GC: { code: 'GC', name: 'Global Conflict', unitNumber: 7 },
  CWD: { code: 'CWD', name: 'Cold War and Decolonization', unitNumber: 8 },
  GLO: { code: 'GLO', name: 'Globalization', unitNumber: 9 },
};

const metadata = {
  displayName: 'AP World History: Modern',
  description: 'Global historical developments from 1200 CE to the present',
  units: 9,
  difficulty: 'Hard',
  examDate: 'May 14, 2026',
  examTitle: 'AP® World History: Modern Practice Exam',
  examSections: [
    {
      title: 'Section I: Multiple Choice',
      details: '55 Questions | 55 Minutes | 40% of Exam Score',
      description: 'Questions assess understanding of world historical concepts and developments across all nine units'
    }
  ],
};

export const apwh: APSubject = {
  subjectCode: 'APWH',
  displayName: metadata.displayName,
  units: worldHistoryUnits,
  sections,
  metadata,
};
