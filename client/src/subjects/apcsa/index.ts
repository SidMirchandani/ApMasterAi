import { APSubject } from '../common/types';
import { csaUnits } from './units';

const sections: Record<string, { code: string; name: string; unitNumber: number }> = {
  unit1: { code: 'U1', name: 'Using Objects and Methods', unitNumber: 1 },
  unit2: { code: 'U2', name: 'Selection and Iteration', unitNumber: 2 },
  unit3: { code: 'U3', name: 'Class Creation', unitNumber: 3 },
  unit4: { code: 'U4', name: 'Data Collections', unitNumber: 4 },
  U1: { code: 'U1', name: 'Using Objects and Methods', unitNumber: 1 },
  U2: { code: 'U2', name: 'Selection and Iteration', unitNumber: 2 },
  U3: { code: 'U3', name: 'Class Creation', unitNumber: 3 },
  U4: { code: 'U4', name: 'Data Collections', unitNumber: 4 },
};

const metadata = {
  displayName: 'AP Computer Science A',
  description: 'Java programming, object-oriented design, data structures, and algorithms',
  units: 4,
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
