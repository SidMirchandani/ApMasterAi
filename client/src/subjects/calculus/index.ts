
import { APSubject } from '../common/interfaces';
import { metadata } from './metadata';
import { units } from './units';
import { sections, unitToSectionMap } from './sections';

export const calculus: APSubject = {
  subjectCode: 'calculus-ab',
  displayName: 'AP Calculus AB/BC',
  metadata,
  units,
  sections,
  unitToSectionMap,
};

export default calculus;
