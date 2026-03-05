
import { APSubject } from '../common/types';
import { csaUnits } from './units';

const sections: Record<string, { code: string; name: string; unitNumber: number }> = {
  unit1: { code: 'PT', name: 'Primitive Types', unitNumber: 1 },
  unit2: { code: 'UO', name: 'Using Objects', unitNumber: 2 },
  unit3: { code: 'BEI', name: 'Boolean Expressions and if Statements', unitNumber: 3 },
  unit4: { code: 'ITR', name: 'Iteration', unitNumber: 4 },
  unit5: { code: 'WC', name: 'Writing Classes', unitNumber: 5 },
  unit6: { code: 'ARR', name: 'Array', unitNumber: 6 },
  unit7: { code: 'AL', name: 'ArrayList', unitNumber: 7 },
  unit8: { code: 'TDA', name: '2D Array', unitNumber: 8 },
  unit9: { code: 'INH', name: 'Inheritance', unitNumber: 9 },
  unit10: { code: 'REC', name: 'Recursion', unitNumber: 10 },
  PT: { code: 'PT', name: 'Primitive Types', unitNumber: 1 },
  UO: { code: 'UO', name: 'Using Objects', unitNumber: 2 },
  BEI: { code: 'BEI', name: 'Boolean Expressions and if Statements', unitNumber: 3 },
  ITR: { code: 'ITR', name: 'Iteration', unitNumber: 4 },
  WC: { code: 'WC', name: 'Writing Classes', unitNumber: 5 },
  ARR: { code: 'ARR', name: 'Array', unitNumber: 6 },
  AL: { code: 'AL', name: 'ArrayList', unitNumber: 7 },
  TDA: { code: 'TDA', name: '2D Array', unitNumber: 8 },
  INH: { code: 'INH', name: 'Inheritance', unitNumber: 9 },
  REC: { code: 'REC', name: 'Recursion', unitNumber: 10 },
};

const metadata = {
  displayName: 'AP Computer Science A',
  description: 'Java programming, object-oriented design, data structures, and algorithms',
  units: 10,
  difficulty: 'Hard',
  examDate: 'May 15, 2026',
  examTitle: 'AP® Computer Science A Practice Exam',
  examSections: [
    {
      title: 'Section I: Multiple Choice',
      details: '40 Questions | 1 Hour 30 Minutes | 50% of Exam Score',
      description: 'Questions assess programming concepts, code analysis, and algorithmic thinking in Java'
    }
  ],
};

export const apcsa: APSubject = {
  subjectCode: 'APCSA',
  displayName: metadata.displayName,
  units: csaUnits,
  sections,
  metadata,
};
