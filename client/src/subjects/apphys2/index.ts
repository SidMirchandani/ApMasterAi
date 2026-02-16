
import { APSubject } from '../common/types';
import { physics2Units } from './units';

const sections: Record<string, { code: string; name: string; unitNumber: number }> = {
  unit1: { code: 'THD', name: 'Thermodynamics', unitNumber: 1 },
  unit2: { code: 'EFP', name: 'Electric Force, Field, and Potential', unitNumber: 2 },
  unit3: { code: 'EC', name: 'Electric Circuits', unitNumber: 3 },
  unit4: { code: 'MEI', name: 'Magnetism and Electromagnetism', unitNumber: 4 },
  unit5: { code: 'GPO', name: 'Geometric Optics', unitNumber: 5 },
  unit6: { code: 'WPO', name: 'Waves, Sound, and Physical Optics', unitNumber: 6 },
  unit7: { code: 'MOD', name: 'Modern Physics', unitNumber: 7 },
  THD: { code: 'THD', name: 'Thermodynamics', unitNumber: 1 },
  EFP: { code: 'EFP', name: 'Electric Force, Field, and Potential', unitNumber: 2 },
  EC: { code: 'EC', name: 'Electric Circuits', unitNumber: 3 },
  MEI: { code: 'MEI', name: 'Magnetism and Electromagnetism', unitNumber: 4 },
  GPO: { code: 'GPO', name: 'Geometric Optics', unitNumber: 5 },
  WPO: { code: 'WPO', name: 'Waves, Sound, and Physical Optics', unitNumber: 6 },
  MOD: { code: 'MOD', name: 'Modern Physics', unitNumber: 7 },
};

const metadata = {
  displayName: 'AP Physics 2: Algebra-Based',
  description: 'Thermodynamics, electricity, magnetism, optics, waves, and modern physics',
  units: 7,
  difficulty: 'Very Hard',
  examDate: 'May 14, 2026',
  examTitle: 'AP® Physics 2 Practice Exam',
  examSections: [
    {
      title: 'Section I: Multiple Choice',
      details: '40 Questions | 1 Hour 30 Minutes | 50% of Exam Score',
      description: 'Questions assess understanding of physics principles in thermodynamics, electricity, magnetism, and modern physics'
    }
  ],
};

export const apphys2: APSubject = {
  subjectCode: 'APPHYS2',
  displayName: metadata.displayName,
  units: physics2Units,
  sections,
  metadata,
};
