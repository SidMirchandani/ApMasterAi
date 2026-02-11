
import { APSubject } from '../common/types';
import { euroHistoryUnits } from './units';

const sections: Record<string, { code: string; name: string; unitNumber: number }> = {
  unit1: { code: 'RE', name: 'Renaissance and Exploration', unitNumber: 1 },
  unit2: { code: 'AR', name: 'Age of Reformation', unitNumber: 2 },
  unit3: { code: 'AC', name: 'Absolutism and Constitutionalism', unitNumber: 3 },
  unit4: { code: 'SPP', name: 'Scientific, Philosophical, and Political Developments', unitNumber: 4 },
  unit5: { code: 'CRR', name: 'Conflict, Revolution, and Reaction', unitNumber: 5 },
  unit6: { code: 'IND', name: 'Industrialization and Its Effects', unitNumber: 6 },
  unit7: { code: 'NPP', name: '19th-Century Perspectives and Political Developments', unitNumber: 7 },
  unit8: { code: 'GCF', name: '20th-Century Global Conflicts', unitNumber: 8 },
  unit9: { code: 'CCE', name: 'Cold War and Contemporary Europe', unitNumber: 9 },
  RE: { code: 'RE', name: 'Renaissance and Exploration', unitNumber: 1 },
  AR: { code: 'AR', name: 'Age of Reformation', unitNumber: 2 },
  AC: { code: 'AC', name: 'Absolutism and Constitutionalism', unitNumber: 3 },
  SPP: { code: 'SPP', name: 'Scientific, Philosophical, and Political Developments', unitNumber: 4 },
  CRR: { code: 'CRR', name: 'Conflict, Revolution, and Reaction', unitNumber: 5 },
  IND: { code: 'IND', name: 'Industrialization and Its Effects', unitNumber: 6 },
  NPP: { code: 'NPP', name: '19th-Century Perspectives and Political Developments', unitNumber: 7 },
  GCF: { code: 'GCF', name: '20th-Century Global Conflicts', unitNumber: 8 },
  CCE: { code: 'CCE', name: 'Cold War and Contemporary Europe', unitNumber: 9 },
};

const metadata = {
  displayName: 'AP European History',
  description: 'European history from the Renaissance to the present',
  units: 9,
  difficulty: 'Hard',
  examDate: 'May 7, 2026',
  examTitle: 'AP® European History Practice Exam',
  examSections: [
    {
      title: 'Section I: Multiple Choice',
      details: '55 Questions | 55 Minutes | 40% of Exam Score',
      description: 'Questions assess understanding of European historical concepts and developments across all nine units'
    }
  ],
};

export const apeuro: APSubject = {
  subjectCode: 'APEURO',
  displayName: metadata.displayName,
  units: euroHistoryUnits,
  sections,
  metadata,
};
