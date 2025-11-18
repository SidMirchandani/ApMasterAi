
import { APSubject } from '../common/interfaces';
import { metadata } from './metadata';
import { units } from './units';
import { sections, unitToSectionMap } from './sections';

export const biology: APSubject = {
  subjectCode: 'biology',
  displayName: 'AP Biology',
  metadata,
  units,
  sections,
  unitToSectionMap,
};

export default biology;
