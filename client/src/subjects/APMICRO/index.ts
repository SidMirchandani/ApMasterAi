
import { APSubject } from '../common/interfaces';
import { metadata } from './metadata';
import { units } from './units';
import { sections, unitToSectionMap } from './sections';

export const microeconomics: APSubject = {
  subjectCode: 'microeconomics',
  displayName: 'AP Microeconomics',
  metadata,
  units,
  sections,
  unitToSectionMap,
};

export default microeconomics;
