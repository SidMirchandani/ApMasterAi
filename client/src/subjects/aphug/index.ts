
import { APSubject } from '../common/types';
import { humanGeoUnits } from './units';

const sections: Record<string, { code: string; name: string; unitNumber: number }> = {
  unit1: { code: 'TG', name: 'Thinking Geographically', unitNumber: 1 },
  unit2: { code: 'PMP', name: 'Population and Migration Patterns and Processes', unitNumber: 2 },
  unit3: { code: 'CPP', name: 'Cultural Patterns and Processes', unitNumber: 3 },
  unit4: { code: 'PPP', name: 'Political Patterns and Processes', unitNumber: 4 },
  unit5: { code: 'ARL', name: 'Agriculture and Rural Land-Use Patterns and Processes', unitNumber: 5 },
  unit6: { code: 'CUL', name: 'Cities and Urban Land-Use Patterns and Processes', unitNumber: 6 },
  unit7: { code: 'IED', name: 'Industrial and Economic Development Patterns and Processes', unitNumber: 7 },
  TG: { code: 'TG', name: 'Thinking Geographically', unitNumber: 1 },
  PMP: { code: 'PMP', name: 'Population and Migration Patterns and Processes', unitNumber: 2 },
  CPP: { code: 'CPP', name: 'Cultural Patterns and Processes', unitNumber: 3 },
  PPP: { code: 'PPP', name: 'Political Patterns and Processes', unitNumber: 4 },
  ARL: { code: 'ARL', name: 'Agriculture and Rural Land-Use Patterns and Processes', unitNumber: 5 },
  CUL: { code: 'CUL', name: 'Cities and Urban Land-Use Patterns and Processes', unitNumber: 6 },
  IED: { code: 'IED', name: 'Industrial and Economic Development Patterns and Processes', unitNumber: 7 },
};

const metadata = {
  displayName: 'AP Human Geography',
  description: 'Spatial patterns of human activities including population, culture, politics, and economics',
  units: 7,
  difficulty: 'Easy',
  examDate: 'May 5, 2026',
  examTitle: 'AP® Human Geography Practice Exam',
  examSections: [
    {
      title: 'Section I: Multiple Choice',
      details: '60 Questions | 1 Hour | 50% of Exam Score',
      description: 'Questions assess geographic concepts, spatial relationships, and data interpretation'
    }
  ],
};

export const aphug: APSubject = {
  subjectCode: 'APHUG',
  displayName: metadata.displayName,
  units: humanGeoUnits,
  sections,
  metadata,
};
