import { APSubject, Unit } from './common/types';

// Import all subject modules
import { apmacro } from './apmacro';
import { apmicro } from './apmicro';
import { apcsp } from './apcsp';
import { apchem } from './apchem';
import { apgov } from './apgov';
import { appsych } from './appsych';

// Import the subjects object which contains the unitToSectionMap
import * as subjects from './';

// Auto-register all subjects
const allSubjects: APSubject[] = [
  apmacro,
  apmicro,
  apcsp,
  apchem,
  apgov,
  appsych,
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
  'chemistry': 'APCHEM',
  'government': 'APGOV',
  'psychology': 'APPSYCH',
};

// Create a reverse map from legacy ID to Subject object for quicker lookups
const legacyIdRegistry: Record<string, APSubject> = Object.entries(legacyIdMap).reduce((acc, [legacyId, subjectCode]) => {
  if (subjectRegistry[subjectCode]) {
    acc[legacyId] = subjectRegistry[subjectCode];
  }
  return acc;
}, {} as Record<string, APSubject>);


export function getSubjectByLegacyId(legacyId: string): APSubject | undefined {
  return legacyIdRegistry[legacyId];
}

export function getSubjectByCode(code: string): APSubject | undefined {
  const bySubjectCode = subjectRegistry[code];
  const byLegacyId = legacyIdRegistry[code];

  console.log('🔎 [getSubjectByCode] Lookup:', {
    input: code,
    foundBySubjectCode: !!bySubjectCode,
    foundByLegacyId: !!byLegacyId,
    result: !!(bySubjectCode || byLegacyId)
  });

  return bySubjectCode || byLegacyId;
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

export function getSectionCodeForUnit(subjectId: string, unitId: string): string | undefined {
  console.log('🔍 [subjects/index] getSectionCodeForUnit called:', { 
    subjectId, 
    unitId,
    inputTypes: {
      subjectId: typeof subjectId,
      unitId: typeof unitId
    }
  });

  const subject = getSubjectByLegacyId(subjectId);
  if (!subject) {
    console.error('❌ [subjects/index] Subject not found for legacy ID:', {
      subjectId,
      availableLegacyIds: Object.keys(legacyIdMap)
    });
    return undefined;
  }

  console.log('📋 [subjects/index] Subject found:', {
    subjectId,
    subjectCode: subject.subjectCode,
    displayName: subject.displayName
  });

  // Look up section directly from sections object
  const section = subject.sections[unitId];
  const sectionCode = section?.code;
  
  console.log('🔍 [subjects/index] Section code lookup result:', { 
    unitId, 
    sectionCode,
    found: !!sectionCode
  });

  return sectionCode;
}

// Centralized section lookup functions
export function getSectionByCode(subjectIdOrCode: string, sectionCode: string): { code: string; name: string; unitNumber: number } | undefined {
  console.log('🔍 [getSectionByCode] Looking up section:', {
    subjectIdOrCode,
    sectionCode
  });

  let subject = getSubjectByLegacyId(subjectIdOrCode) || getSubjectByCode(subjectIdOrCode);
  
  console.log('📚 [getSectionByCode] Subject lookup result:', {
    found: !!subject,
    subjectCode: subject?.subjectCode,
    displayName: subject?.displayName,
    hasSection: subject?.sections ? Object.keys(subject.sections) : []
  });

  if (!subject) {
    console.warn('⚠️ [getSectionByCode] Subject not found:', subjectIdOrCode);
    return undefined;
  }

  // Check both by section code key and by code field
  const section = subject.sections[sectionCode] || Object.values(subject.sections).find(s => s.code === sectionCode);
  
  console.log('🎯 [getSectionByCode] Section lookup result:', {
    sectionCode,
    found: !!section,
    section
  });

  return section;
}

export function getUnitNumberForSection(subjectIdOrCode: string, sectionCode: string): number | undefined {
  const section = getSectionByCode(subjectIdOrCode, sectionCode);
  return section?.unitNumber;
}

export function getSectionInfo(subjectIdOrCode: string, sectionCode: string): { name: string; unitNumber: number } | undefined {
  console.log('📖 [getSectionInfo] Called with:', {
    subjectIdOrCode,
    sectionCode
  });

  const section = getSectionByCode(subjectIdOrCode, sectionCode);
  const result = section ? { name: section.name, unitNumber: section.unitNumber } : undefined;

  console.log('📖 [getSectionInfo] Returning:', result);

  return result;
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