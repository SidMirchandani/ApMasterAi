
import { APSubject } from '../common/interfaces';
import { metadata } from './metadata';
import { units } from './units';
import { sections, unitToSectionMap } from './sections';

export const macroeconomics: APSubject = {
  subjectCode: 'macroeconomics',
  displayName: 'AP Macroeconomics',
  metadata,
  units,
  sections,
  unitToSectionMap,
};

export default macroeconomics;
