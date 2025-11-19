// Server-side subject metadata helper
// This mirrors the client-side subject registry but works in API routes

interface UnitInfo {
  id: string;
  title: string;
  description: string;
  examWeight: string;
}

interface SubjectMeta {
  subjectCode: string;
  displayName: string;
  units: UnitInfo[];
  sections?: Array<{ code: string; title: string; description: string }>;
}

const SUBJECT_REGISTRY: Record<string, SubjectMeta> = {
  'APMACRO': {
    subjectCode: 'APMACRO',
    displayName: 'AP Macroeconomics',
    units: [
      { id: 'BEC', title: 'Basic Economic Concepts', description: 'Scarcity, opportunity cost, production possibilities', examWeight: '5-10%' },
      { id: 'EI', title: 'Economic Indicators and the Business Cycle', description: 'GDP, unemployment, inflation', examWeight: '12-17%' },
      { id: 'NI', title: 'National Income and Price Determination', description: 'Aggregate demand and supply', examWeight: '17-27%' },
      { id: 'FS', title: 'Financial Sector', description: 'Money, banking, and monetary policy', examWeight: '18-23%' },
      { id: 'LR', title: 'Long-Run Consequences of Stabilization Policies', description: 'Fiscal policy and government spending', examWeight: '20-30%' },
      { id: 'OT', title: 'Open Economy - International Trade and Finance', description: 'Balance of payments, exchange rates', examWeight: '10-13%' }
    ]
  },
  'APMICRO': {
    subjectCode: 'APMICRO',
    displayName: 'AP Microeconomics',
    units: [
      { id: 'BEC', title: 'Basic Economic Concepts', description: 'Scarcity, opportunity cost, production possibilities, and comparative advantage', examWeight: '12-15%' },
      { id: 'SD', title: 'Supply and Demand', description: 'Market equilibrium, consumer and producer surplus, and price controls', examWeight: '20-25%' },
      { id: 'PC', title: 'Production, Cost, and the Perfect Competition Model', description: 'Production functions, cost curves, and profit maximization', examWeight: '22-25%' },
      { id: 'IMP', title: 'Imperfect Competition', description: 'Monopoly, oligopoly, monopolistic competition, and game theory', examWeight: '15-22%' },
      { id: 'FM', title: 'Factor Markets', description: 'Labor markets, capital markets, and income distribution', examWeight: '10-18%' },
      { id: 'MF', title: 'Market Failure and the Role of Government', description: 'Externalities, public goods, and income inequality', examWeight: '8-13%' }
    ]
  },
  'APCSP': {
    subjectCode: 'APCSP',
    displayName: 'AP Computer Science Principles',
    units: [
      { id: 'CRD', title: 'Creative Development', description: 'Collaboration, program design, and development', examWeight: '10-13%' },
      { id: 'DAT', title: 'Data', description: 'Binary numbers, data compression, and extraction', examWeight: '17-22%' },
      { id: 'AAP', title: 'Algorithms and Programming', description: 'Variables, algorithms, and programming techniques', examWeight: '30-35%' },
      { id: 'CSN', title: 'Computer Systems and Networks', description: 'Internet, routing, and network protocols', examWeight: '11-15%' },
      { id: 'IOC', title: 'Impact of Computing', description: 'Ethics, privacy, security, and societal impacts', examWeight: '21-26%' }
    ]
  },
  'APCHEM': {
    subjectCode: 'APCHEM',
    displayName: 'AP Chemistry',
    units: [
      { id: 'AMS', title: 'Atomic Structure and Properties', description: 'Moles, mass spectrometry, electron configuration', examWeight: '7-9%' },
      { id: 'MIP', title: 'Molecular and Ionic Compound Structure and Properties', description: 'Lewis structures, VSEPR, bonding', examWeight: '7-9%' },
      { id: 'IMF', title: 'Intermolecular Forces and Properties', description: 'Phase changes, solutions, mixtures', examWeight: '18-22%' },
      { id: 'CR', title: 'Chemical Reactions', description: 'Reaction types, stoichiometry', examWeight: '7-9%' },
      { id: 'KIN', title: 'Kinetics', description: 'Rate laws, reaction mechanisms', examWeight: '7-9%' },
      { id: 'THE', title: 'Thermodynamics', description: 'Energy, enthalpy, entropy, free energy', examWeight: '7-9%' },
      { id: 'EQ', title: 'Equilibrium', description: 'Le Chatelier, equilibrium constants', examWeight: '7-9%' },
      { id: 'AB', title: 'Acids and Bases', description: 'pH, titrations, buffers', examWeight: '11-15%' },
      { id: 'ATD', title: 'Applications of Thermodynamics', description: 'Electrochemistry, Gibbs free energy', examWeight: '7-9%' }
    ]
  },
  'APGOV': {
    subjectCode: 'APGOV',
    displayName: 'AP U.S. Government and Politics',
    units: [
      { id: 'FOP', title: 'Foundations of American Democracy', description: 'Constitutional principles and federalism', examWeight: '15-22%' },
      { id: 'ILR', title: 'Interactions Among Branches of Government', description: 'Separation of powers and checks and balances', examWeight: '25-36%' },
      { id: 'CLR', title: 'Civil Liberties and Civil Rights', description: 'Bill of Rights and Equal Protection Clause', examWeight: '13-18%' },
      { id: 'APB', title: 'American Political Ideologies and Beliefs', description: 'Political socialization and ideology', examWeight: '10-15%' },
      { id: 'PPP', title: 'Political Participation', description: 'Voting, campaigns, and elections', examWeight: '20-27%' }
    ]
  },
  'APPSYCH': {
    subjectCode: 'APPSYCH',
    displayName: 'AP Psychology',
    units: [
      { id: 'BIO', title: 'Biological Bases of Behavior', description: 'Brain anatomy, neurotransmitters, nervous system, and genetics', examWeight: '15-25%' },
      { id: 'COG', title: 'Cognition', description: 'Memory, thinking, problem-solving, and language', examWeight: '15-25%' },
      { id: 'DEV', title: 'Development and Learning', description: 'Lifespan development, learning theories, and cognitive development', examWeight: '15-25%' },
      { id: 'SOC', title: 'Social Psychology and Personality', description: 'Social influence, attitudes, personality theories, and assessment', examWeight: '15-25%' },
      { id: 'MPH', title: 'Mental and Physical Health', description: 'Psychological disorders, treatment approaches, and health psychology', examWeight: '15-25%' }
    ]
  },
  'APBIO': {
    subjectCode: 'APBIO',
    displayName: 'AP Biology',
    units: [
      { id: 'CHE', title: 'Chemistry of Life', description: 'Water, carbon compounds, and macromolecules', examWeight: '8-11%' },
      { id: 'CEL', title: 'Cell Structure and Function', description: 'Cell theory, organelles, and membranes', examWeight: '10-13%' },
      { id: 'CEN', title: 'Cellular Energetics', description: 'Photosynthesis and cellular respiration', examWeight: '12-16%' },
      { id: 'CCD', title: 'Cell Communication and Cell Cycle', description: 'Signal transduction and mitosis', examWeight: '10-15%' },
      { id: 'HER', title: 'Heredity', description: 'Meiosis, Mendelian genetics, and DNA', examWeight: '8-11%' },
      { id: 'GEX', title: 'Gene Expression and Regulation', description: 'Transcription, translation, and gene regulation', examWeight: '12-16%' },
      { id: 'NES', title: 'Natural Selection', description: 'Evolution, population genetics, and speciation', examWeight: '13-20%' },
      { id: 'ECO', title: 'Ecology', description: 'Energy flow, biodiversity, and ecosystems', examWeight: '10-15%' }
    ]
  },
  'APCALCAB': {
    subjectCode: 'APCALCAB',
    displayName: 'AP Calculus AB',
    units: [
      { id: 'LIM', title: 'Limits and Continuity', description: 'Finding limits, continuity, and asymptotic behavior', examWeight: '10-12%' },
      { id: 'DER', title: 'Differentiation: Definition and Fundamental Properties', description: 'Derivative definition and basic rules', examWeight: '10-12%' },
      { id: 'CDA', title: 'Differentiation: Composite, Implicit, and Inverse Functions', description: 'Chain rule, implicit differentiation', examWeight: '9-13%' },
      { id: 'CCD', title: 'Contextual Applications of Differentiation', description: 'Related rates and optimization', examWeight: '10-15%' },
      { id: 'ADA', title: 'Analytical Applications of Differentiation', description: 'Mean value theorem and curve analysis', examWeight: '15-18%' },
      { id: 'INT', title: 'Integration and Accumulation of Change', description: 'Definite integrals and Riemann sums', examWeight: '17-20%' },
      { id: 'DIS', title: 'Differential Equations', description: 'Slope fields and separable equations', examWeight: '6-12%' },
      { id: 'AIN', title: 'Applications of Integration', description: 'Area, volume, and motion problems', examWeight: '10-15%' }
    ]
  }
};

const LEGACY_ID_MAP: Record<string, string> = {
  'macroeconomics': 'APMACRO',
  'microeconomics': 'APMICRO',
  'computer-science-principles': 'APCSP',
  'chemistry': 'APCHEM',
  'government': 'APGOV',
  'psychology': 'APPSYCH',
  'biology': 'APBIO',
  'calculus-ab': 'APCALCAB'
};

export function getApiCodeForSubject(subjectId: string): string | null {
  const upperSubjectId = subjectId.toUpperCase();
  if (SUBJECT_REGISTRY[upperSubjectId]) {
    return upperSubjectId;
  }
  return LEGACY_ID_MAP[subjectId.toLowerCase()] || null;
}

export function getSectionByCode(subjectCode: string, sectionCode: string): { title: string; description: string } | null {
  const subject = SUBJECT_REGISTRY[subjectCode.toUpperCase()];

  if (!subject) {
    return null;
  }

  const unit = subject.units.find(u => u.id === sectionCode);

  if (unit) {
    return { title: unit.title, description: unit.description };
  }

  const section = subject.sections?.find(s => s.code === sectionCode);

  if (section) {
    return { title: section.title, description: section.description };
  }

  return null;
}