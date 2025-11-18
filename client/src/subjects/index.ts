
import { APSubject } from './common/interfaces';

// Auto-import all subjects
import macroeconomics from './macroeconomics';
import microeconomics from './microeconomics';
import computerSciencePrinciples from './computer-science-principles';
import calculus from './calculus';
import biology from './biology';

// Registry of all subjects
const subjectRegistry: APSubject[] = [
  macroeconomics,
  microeconomics,
  computerSciencePrinciples,
  calculus,
  biology,
];

// Create lookup maps
const subjectsByCode = new Map<string, APSubject>();
const subjectsByApiCode = new Map<string, APSubject>();

subjectRegistry.forEach(subject => {
  subjectsByCode.set(subject.subjectCode, subject);
  subjectsByApiCode.set(subject.metadata.apiCode, subject);
});

// Export functions to access subjects
export function getAllSubjects(): APSubject[] {
  return subjectRegistry;
}

export function getSubjectByCode(subjectCode: string): APSubject | undefined {
  return subjectsByCode.get(subjectCode);
}

export function getSubjectByApiCode(apiCode: string): APSubject | undefined {
  return subjectsByApiCode.get(apiCode);
}

export function getUnitsForSubject(subjectCode: string) {
  const subject = getSubjectByCode(subjectCode);
  return subject?.units || [];
}

export function getSectionForUnit(subjectCode: string, unitId: string): string | undefined {
  const subject = getSubjectByCode(subjectCode);
  return subject?.unitToSectionMap[unitId];
}

export function getApiCodeForSubject(subjectCode: string): string | undefined {
  const subject = getSubjectByCode(subjectCode);
  return subject?.metadata.apiCode;
}

export function getSectionByCode(subjectCode: string, sectionCode: string) {
  const subject = getSubjectByCode(subjectCode);
  return subject?.sections.find(s => s.code === sectionCode);
}

// Export common interfaces
export type { APSubject, SubjectMetadata, SubjectSection, SubjectUnit } from './common/interfaces';
