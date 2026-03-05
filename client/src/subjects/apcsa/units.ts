import { Unit } from '../common/types';

/** AP CSA 2026: 4 units with official exam weight ranges */
export const csaUnits: Unit[] = [
  {
    id: "U1",
    title: "Using Objects and Methods",
    description: "Primitive types, Math class, String methods, wrapper classes, and object references",
    examWeight: "15–25%",
    progress: 0,
  },
  {
    id: "U2",
    title: "Selection and Iteration",
    description: "Conditionals, loops, boolean expressions, relational and logical operators, De Morgan's Laws",
    examWeight: "25–35%",
    progress: 0,
  },
  {
    id: "U3",
    title: "Class Creation",
    description: "Classes, constructors, encapsulation, inheritance, polymorphism, and method overriding",
    examWeight: "10–18%",
    progress: 0,
  },
  {
    id: "U4",
    title: "Data Collections",
    description: "Arrays, ArrayList, 2D arrays, recursion, and searching/sorting algorithms",
    examWeight: "30–40%",
    progress: 0,
  },
];
