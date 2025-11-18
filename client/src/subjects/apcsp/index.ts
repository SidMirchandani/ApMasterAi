
import { APSubject } from '../common/types';
import { computerSciencePrinciplesUnits } from './units';

const sections: Record<string, { code: string; name: string; unitNumber: number }> = {
  bigidea1: { code: 'CRD', name: 'Creative Development', unitNumber: 1 },
  bigidea2: { code: 'DAT', name: 'Data', unitNumber: 2 },
  bigidea3: { code: 'AAP', name: 'Algorithms and Programming', unitNumber: 3 },
  bigidea4: { code: 'CSN', name: 'Computer Systems and Networks', unitNumber: 4 },
  bigidea5: { code: 'IOC', name: 'Impact of Computing', unitNumber: 5 },
  unit1: { code: 'CRD', name: 'Creative Development', unitNumber: 1 },
  unit2: { code: 'DAT', name: 'Data', unitNumber: 2 },
  unit3: { code: 'AAP', name: 'Algorithms and Programming', unitNumber: 3 },
  unit4: { code: 'CSN', name: 'Computer Systems and Networks', unitNumber: 4 },
  unit5: { code: 'IOC', name: 'Impact of Computing', unitNumber: 5 },
};

const metadata = {
  displayName: 'AP Computer Science Principles',
  description: 'Computational thinking, programming, internet, data analysis, and impact of computing',
  units: 5,
  difficulty: 'Medium',
  examDate: 'May 9, 2025',
  examTitle: 'AP® Computer Science Principles Practice Exam',
  examSections: [
    {
      title: 'Section I: End-of-Course Multiple-Choice Exam',
      details: '70 multiple-choice questions | 120 minutes | 70% of score | 4 answer options',
      description: ''
    }
  ],
};

export const apcsp: APSubject = {
  subjectCode: 'APCSP',
  displayName: metadata.displayName,
  units: computerSciencePrinciplesUnits,
  sections,
  metadata
};
