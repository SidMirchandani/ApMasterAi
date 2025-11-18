
import { APSubject } from '../common/types';
import { governmentUnits } from './units';

const sections: Record<string, { code: string; name: string; unitNumber: number }> = {
  unit1: { code: 'FAD', name: 'Foundations of American Democracy', unitNumber: 1 },
  unit2: { code: 'IAB', name: 'Interactions Among Branches of Government', unitNumber: 2 },
  unit3: { code: 'CLCR', name: 'Civil Liberties and Civil Rights', unitNumber: 3 },
  unit4: { code: 'APIB', name: 'American Political Ideologies and Beliefs', unitNumber: 4 },
  unit5: { code: 'PP', name: 'Political Participation', unitNumber: 5 },
  FAD: { code: 'FAD', name: 'Foundations of American Democracy', unitNumber: 1 },
  IAB: { code: 'IAB', name: 'Interactions Among Branches of Government', unitNumber: 2 },
  CLCR: { code: 'CLCR', name: 'Civil Liberties and Civil Rights', unitNumber: 3 },
  APIB: { code: 'APIB', name: 'American Political Ideologies and Beliefs', unitNumber: 4 },
  PP: { code: 'PP', name: 'Political Participation', unitNumber: 5 },
};

const metadata = {
  displayName: 'AP U.S. Government and Politics',
  description: 'Constitutional foundations, branches of government, civil liberties and rights, political ideologies, and participation',
  units: 5,
  difficulty: 'Medium',
  examDate: 'May 5, 2026',
  examTitle: 'AP® U.S. Government and Politics Practice Exam',
  examSections: [
    {
      title: 'Section I: Multiple Choice',
      details: '55 Questions | 80 Minutes | 50% of Exam Score',
      description: 'Questions assess understanding of government concepts, political processes, and the U.S. political system'
    }
  ],
  breakdown: [
    { name: 'Unit 1: Foundations of American Democracy', weight: '15-22%' },
    { name: 'Unit 2: Interactions Among Branches of Government', weight: '25-36%' },
    { name: 'Unit 3: Civil Liberties and Civil Rights', weight: '13-18%' },
    { name: 'Unit 4: American Political Ideologies and Beliefs', weight: '10-15%' },
    { name: 'Unit 5: Political Participation', weight: '20-27%' }
  ]
};

export const apgov: APSubject = {
  subjectCode: 'APGOV',
  displayName: metadata.displayName,
  units: governmentUnits,
  sections,
  metadata
};

export const unitToSectionMap: Record<string, string> = {
  'unit1': 'FAD',
  'unit2': 'IAB',
  'unit3': 'CLCR',
  'unit4': 'APIB',
  'unit5': 'PP',
};
