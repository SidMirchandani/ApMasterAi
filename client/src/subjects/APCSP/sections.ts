
import { SubjectSection } from '../common/interfaces';

export const sections: SubjectSection[] = [
  { code: 'CRD', name: 'Creative Development', weight: '10-13%', unitNumber: 1 },
  { code: 'DAT', name: 'Data', weight: '17-22%', unitNumber: 2 },
  { code: 'AAP', name: 'Algorithms and Programming', weight: '30-35%', unitNumber: 3 },
  { code: 'CSN', name: 'Computer Systems and Networks', weight: '11-15%', unitNumber: 4 },
  { code: 'IOC', name: 'Impact of Computing', weight: '21-26%', unitNumber: 5 },
];

export const unitToSectionMap: Record<string, string> = {
  unit1: 'CRD',
  unit2: 'DAT',
  unit3: 'AAP',
  unit4: 'CSN',
  unit5: 'IOC',
  bigidea1: 'CRD',
  bigidea2: 'DAT',
  bigidea3: 'AAP',
  bigidea4: 'CSN',
  bigidea5: 'IOC',
};
