
import { APSubject } from '../common/types';
import { chemistryUnits } from './units';

const sections: Record<string, { code: string; name: string; unitNumber: number }> = {
  unit1: { code: 'ASP', name: 'Atomic Structure & Properties', unitNumber: 1 },
  unit2: { code: 'MIS', name: 'Molecular & Ionic Structure', unitNumber: 2 },
  unit3: { code: 'IMF', name: 'Intermolecular Forces & Properties', unitNumber: 3 },
  unit4: { code: 'RXN', name: 'Chemical Reactions', unitNumber: 4 },
  unit5: { code: 'KIN', name: 'Kinetics', unitNumber: 5 },
  unit6: { code: 'THERMO', name: 'Thermodynamics', unitNumber: 6 },
  unit7: { code: 'EQM', name: 'Equilibrium', unitNumber: 7 },
  unit8: { code: 'ACB', name: 'Acids & Bases', unitNumber: 8 },
  unit9: { code: 'ATD', name: 'Applications of Thermodynamics', unitNumber: 9 },
  ASP: { code: 'ASP', name: 'Atomic Structure & Properties', unitNumber: 1 },
  MIS: { code: 'MIS', name: 'Molecular & Ionic Structure', unitNumber: 2 },
  IMF: { code: 'IMF', name: 'Intermolecular Forces & Properties', unitNumber: 3 },
  RXN: { code: 'RXN', name: 'Chemical Reactions', unitNumber: 4 },
  KIN: { code: 'KIN', name: 'Kinetics', unitNumber: 5 },
  THERMO: { code: 'THERMO', name: 'Thermodynamics', unitNumber: 6 },
  EQM: { code: 'EQM', name: 'Equilibrium', unitNumber: 7 },
  ACB: { code: 'ACB', name: 'Acids & Bases', unitNumber: 8 },
  ATD: { code: 'ATD', name: 'Applications of Thermodynamics', unitNumber: 9 },
};

const metadata = {
  displayName: 'AP Chemistry',
  description: 'Atomic structure, bonding, reactions, kinetics, thermodynamics, and equilibrium',
  units: 9,
  difficulty: 'Hard',
  examDate: 'May 5, 2026',
  examTitle: 'AP® Chemistry Practice Exam',
  examSections: [
    {
      title: 'Section I: Multiple Choice',
      details: '60 Questions | 90 Minutes | 50% of Exam Score',
      description: 'Questions require the use of chemistry content knowledge and reasoning across the range of course topics.'
    }
  ],
  breakdown: [
    { name: 'Unit 1: Atomic Structure and Properties', weight: '7-9%' },
    { name: 'Unit 2: Molecular and Ionic Compound Structure and Properties', weight: '7-9%' },
    { name: 'Unit 3: Intermolecular Forces and Properties', weight: '18-22%' },
    { name: 'Unit 4: Chemical Reactions', weight: '7-9%' },
    { name: 'Unit 5: Kinetics', weight: '7-9%' },
    { name: 'Unit 6: Thermodynamics', weight: '7-9%' },
    { name: 'Unit 7: Equilibrium', weight: '7-9%' },
    { name: 'Unit 8: Acids and Bases', weight: '11-15%' },
    { name: 'Unit 9: Applications of Thermodynamics', weight: '7-9%' }
  ]
};

export const apchem: APSubject = {
  subjectCode: 'APCHEM',
  displayName: metadata.displayName,
  units: chemistryUnits,
  sections,
  metadata,
};
