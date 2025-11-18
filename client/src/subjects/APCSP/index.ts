
import { APSubject } from '../common/interfaces';
import { metadata } from './metadata';
import { units } from './units';
import { sections, unitToSectionMap } from './sections';

export const computerSciencePrinciples: APSubject = {
  subjectCode: 'computer-science-principles',
  displayName: 'AP Computer Science Principles',
  metadata,
  units,
  sections,
  unitToSectionMap,
};

export default computerSciencePrinciples;
