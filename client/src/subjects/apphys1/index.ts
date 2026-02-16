
import { APSubject } from '../common/types';
import { physics1Units } from './units';

const sections: Record<string, { code: string; name: string; unitNumber: number }> = {
  unit1: { code: 'KIN', name: 'Kinematics', unitNumber: 1 },
  unit2: { code: 'FTD', name: 'Force and Translational Dynamics', unitNumber: 2 },
  unit3: { code: 'WEP', name: 'Work, Energy, and Power', unitNumber: 3 },
  unit4: { code: 'LMO', name: 'Linear Momentum', unitNumber: 4 },
  unit5: { code: 'TRD', name: 'Torque and Rotational Dynamics', unitNumber: 5 },
  unit6: { code: 'EMR', name: 'Energy and Momentum of Rotating Systems', unitNumber: 6 },
  unit7: { code: 'OSC', name: 'Oscillations', unitNumber: 7 },
  unit8: { code: 'FLU', name: 'Fluids', unitNumber: 8 },
  KIN: { code: 'KIN', name: 'Kinematics', unitNumber: 1 },
  FTD: { code: 'FTD', name: 'Force and Translational Dynamics', unitNumber: 2 },
  WEP: { code: 'WEP', name: 'Work, Energy, and Power', unitNumber: 3 },
  LMO: { code: 'LMO', name: 'Linear Momentum', unitNumber: 4 },
  TRD: { code: 'TRD', name: 'Torque and Rotational Dynamics', unitNumber: 5 },
  EMR: { code: 'EMR', name: 'Energy and Momentum of Rotating Systems', unitNumber: 6 },
  OSC: { code: 'OSC', name: 'Oscillations', unitNumber: 7 },
  FLU: { code: 'FLU', name: 'Fluids', unitNumber: 8 },
};

const metadata = {
  displayName: 'AP Physics 1: Algebra-Based',
  description: 'Kinematics, forces, energy, momentum, rotational dynamics, oscillations, and fluids',
  units: 8,
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
