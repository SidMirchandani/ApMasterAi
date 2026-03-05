
import { APSubject } from '../common/types';
import { envScienceUnits } from './units';

const sections: Record<string, { code: string; name: string; unitNumber: number }> = {
  unit1: { code: 'LWE', name: 'The Living World: Ecosystems', unitNumber: 1 },
  unit2: { code: 'LWB', name: 'The Living World: Biodiversity', unitNumber: 2 },
  unit3: { code: 'POP', name: 'Populations', unitNumber: 3 },
  unit4: { code: 'ESR', name: 'Earth Systems and Resources', unitNumber: 4 },
  unit5: { code: 'LWU', name: 'Land and Water Use', unitNumber: 5 },
  unit6: { code: 'ERC', name: 'Energy Resources and Consumption', unitNumber: 6 },
  unit7: { code: 'APL', name: 'Atmospheric Pollution', unitNumber: 7 },
  unit8: { code: 'ATP', name: 'Aquatic and Terrestrial Pollution', unitNumber: 8 },
  unit9: { code: 'GCH', name: 'Global Change', unitNumber: 9 },
  LWE: { code: 'LWE', name: 'The Living World: Ecosystems', unitNumber: 1 },
  LWB: { code: 'LWB', name: 'The Living World: Biodiversity', unitNumber: 2 },
  POP: { code: 'POP', name: 'Populations', unitNumber: 3 },
  ESR: { code: 'ESR', name: 'Earth Systems and Resources', unitNumber: 4 },
  LWU: { code: 'LWU', name: 'Land and Water Use', unitNumber: 5 },
  ERC: { code: 'ERC', name: 'Energy Resources and Consumption', unitNumber: 6 },
  APL: { code: 'APL', name: 'Atmospheric Pollution', unitNumber: 7 },
  ATP: { code: 'ATP', name: 'Aquatic and Terrestrial Pollution', unitNumber: 8 },
  GCH: { code: 'GCH', name: 'Global Change', unitNumber: 9 },
};

const metadata = {
  displayName: 'AP Environmental Science',
  description: 'Ecosystems, biodiversity, natural resources, pollution, and global environmental change',
  units: 9,
  difficulty: 'Medium',
  examDate: 'May 15, 2026',
  examTitle: 'AP® Environmental Science Practice Exam',
  examSections: [
    {
      title: 'Section I: Multiple Choice',
      details: '80 Questions | 1 Hour 30 Minutes | 60% of Exam Score',
      description: 'Questions assess understanding of environmental science concepts, data analysis, and problem-solving'
    }
  ],
};

export const apes: APSubject = {
  subjectCode: 'APES',
  displayName: metadata.displayName,
  units: envScienceUnits,
  sections,
  metadata,
};
