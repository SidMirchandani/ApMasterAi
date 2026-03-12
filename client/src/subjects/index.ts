import { APSubject, Unit } from './common/types';

import { apmacro } from './apmacro';
import { apmicro } from './apmicro';
import { apcsp } from './apcsp';
import { apchem } from './apchem';
import { apgov } from './apgov';
import { appsych } from './appsych';
import { apbio } from './apbio';
import { apcalcab } from './apcalcab';
import { apcalcbc } from './apcalcbc';
import { apcsa } from './apcsa';
import { apush } from './apush';
import { apwh } from './apwh';
import { apeuro } from './apeuro';
import { aplang } from './aplang';
import { aplit } from './aplit';
import { apstats } from './apstats';
import { apphys1 } from './apphys1';
import { apphys2 } from './apphys2';
import { apes } from './apes';
import { aphug } from './aphug';

const allSubjects: APSubject[] = [
  apmacro,
  apmicro,
  apcsp,
  apchem,
  apgov,
  appsych,
  apbio,
  apcalcab,
  apcalcbc,
  apcsa,
  apush,
  apwh,
  apeuro,
  aplang,
  aplit,
  apstats,
  apphys1,
  apphys2,
  apes,
  aphug,
];

export const subjectRegistry: Record<string, APSubject> = allSubjects.reduce((acc, subject) => {
  acc[subject.subjectCode] = subject;
  return acc;
}, {} as Record<string, APSubject>);

const legacyIdMap: Record<string, string> = {
  'macroeconomics': 'APMACRO',
  'microeconomics': 'APMICRO',
  'computer-science-principles': 'APCSP',
  'chemistry': 'APCHEM',
  'government': 'APGOV',
  'psychology': 'APPSYCH',
  'biology': 'APBIO',
  'calculus-ab': 'APCALCAB',
  'calculus-bc': 'APCALCBC',
  'computer-science-a': 'APCSA',
  'us-history': 'APUSH',
  'world-history': 'APWH',
  'european-history': 'APEURO',
  'english-language': 'APLANG',
  'english-literature': 'APLIT',
  'statistics': 'APSTATS',
  'physics-1': 'APPHYS1',
  'physics-2': 'APPHYS2',
  'environmental-science': 'APES',
  'human-geography': 'APHUG',
};

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
  return subjectRegistry[code] || legacyIdRegistry[code];
}

export function getUnitsForSubject(subjectIdOrCode: string): Unit[] {
  let subject = getSubjectByLegacyId(subjectIdOrCode);
  if (!subject) {
    subject = getSubjectByCode(subjectIdOrCode);
  }

  if (!subject) {
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
  const subject = getSubjectByLegacyId(subjectId) || getSubjectByCode(subjectId);
  if (!subject) return undefined;
  const section = subject.sections[unitId];
  return section?.code;
}

/** Get unit id (e.g. "unit1") for a section code (e.g. "BEC") so wrong answers can be tracked per unit. */
export function getUnitIdForSectionCode(subjectIdOrCode: string, sectionCode: string): string | undefined {
  const subject = getSubjectByLegacyId(subjectIdOrCode) || getSubjectByCode(subjectIdOrCode);
  if (!subject) return undefined;
  const entry = Object.entries(subject.sections).find(([, s]) => s.code === sectionCode);
  return entry ? entry[0] : undefined;
}

/** Get display label like "Unit 1", "Unit 2" for a unit id. */
export function getUnitDisplayLabel(subjectIdOrCode: string, unitId: string): string {
  const units = getUnitsForSubject(subjectIdOrCode);
  const idx = units.findIndex((u) => u.id === unitId);
  return idx >= 0 ? `Unit ${idx + 1}` : unitId;
}

export function getSectionByCode(subjectIdOrCode: string, sectionCode: string): { code: string; name: string; unitNumber: number } | undefined {
  let subject = getSubjectByLegacyId(subjectIdOrCode) || getSubjectByCode(subjectIdOrCode);
  if (!subject) return undefined;
  return subject.sections[sectionCode] || Object.values(subject.sections).find(s => s.code === sectionCode);
}

export function getUnitNumberForSection(subjectIdOrCode: string, sectionCode: string): number | undefined {
  const section = getSectionByCode(subjectIdOrCode, sectionCode);
  return section?.unitNumber;
}

export function getSectionInfo(subjectIdOrCode: string, sectionCode: string): { name: string; unitNumber: number } | undefined {
  const section = getSectionByCode(subjectIdOrCode, sectionCode);
  return section ? { name: section.name, unitNumber: section.unitNumber } : undefined;
}

/** Parse exam weight string like "15–25%" or "5-10%" to midpoint percentage (e.g. 20). */
function parseExamWeightToNumber(examWeight: string): number {
  const match = examWeight.match(/(\d+)\s*[–\-]\s*(\d+)/);
  if (match) return (parseInt(match[1], 10) + parseInt(match[2], 10)) / 2;
  const single = examWeight.match(/(\d+)\s*%?/);
  return single ? parseInt(single[1], 10) : 0;
}

/**
 * Returns sectionCode → weight (0–100, normalized to sum to 100) for the subject.
 * Used for weighted subject score in student progress (each unit contributes best_score * unit_weight).
 */
export function getUnitWeightsBySectionCode(subjectIdOrCode: string): Record<string, number> {
  const subject = getSubjectByLegacyId(subjectIdOrCode) || getSubjectByCode(subjectIdOrCode);
  if (!subject) return {};
  const weights: Record<string, number> = {};
  let sum = 0;
  for (const unit of subject.units) {
    const section = subject.sections[unit.id];
    const sectionCode = section?.code ?? unit.id;
    const w = parseExamWeightToNumber(unit.examWeight);
    weights[sectionCode] = w;
    sum += w;
  }
  if (sum <= 0) return weights;
  const out: Record<string, number> = {};
  for (const [code, w] of Object.entries(weights)) out[code] = (w / sum) * 100;
  return out;
}

export function getAllSubjects(): APSubject[] {
  return allSubjects;
}

export function getApiCodeForSubject(subjectIdOrCode: string): string | undefined {
  let subject = getSubjectByLegacyId(subjectIdOrCode) || getSubjectByCode(subjectIdOrCode);
  return subject?.subjectCode;
}

export function getLegacyIdForSubjectCode(subjectCode: string): string | undefined {
  const entry = Object.entries(legacyIdMap).find(([_, code]) => code === subjectCode);
  return entry ? entry[0] : undefined;
}
