
import { APSubject } from '../common/types';
import { usHistoryUnits } from './units';

const sections: Record<string, { code: string; name: string; unitNumber: number }> = {
  unit1: { code: 'P1', name: 'Period 1: 1491-1607', unitNumber: 1 },
  unit2: { code: 'P2', name: 'Period 2: 1607-1754', unitNumber: 2 },
  unit3: { code: 'P3', name: 'Period 3: 1754-1800', unitNumber: 3 },
  unit4: { code: 'P4', name: 'Period 4: 1800-1848', unitNumber: 4 },
  unit5: { code: 'P5', name: 'Period 5: 1844-1877', unitNumber: 5 },
  unit6: { code: 'P6', name: 'Period 6: 1865-1898', unitNumber: 6 },
  unit7: { code: 'P7', name: 'Period 7: 1890-1945', unitNumber: 7 },
  unit8: { code: 'P8', name: 'Period 8: 1945-1980', unitNumber: 8 },
  unit9: { code: 'P9', name: 'Period 9: 1980-Present', unitNumber: 9 },
  P1: { code: 'P1', name: 'Period 1: 1491-1607', unitNumber: 1 },
  P2: { code: 'P2', name: 'Period 2: 1607-1754', unitNumber: 2 },
  P3: { code: 'P3', name: 'Period 3: 1754-1800', unitNumber: 3 },
  P4: { code: 'P4', name: 'Period 4: 1800-1848', unitNumber: 4 },
  P5: { code: 'P5', name: 'Period 5: 1844-1877', unitNumber: 5 },
  P6: { code: 'P6', name: 'Period 6: 1865-1898', unitNumber: 6 },
  P7: { code: 'P7', name: 'Period 7: 1890-1945', unitNumber: 7 },
  P8: { code: 'P8', name: 'Period 8: 1945-1980', unitNumber: 8 },
  P9: { code: 'P9', name: 'Period 9: 1980-Present', unitNumber: 9 },
};

const metadata = {
  displayName: 'AP U.S. History',
  description: 'American history from pre-Columbian societies to the present',
  units: 9,
  difficulty: 'Hard',
  examDate: 'May 8, 2026',
  examTitle: 'AP® U.S. History Practice Exam',
  examSections: [
    {
      title: 'Section I: Multiple Choice',
      details: '55 Questions | 55 Minutes | 40% of Exam Score',
      description: 'Questions assess understanding of historical concepts, developments, and processes across all nine periods'
    }
  ],
};

export const apush: APSubject = {
  subjectCode: 'APUSH',
  displayName: metadata.displayName,
  units: usHistoryUnits,
  sections,
  metadata,
};
