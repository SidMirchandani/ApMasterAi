
import { APSubject } from '../common/types';
import { psychologyUnits } from './units';

const sections: Record<string, { code: string; name: string; unitNumber: number }> = {
  unit1: { code: 'BIO', name: 'Biological Bases of Behavior', unitNumber: 1 },
  unit2: { code: 'COG', name: 'Cognition', unitNumber: 2 },
  unit3: { code: 'DEV', name: 'Development and Learning', unitNumber: 3 },
  unit4: { code: 'SOC', name: 'Social Psychology and Personality', unitNumber: 4 },
  unit5: { code: 'MPH', name: 'Mental and Physical Health', unitNumber: 5 },
};

export const unitToSectionMap: Record<string, string> = {
  unit1: 'BIO',
  unit2: 'COG',
  unit3: 'DEV',
  unit4: 'SOC',
  unit5: 'MPH',
};

const metadata = {
  displayName: 'AP Psychology',
  description: 'Biological bases, cognition, development, social psychology, and mental and physical health',
  units: 5,
  difficulty: 'Medium',
  examDate: 'May 6, 2026',
  examTitle: 'AP® Psychology Practice Exam',
  examSections: [
    {
      title: 'Section I: Multiple Choice',
      details: '75 Questions | 90 Minutes | 66.7% of Exam Score',
      description: 'Questions assess understanding of psychological concepts and research methods'
    },
    {
      title: 'Section II: Free Response',
      details: '2 Questions | 70 Minutes | 33.3% of Exam Score',
      description: 'Question 1: Article Analysis Question (16.65%)\nQuestion 2: Evidence-Based Question (16.65%)'
    }
  ],
  breakdown: [
    { name: 'Unit 1: Biological Bases of Behavior', weight: '15-25%' },
    { name: 'Unit 2: Cognition', weight: '15-25%' },
    { name: 'Unit 3: Development and Learning', weight: '15-25%' },
    { name: 'Unit 4: Social Psychology and Personality', weight: '15-25%' },
    { name: 'Unit 5: Mental and Physical Health', weight: '15-25%' }
  ]
};

export const appsych: APSubject = {
  subjectCode: 'APPSYCH',
  displayName: metadata.displayName,
  units: psychologyUnits,
  sections,
  metadata
};
