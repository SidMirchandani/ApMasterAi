
import { APSubject, Unit } from './common/types';

// Import all subject modules
import { apmacro } from './apmacro';
import { apmicro } from './apmicro';
import { apcsp } from './apcsp';
import { apbio } from './apbio';
import { apchem } from './apchem';

// Auto-register all subjects
const allSubjects: APSubject[] = [
  apmacro,
  apmicro,
  apcsp,
  apbio,
  apchem,
];

// Create subject registry by subject code
export const subjectRegistry: Record<string, APSubject> = allSubjects.reduce((acc, subject) => {
  acc[subject.subjectCode] = subject;
  return acc;
}, {} as Record<string, APSubject>);

// Create subject registry by legacy ID (for backwards compatibility)
const legacyIdMap: Record<string, string> = {
  'macroeconomics': 'APMACRO',
  'microeconomics': 'APMICRO',
  'computer-science-principles': 'APCSP',
  'biology': 'APBIO',
  'chemistry': 'APCHEM',
};

export function getSubjectByLegacyId(legacyId: string): APSubject | undefined {
  const subjectCode = legacyIdMap[legacyId];
  return subjectCode ? subjectRegistry[subjectCode] : undefined;
}

export function getSubjectByCode(subjectCode: string): APSubject | undefined {
  return subjectRegistry[subjectCode];
}

export function getUnitsForSubject(subjectIdOrCode: string): Unit[] {
  // Try legacy ID first
  let subject = getSubjectByLegacyId(subjectIdOrCode);
  
  // If not found, try as subject code
  if (!subject) {
    subject = getSubjectByCode(subjectIdOrCode);
  }
  
  if (!subject) {
    // Fallback for unknown subjects
    return [
      {
        id: "unit1",
        title: "Core Concepts",
        description: "Fundamental concepts and principles",
        examWeight: "100%",
        progress: 0,
      },
    ];
  }
  
  return subject.units;
}

export function getSectionCodeForUnit(subjectIdOrCode: string, unitId: string): string | undefined {
  let subject = getSubjectByLegacyId(subjectIdOrCode) || getSubjectByCode(subjectIdOrCode);
  return subject?.sections[unitId]?.code;
}

export function getSectionInfo(subjectIdOrCode: string, sectionCode: string): { name: string; unitNumber: number } | undefined {
  let subject = getSubjectByLegacyId(subjectIdOrCode) || getSubjectByCode(subjectIdOrCode);
  if (!subject) return undefined;
  
  const section = Object.values(subject.sections).find(s => s.code === sectionCode);
  return section ? { name: section.name, unitNumber: section.unitNumber } : undefined;
}

// Export all subjects for course listing
export function getAllSubjects(): APSubject[] {
  return allSubjects;
}

// Helper to convert subject code to API code format
export function getApiCodeForSubject(subjectIdOrCode: string): string | undefined {
  let subject = getSubjectByLegacyId(subjectIdOrCode) || getSubjectByCode(subjectIdOrCode);
  return subject?.subjectCode;
}

// Helper to get legacy ID from subject code (for URLs)
export function getLegacyIdForSubjectCode(subjectCode: string): string | undefined {
  const entry = Object.entries(legacyIdMap).find(([_, code]) => code === subjectCode);
  return entry ? entry[0] : undefined;
}
