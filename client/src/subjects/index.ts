
import { Unit } from './common/types';
import { macroeconomicsUnits } from './macroeconomics/units';
import { microeconomicsUnits } from './microeconomics/units';
import { computerSciencePrinciplesUnits } from './computer-science-principles/units';
import { calculusUnits } from './calculus/units';
import { biologyUnits } from './biology/units';

export function getUnitsForSubject(subjectId: string): Unit[] {
  switch (subjectId) {
    case "macroeconomics":
      return macroeconomicsUnits;
    case "microeconomics":
      return microeconomicsUnits;
    case "computer-science-principles":
      return computerSciencePrinciplesUnits;
    case "calculus-ab":
    case "calculus-bc":
      return calculusUnits;
    case "biology":
      return biologyUnits;
    default:
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
}
