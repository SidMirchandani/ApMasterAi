
import { APSubject } from '../common/types';
import { physics1Units } from './units';

const sections: Record<string, { code: string; name: string; unitNumber: number }> = {
  unit1: { code: 'KIN', name: 'Kinematics', unitNumber: 1 },
  unit2: { code: 'DYN', name: 'Dynamics', unitNumber: 2 },
  unit3: { code: 'CMG', name: 'Circular Motion and Gravitation', unitNumber: 3 },
  unit4: { code: 'ENR', name: 'Energy', unitNumber: 4 },
  unit5: { code: 'MOM', name: 'Momentum', unitNumber: 5 },
  unit6: { code: 'SHM', name: 'Simple Harmonic Motion', unitNumber: 6 },
  unit7: { code: 'TRM', name: 'Torque and Rotational Motion', unitNumber: 7 },
  KIN: { code: 'KIN', name: 'Kinematics', unitNumber: 1 },
  DYN: { code: 'DYN', name: 'Dynamics', unitNumber: 2 },
  CMG: { code: 'CMG', name: 'Circular Motion and Gravitation', unitNumber: 3 },
  ENR: { code: 'ENR', name: 'Energy', unitNumber: 4 },
  MOM: { code: 'MOM', name: 'Momentum', unitNumber: 5 },
  SHM: { code: 'SHM', name: 'Simple Harmonic Motion', unitNumber: 6 },
  TRM: { code: 'TRM', name: 'Torque and Rotational Motion', unitNumber: 7 },
};

const metadata = {
  displayName: 'AP Physics 1: Algebra-Based',
  description: 'Newtonian mechanics, energy, momentum, rotational motion, and simple harmonic motion',
  units: 7,
  difficulty: 'Very Hard',
  examDate: 'May 14, 2026',
  examTitle: 'AP® Physics 1 Practice Exam',
  examSections: [
    {
      title: 'Section I: Multiple Choice',
      details: '40 Questions | 1 Hour 30 Minutes | 50% of Exam Score',
      description: 'Questions assess understanding of physics principles and problem-solving skills'
    }
  ],
};

export const apphys1: APSubject = {
  subjectCode: 'APPHYS1',
  displayName: metadata.displayName,
  units: physics1Units,
  sections,
  metadata,
};
