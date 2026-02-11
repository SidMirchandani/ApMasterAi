
import { APSubject } from '../common/types';
import { physics2Units } from './units';

const sections: Record<string, { code: string; name: string; unitNumber: number }> = {
  unit1: { code: 'FLU', name: 'Fluids', unitNumber: 1 },
  unit2: { code: 'THD', name: 'Thermodynamics', unitNumber: 2 },
  unit3: { code: 'EFP', name: 'Electric Force, Field, and Potential', unitNumber: 3 },
  unit4: { code: 'EC', name: 'Electric Circuits', unitNumber: 4 },
  unit5: { code: 'MEI', name: 'Magnetism and Electromagnetic Induction', unitNumber: 5 },
  unit6: { code: 'GPO', name: 'Geometric and Physical Optics', unitNumber: 6 },
  unit7: { code: 'QAN', name: 'Quantum, Atomic, and Nuclear Physics', unitNumber: 7 },
  FLU: { code: 'FLU', name: 'Fluids', unitNumber: 1 },
  THD: { code: 'THD', name: 'Thermodynamics', unitNumber: 2 },
  EFP: { code: 'EFP', name: 'Electric Force, Field, and Potential', unitNumber: 3 },
  EC: { code: 'EC', name: 'Electric Circuits', unitNumber: 4 },
  MEI: { code: 'MEI', name: 'Magnetism and Electromagnetic Induction', unitNumber: 5 },
  GPO: { code: 'GPO', name: 'Geometric and Physical Optics', unitNumber: 6 },
  QAN: { code: 'QAN', name: 'Quantum, Atomic, and Nuclear Physics', unitNumber: 7 },
};

const metadata = {
  displayName: 'AP Physics 2: Algebra-Based',
  description: 'Fluids, thermodynamics, electricity, magnetism, optics, and modern physics',
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
