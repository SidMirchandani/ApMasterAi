interface UnitInfo {
  id: string;
  title: string;
  description: string;
  examWeight: string;
}

interface SubjectMeta {
  subjectCode: string;
  displayName: string;
  crackApPath: string;
  units: UnitInfo[];
  sections?: Array<{ code: string; title: string; description: string }>;
  sectionKeywords: Record<string, string[]>;
}

const SUBJECT_REGISTRY: Record<string, SubjectMeta> = {
  'APMACRO': {
    subjectCode: 'APMACRO',
    displayName: 'AP Macroeconomics',
    crackApPath: 'macroeconomics',
    units: [
      { id: 'BEC', title: 'Basic Economic Concepts', description: 'Scarcity, opportunity cost, production possibilities', examWeight: '5-10%' },
      { id: 'EI', title: 'Economic Indicators and the Business Cycle', description: 'GDP, unemployment, inflation', examWeight: '12-17%' },
      { id: 'NI', title: 'National Income and Price Determination', description: 'Aggregate demand and supply', examWeight: '17-27%' },
      { id: 'FS', title: 'Financial Sector', description: 'Money, banking, and monetary policy', examWeight: '18-23%' },
      { id: 'LR', title: 'Long-Run Consequences of Stabilization Policies', description: 'Fiscal policy and government spending', examWeight: '20-30%' },
      { id: 'OT', title: 'Open Economy - International Trade and Finance', description: 'Balance of payments, exchange rates', examWeight: '10-13%' }
    ],
    sectionKeywords: {
      BEC: ["scarcity", "opportunity cost", "production possibilities", "comparative advantage", "absolute advantage", "specialization", "economic systems"],
      EI: ["circular flow", "gdp", "unemployment", "inflation", "cpi", "business cycle", "recession", "expansion", "economic indicators"],
      NI: ["aggregate demand", "aggregate supply", "multiplier", "fiscal policy", "government spending", "taxes", "ad-as model", "national income"],
      FS: ["money", "banking", "federal reserve", "monetary policy", "interest rates", "money supply", "loanable funds", "financial sector"],
      LR: ["phillips curve", "lras", "natural rate of unemployment", "long-run growth", "productivity", "stabilization"],
      OT: ["balance of payments", "exchange rates", "trade", "exports", "imports", "current account", "capital account", "open economy"],
    },
  },
  'APMICRO': {
    subjectCode: 'APMICRO',
    displayName: 'AP Microeconomics',
    crackApPath: 'microeconomics',
    units: [
      { id: 'BEC', title: 'Basic Economic Concepts', description: 'Scarcity, opportunity cost, production possibilities, and comparative advantage', examWeight: '12-15%' },
      { id: 'SD', title: 'Supply and Demand', description: 'Market equilibrium, consumer and producer surplus, and price controls', examWeight: '20-25%' },
      { id: 'PC', title: 'Production, Cost, and the Perfect Competition Model', description: 'Production functions, cost curves, and profit maximization', examWeight: '22-25%' },
      { id: 'IMP', title: 'Imperfect Competition', description: 'Monopoly, oligopoly, monopolistic competition, and game theory', examWeight: '15-22%' },
      { id: 'FM', title: 'Factor Markets', description: 'Labor markets, capital markets, and income distribution', examWeight: '10-18%' },
      { id: 'MF', title: 'Market Failure and the Role of Government', description: 'Externalities, public goods, and income inequality', examWeight: '8-13%' }
    ],
    sectionKeywords: {
      BEC: ["scarcity", "opportunity cost", "production possibilities", "comparative advantage", "trade-off", "economic systems"],
      SD: ["supply", "demand", "equilibrium", "surplus", "shortage", "price controls", "elasticity", "consumer surplus", "producer surplus"],
      PC: ["production", "cost", "perfect competition", "marginal cost", "average cost", "profit maximization", "diminishing returns"],
      IMP: ["monopoly", "oligopoly", "monopolistic competition", "game theory", "price discrimination", "barriers to entry", "market power"],
      FM: ["labor market", "wage", "marginal revenue product", "capital", "factor market", "derived demand"],
      MF: ["externality", "public goods", "market failure", "government intervention", "tax", "subsidy", "deadweight loss", "income inequality"],
    },
  },
  'APCSP': {
    subjectCode: 'APCSP',
    displayName: 'AP Computer Science Principles',
    crackApPath: 'computer-science-principles',
    units: [
      { id: 'CRD', title: 'Creative Development', description: 'Collaboration, program design, and development', examWeight: '10-13%' },
      { id: 'DAT', title: 'Data', description: 'Binary numbers, data compression, and extraction', examWeight: '17-22%' },
      { id: 'AAP', title: 'Algorithms and Programming', description: 'Variables, algorithms, and programming techniques', examWeight: '30-35%' },
      { id: 'CSN', title: 'Computer Systems and Networks', description: 'Internet, routing, and network protocols', examWeight: '11-15%' },
      { id: 'IOC', title: 'Impact of Computing', description: 'Ethics, privacy, security, and societal impacts', examWeight: '21-26%' }
    ],
    sectionKeywords: {
      CRD: ["collaboration", "program design", "development", "iterative", "incremental", "comments", "documentation", "creative"],
      DAT: ["data", "binary", "compression", "extraction", "metadata", "cleaning", "visualization", "digitization"],
      AAP: ["variables", "assignment", "expressions", "strings", "lists", "procedures", "algorithms", "iteration", "selection", "loop", "function", "parameter"],
      CSN: ["internet", "router", "bandwidth", "protocol", "ip address", "dns", "http", "cybersecurity", "encryption", "network"],
      IOC: ["beneficial effects", "harmful effects", "digital divide", "bias", "crowdsourcing", "legal", "ethical", "privacy", "computing innovation"],
    },
  },
  'APCHEM': {
    subjectCode: 'APCHEM',
    displayName: 'AP Chemistry',
    crackApPath: 'chemistry',
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
    ],
    sectionKeywords: {
      AMS: ["atom", "mole", "mass spectrometry", "electron configuration", "periodic trends", "ionization energy", "atomic structure"],
      MIP: ["ionic bonding", "covalent bonding", "lewis structure", "vsepr", "hybridization", "molecular geometry"],
      IMF: ["london dispersion", "dipole", "hydrogen bonding", "phase changes", "solutions", "colligative properties", "intermolecular"],
      CR: ["stoichiometry", "limiting reagent", "oxidation", "reduction", "precipitation", "chemical reaction"],
      KIN: ["reaction rate", "rate law", "activation energy", "catalysis", "mechanisms", "collision theory", "kinetics"],
      THE: ["enthalpy", "entropy", "gibbs free energy", "calorimetry", "hess's law", "spontaneity", "thermodynamics"],
      EQ: ["equilibrium constant", "le chatelier", "reaction quotient", "ice table", "kp", "kc", "equilibrium"],
      AB: ["ph", "poh", "buffer", "titration", "weak acid", "strong base", "ka", "kb", "acid", "base"],
      ATD: ["electrochemistry", "galvanic cell", "electrolytic cell", "nernst equation", "cell potential", "faraday"],
    },
  },
  'APGOV': {
    subjectCode: 'APGOV',
    displayName: 'AP U.S. Government and Politics',
    crackApPath: 'us-government-and-politics',
    units: [
      { id: 'FOP', title: 'Foundations of American Democracy', description: 'Constitutional principles and federalism', examWeight: '15-22%' },
      { id: 'ILR', title: 'Interactions Among Branches of Government', description: 'Separation of powers and checks and balances', examWeight: '25-36%' },
      { id: 'CLR', title: 'Civil Liberties and Civil Rights', description: 'Bill of Rights and Equal Protection Clause', examWeight: '13-18%' },
      { id: 'APB', title: 'American Political Ideologies and Beliefs', description: 'Political socialization and ideology', examWeight: '10-15%' },
      { id: 'PPP', title: 'Political Participation', description: 'Voting, campaigns, and elections', examWeight: '20-27%' }
    ],
    sectionKeywords: {
      FOP: ["constitution", "federalism", "separation of powers", "checks and balances", "democracy", "republic", "limited government", "popular sovereignty", "social contract"],
      ILR: ["congress", "presidency", "bureaucracy", "federal courts", "supreme court", "judicial review", "executive orders", "legislation", "veto", "oversight"],
      CLR: ["civil liberties", "civil rights", "first amendment", "due process", "equal protection", "selective incorporation", "bill of rights", "fourteenth amendment", "discrimination"],
      APB: ["political ideology", "political socialization", "public opinion", "polling", "political culture", "liberal", "conservative", "libertarian"],
      PPP: ["voting", "elections", "political parties", "interest groups", "campaigns", "media", "linkage institutions", "voter turnout", "electoral college", "pacs"],
    },
  },
  'APPSYCH': {
    subjectCode: 'APPSYCH',
    displayName: 'AP Psychology',
    crackApPath: 'psychology',
    units: [
      { id: 'BIO', title: 'Biological Bases of Behavior', description: 'Brain anatomy, neurotransmitters, nervous system, and genetics', examWeight: '15-25%' },
      { id: 'COG', title: 'Cognition', description: 'Memory, thinking, problem-solving, and language', examWeight: '15-25%' },
      { id: 'DEV', title: 'Development and Learning', description: 'Lifespan development, learning theories, and cognitive development', examWeight: '15-25%' },
      { id: 'SOC', title: 'Social Psychology and Personality', description: 'Social influence, attitudes, personality theories, and assessment', examWeight: '15-25%' },
      { id: 'MPH', title: 'Mental and Physical Health', description: 'Psychological disorders, treatment approaches, and health psychology', examWeight: '15-25%' }
    ],
    sectionKeywords: {
      BIO: ["neuron", "axon", "synapse", "neurotransmitter", "action potential", "brain", "cortex", "hippocampus", "amygdala", "endocrine", "hormone", "nervous system", "genetics", "sleep", "sensation", "perception", "biological"],
      COG: ["memory", "encoding", "retrieval", "problem solving", "heuristic", "decision making", "attention", "intelligence", "iq", "thinking", "perception", "judgment", "cognition", "language"],
      DEV: ["conditioning", "classical", "operant", "reinforcement", "punishment", "development", "attachment", "piaget", "kohlberg", "erikson", "learning", "observational", "acquisition", "lifespan"],
      SOC: ["attribution", "conformity", "obedience", "attitude", "dissonance", "groupthink", "prejudice", "stereotype", "personality", "trait", "motivation", "emotion", "social psychology", "freud"],
      MPH: ["psychological disorder", "anxiety", "depression", "schizophrenia", "therapy", "treatment", "stress", "coping", "ptsd", "health", "positive psychology", "abnormal", "dsm", "mental health"],
    },
  },
  'APBIO': {
    subjectCode: 'APBIO',
    displayName: 'AP Biology',
    crackApPath: 'biology',
    units: [
      { id: 'CL', title: 'Chemistry of Life', description: 'Water, carbon compounds, and macromolecules', examWeight: '8-11%' },
      { id: 'CSF', title: 'Cell Structure and Function', description: 'Cell theory, organelles, and membranes', examWeight: '10-13%' },
      { id: 'CE', title: 'Cellular Energetics', description: 'Photosynthesis and cellular respiration', examWeight: '12-16%' },
      { id: 'CCC', title: 'Cell Communication and Cell Cycle', description: 'Signal transduction and mitosis', examWeight: '10-15%' },
      { id: 'HER', title: 'Heredity', description: 'Meiosis, Mendelian genetics, and DNA', examWeight: '8-11%' },
      { id: 'GER', title: 'Gene Expression and Regulation', description: 'Transcription, translation, and gene regulation', examWeight: '12-16%' },
      { id: 'NS', title: 'Natural Selection', description: 'Evolution, population genetics, and speciation', examWeight: '13-20%' },
      { id: 'ECO', title: 'Ecology', description: 'Energy flow, biodiversity, and ecosystems', examWeight: '10-15%' }
    ],
    sectionKeywords: {
      CL: ["water", "macromolecule", "carbohydrate", "lipid", "protein", "nucleic acid", "monomer", "polymer", "amino acid"],
      CSF: ["cell", "organelle", "membrane", "mitochondria", "chloroplast", "endoplasmic reticulum", "golgi", "nucleus", "ribosome", "prokaryote", "eukaryote"],
      CE: ["photosynthesis", "cellular respiration", "atp", "glycolysis", "krebs cycle", "electron transport", "fermentation", "calvin cycle"],
      CCC: ["cell signaling", "signal transduction", "mitosis", "cell cycle", "apoptosis", "growth factor", "receptor"],
      HER: ["meiosis", "mendel", "genetics", "allele", "genotype", "phenotype", "punnett square", "inheritance", "chromosome", "crossing over"],
      GER: ["transcription", "translation", "mrna", "dna", "rna", "gene expression", "mutation", "regulation", "operon", "epigenetics"],
      NS: ["evolution", "natural selection", "adaptation", "speciation", "hardy-weinberg", "genetic drift", "gene flow", "fitness", "darwin"],
      ECO: ["ecosystem", "food web", "energy flow", "trophic", "population", "community", "biodiversity", "biogeochemical", "succession"],
    },
  },
  'APCALCAB': {
    subjectCode: 'APCALCAB',
    displayName: 'AP Calculus AB',
    crackApPath: 'calculus-ab',
    units: [
      { id: 'LIM', title: 'Limits and Continuity', description: 'Finding limits, continuity, and asymptotic behavior', examWeight: '10-12%' },
      { id: 'DDF', title: 'Differentiation: Definition and Fundamental Properties', description: 'Derivative definition and basic rules', examWeight: '10-12%' },
      { id: 'DCI', title: 'Differentiation: Composite, Implicit, and Inverse Functions', description: 'Chain rule, implicit differentiation', examWeight: '9-13%' },
      { id: 'CAD', title: 'Contextual Applications of Differentiation', description: 'Related rates and optimization', examWeight: '10-15%' },
      { id: 'AAD', title: 'Analytical Applications of Differentiation', description: 'Mean value theorem and curve analysis', examWeight: '15-18%' },
      { id: 'IAC', title: 'Integration and Accumulation of Change', description: 'Definite integrals and Riemann sums', examWeight: '17-20%' },
      { id: 'DE', title: 'Differential Equations', description: 'Slope fields and separable equations', examWeight: '6-12%' },
      { id: 'AI', title: 'Applications of Integration', description: 'Area, volume, and motion problems', examWeight: '10-15%' }
    ],
    sectionKeywords: {
      LIM: ["limit", "continuity", "asymptote", "squeeze theorem", "intermediate value theorem", "one-sided limit"],
      DDF: ["derivative", "power rule", "product rule", "quotient rule", "tangent line", "differentiable"],
      DCI: ["chain rule", "implicit differentiation", "inverse function", "composite function"],
      CAD: ["related rates", "optimization", "linear approximation", "l'hopital"],
      AAD: ["mean value theorem", "extreme value", "critical point", "concavity", "inflection", "increasing", "decreasing"],
      IAC: ["integral", "riemann sum", "fundamental theorem", "antiderivative", "accumulation", "definite integral"],
      DE: ["differential equation", "slope field", "separation of variables", "initial condition"],
      AI: ["area between curves", "volume", "cross-section", "disk", "washer", "average value"],
    },
  },
  'APCALCBC': {
    subjectCode: 'APCALCBC',
    displayName: 'AP Calculus BC',
    crackApPath: 'calculus-bc',
    units: [
      { id: 'LIM', title: 'Limits and Continuity', description: 'Finding limits, continuity, and asymptotic behavior', examWeight: '4-7%' },
      { id: 'DDF', title: 'Differentiation: Definition and Properties', description: 'Derivative definition and basic rules', examWeight: '4-7%' },
      { id: 'DCI', title: 'Differentiation: Composite, Implicit, Inverse', description: 'Chain rule, implicit differentiation', examWeight: '4-7%' },
      { id: 'CAD', title: 'Contextual Applications of Differentiation', description: 'Related rates and optimization', examWeight: '6-9%' },
      { id: 'AAD', title: 'Analytical Applications of Differentiation', description: 'Mean value theorem and curve analysis', examWeight: '8-11%' },
      { id: 'IAC', title: 'Integration and Accumulation of Change', description: 'Definite integrals and techniques', examWeight: '17-20%' },
      { id: 'DE', title: 'Differential Equations', description: 'Slope fields, Euler method, logistic models', examWeight: '6-9%' },
      { id: 'AI', title: 'Applications of Integration', description: 'Area, volume, and arc length', examWeight: '6-9%' },
      { id: 'PPV', title: 'Parametric, Polar, and Vector-Valued Functions', description: 'Parametric equations and polar coordinates', examWeight: '11-12%' },
      { id: 'ISS', title: 'Infinite Sequences and Series', description: 'Convergence tests and Taylor series', examWeight: '17-18%' }
    ],
    sectionKeywords: {
      LIM: ["limit", "continuity", "asymptote", "squeeze theorem"],
      DDF: ["derivative", "power rule", "product rule", "quotient rule"],
      DCI: ["chain rule", "implicit differentiation", "inverse function"],
      CAD: ["related rates", "optimization", "linear approximation"],
      AAD: ["mean value theorem", "extreme value", "critical point", "concavity"],
      IAC: ["integral", "integration by parts", "partial fractions", "improper integral", "fundamental theorem"],
      DE: ["differential equation", "slope field", "euler method", "logistic", "separation of variables"],
      AI: ["area between curves", "volume", "arc length", "cross-section"],
      PPV: ["parametric", "polar", "vector-valued", "position vector", "velocity vector"],
      ISS: ["series", "sequence", "convergence", "taylor series", "maclaurin", "power series", "ratio test", "interval of convergence"],
    },
  },
  'APCSA': {
    subjectCode: 'APCSA',
    displayName: 'AP Computer Science A',
    crackApPath: 'computer-science-a',
    units: [
      { id: 'PT', title: 'Primitive Types', description: 'Variables, data types, and expressions', examWeight: '2.5-5%' },
      { id: 'UO', title: 'Using Objects', description: 'String class, wrapper classes, Math class', examWeight: '5-7.5%' },
      { id: 'BEI', title: 'Boolean Expressions and if Statements', description: 'Conditional logic and control flow', examWeight: '15-17.5%' },
      { id: 'ITR', title: 'Iteration', description: 'For loops, while loops, and nested loops', examWeight: '17.5-22.5%' },
      { id: 'WC', title: 'Writing Classes', description: 'Class design, constructors, and methods', examWeight: '5-7.5%' },
      { id: 'ARR', title: 'Array', description: 'Array creation, traversal, and algorithms', examWeight: '10-15%' },
      { id: 'AL', title: 'ArrayList', description: 'ArrayList methods and traversal', examWeight: '2.5-7.5%' },
      { id: 'TDA', title: '2D Array', description: 'Two-dimensional arrays and nested loops', examWeight: '7.5-10%' },
      { id: 'INH', title: 'Inheritance', description: 'Subclasses, polymorphism, and Object class', examWeight: '5-10%' },
      { id: 'REC', title: 'Recursion', description: 'Recursive methods and algorithms', examWeight: '5-7.5%' }
    ],
    sectionKeywords: {
      PT: ["int", "double", "boolean", "variable", "data type", "casting", "arithmetic", "operator"],
      UO: ["string", "object", "method", "constructor", "wrapper class", "math class", "null"],
      BEI: ["if", "else", "boolean", "condition", "comparison", "logical operator", "de morgan"],
      ITR: ["for loop", "while loop", "iteration", "nested loop", "loop", "sentinel"],
      WC: ["class", "constructor", "method", "instance variable", "accessor", "mutator", "this"],
      ARR: ["array", "index", "traversal", "element", "length", "sorting", "searching"],
      AL: ["arraylist", "add", "remove", "size", "get", "set", "wrapper"],
      TDA: ["2d array", "row", "column", "nested loop", "matrix", "two-dimensional"],
      INH: ["inheritance", "subclass", "superclass", "extends", "polymorphism", "override", "abstract"],
      REC: ["recursion", "recursive", "base case", "call stack", "fibonacci", "binary search"],
    },
  },
  'APUSH': {
    subjectCode: 'APUSH',
    displayName: 'AP U.S. History',
    crackApPath: 'us-history',
    units: [
      { id: 'P1', title: 'Period 1: 1491-1607', description: 'Pre-Columbian societies and early exploration', examWeight: '4-6%' },
      { id: 'P2', title: 'Period 2: 1607-1754', description: 'Colonial America and European colonization', examWeight: '6-8%' },
      { id: 'P3', title: 'Period 3: 1754-1800', description: 'American Revolution and early republic', examWeight: '10-17%' },
      { id: 'P4', title: 'Period 4: 1800-1848', description: 'Democracy, expansion, and reform movements', examWeight: '10-17%' },
      { id: 'P5', title: 'Period 5: 1844-1877', description: 'Civil War and Reconstruction', examWeight: '10-17%' },
      { id: 'P6', title: 'Period 6: 1865-1898', description: 'Industrialization and the Gilded Age', examWeight: '10-17%' },
      { id: 'P7', title: 'Period 7: 1890-1945', description: 'Progressive Era, World Wars, and the New Deal', examWeight: '10-17%' },
      { id: 'P8', title: 'Period 8: 1945-1980', description: 'Cold War, civil rights, and social change', examWeight: '10-17%' },
      { id: 'P9', title: 'Period 9: 1980-Present', description: 'Modern America and globalization', examWeight: '4-6%' }
    ],
    sectionKeywords: {
      P1: ["native american", "indigenous", "columbian exchange", "exploration", "pre-columbian", "1491"],
      P2: ["colonial", "jamestown", "plymouth", "puritans", "slavery", "tobacco", "colonial america", "mercantilism", "great awakening"],
      P3: ["revolution", "independence", "constitution", "declaration", "federalist", "articles of confederation", "bill of rights"],
      P4: ["jacksonian", "manifest destiny", "reform", "abolitionist", "monroe doctrine", "market revolution", "trail of tears"],
      P5: ["civil war", "reconstruction", "lincoln", "emancipation", "confederacy", "13th amendment", "14th amendment", "15th amendment"],
      P6: ["industrialization", "gilded age", "immigration", "urbanization", "labor", "robber baron", "populism"],
      P7: ["progressive", "world war", "new deal", "great depression", "roosevelt", "wilson", "imperialism", "suffrage"],
      P8: ["cold war", "civil rights", "vietnam", "korean war", "great society", "counterculture", "watergate"],
      P9: ["reagan", "globalization", "terrorism", "technology", "9/11", "conservative", "clinton", "obama"],
    },
  },
  'APWH': {
    subjectCode: 'APWH',
    displayName: 'AP World History: Modern',
    crackApPath: 'world-history',
    units: [
      { id: 'GT', title: 'The Global Tapestry (1200-1450)', description: 'Diverse states and civilizations across regions', examWeight: '8-10%' },
      { id: 'NE', title: 'Networks of Exchange (1200-1450)', description: 'Trade routes, cultural diffusion, and technology transfer', examWeight: '8-10%' },
      { id: 'LBE', title: 'Land-Based Empires (1450-1750)', description: 'Ottoman, Safavid, Mughal, and other empires', examWeight: '12-15%' },
      { id: 'TI', title: 'Transoceanic Interconnections (1450-1750)', description: 'European exploration and global trade networks', examWeight: '12-15%' },
      { id: 'REV', title: 'Revolutions (1750-1900)', description: 'Political and industrial revolutions', examWeight: '12-15%' },
      { id: 'COI', title: 'Consequences of Industrialization (1750-1900)', description: 'Economic, social, and environmental effects', examWeight: '12-15%' },
      { id: 'GC', title: 'Global Conflict (1900-Present)', description: 'World wars and ideological struggles', examWeight: '8-10%' },
      { id: 'CWD', title: 'Cold War and Decolonization (1900-Present)', description: 'Bipolar world order and independence movements', examWeight: '8-10%' },
      { id: 'GLO', title: 'Globalization (1900-Present)', description: 'Global integration and contemporary challenges', examWeight: '8-10%' }
    ],
    sectionKeywords: {
      GT: ["song dynasty", "mongol", "mali", "byzantine", "delhi sultanate", "aztec", "inca", "medieval"],
      NE: ["silk road", "indian ocean", "trans-saharan", "trade route", "diffusion", "marco polo", "ibn battuta"],
      LBE: ["ottoman", "safavid", "mughal", "qing", "tokugawa", "absolute monarchy", "empire"],
      TI: ["columbian exchange", "atlantic slave trade", "mercantilism", "exploration", "conquistador", "colonial"],
      REV: ["french revolution", "haitian revolution", "american revolution", "enlightenment", "nationalism", "industrial revolution"],
      COI: ["industrialization", "imperialism", "migration", "urbanization", "labor movement", "social darwinism"],
      GC: ["world war", "total war", "genocide", "league of nations", "united nations", "fascism", "communism"],
      CWD: ["cold war", "decolonization", "non-aligned", "proxy war", "independence", "apartheid"],
      GLO: ["globalization", "technology", "human rights", "environment", "terrorism", "economic integration"],
    },
  },
  'APEURO': {
    subjectCode: 'APEURO',
    displayName: 'AP European History',
    crackApPath: 'european-history',
    units: [
      { id: 'RE', title: 'Renaissance and Exploration', description: 'Renaissance culture and overseas exploration', examWeight: '10-15%' },
      { id: 'AR', title: 'Age of Reformation', description: 'Protestant and Catholic Reformations', examWeight: '10-15%' },
      { id: 'AC', title: 'Absolutism and Constitutionalism', description: 'State building and political authority', examWeight: '10-15%' },
      { id: 'SPP', title: 'Scientific, Philosophical, Political Developments', description: 'Scientific Revolution and Enlightenment', examWeight: '10-15%' },
      { id: 'CRR', title: 'Conflict, Revolution, and Reaction', description: 'French Revolution and Napoleonic era', examWeight: '10-15%' },
      { id: 'IND', title: 'Industrialization and Its Effects', description: 'Industrial Revolution and social change', examWeight: '10-15%' },
      { id: 'NPP', title: '19th Century Perspectives and Political Developments', description: 'Nationalism, liberalism, and conservatism', examWeight: '10-15%' },
      { id: 'GCF', title: '20th Century Global Conflicts', description: 'World Wars and totalitarianism', examWeight: '10-15%' },
      { id: 'CCE', title: 'Cold War and Contemporary Europe', description: 'Post-war Europe and European integration', examWeight: '10-15%' }
    ],
    sectionKeywords: {
      RE: ["renaissance", "humanism", "exploration", "columbus", "da vinci", "printing press", "reformation"],
      AR: ["luther", "calvin", "protestant", "catholic", "reformation", "counter-reformation", "council of trent"],
      AC: ["absolutism", "louis xiv", "parliament", "english civil war", "constitutionalism", "glorious revolution"],
      SPP: ["scientific revolution", "enlightenment", "newton", "locke", "voltaire", "rousseau", "galileo"],
      CRR: ["french revolution", "napoleon", "congress of vienna", "robespierre", "jacobin"],
      IND: ["industrial revolution", "factory", "urbanization", "marxism", "capitalism", "working class"],
      NPP: ["nationalism", "liberalism", "conservatism", "unification", "bismarck", "realpolitik"],
      GCF: ["world war", "fascism", "nazism", "holocaust", "totalitarianism", "versailles"],
      CCE: ["cold war", "european union", "iron curtain", "berlin wall", "decolonization", "eu"],
    },
  },
  'APLANG': {
    subjectCode: 'APLANG',
    displayName: 'AP English Language and Composition',
    crackApPath: 'english-language',
    units: [
      { id: 'CRE', title: 'Claims, Reasoning, and Evidence', description: 'Building and evaluating arguments', examWeight: '20-25%' },
      { id: 'SS', title: 'Synthesizing Sources', description: 'Integrating multiple sources into arguments', examWeight: '20-25%' },
      { id: 'RS', title: 'Rhetorical Situation', description: 'Purpose, audience, context, and rhetorical strategies', examWeight: '20-25%' },
      { id: 'OC', title: 'Organization and Commentary', description: 'Essay structure and analytical commentary', examWeight: '15-20%' },
      { id: 'ARG', title: 'Argumentation', description: 'Constructing persuasive arguments', examWeight: '15-20%' }
    ],
    sectionKeywords: {
      CRE: ["claim", "evidence", "reasoning", "warrant", "qualifier", "counterargument", "thesis"],
      SS: ["synthesis", "source", "integrate", "multiple perspectives", "citation", "paraphrase"],
      RS: ["rhetoric", "audience", "purpose", "context", "ethos", "pathos", "logos", "tone", "diction"],
      OC: ["organization", "commentary", "transition", "topic sentence", "paragraph", "structure"],
      ARG: ["argument", "persuasion", "concession", "rebuttal", "logical fallacy", "appeal"],
    },
  },
  'APLIT': {
    subjectCode: 'APLIT',
    displayName: 'AP English Literature and Composition',
    crackApPath: 'english-literature',
    units: [
      { id: 'SF1', title: 'Short Fiction I', description: 'Character, setting, and narrative perspective', examWeight: '10-13%' },
      { id: 'PO1', title: 'Poetry I', description: 'Structure, figurative language, and imagery', examWeight: '10-13%' },
      { id: 'LF1', title: 'Longer Fiction or Drama I', description: 'Plot, character development, and conflict', examWeight: '10-13%' },
      { id: 'SF2', title: 'Short Fiction II', description: 'Comparisons, contexts, and interpretations', examWeight: '10-13%' },
      { id: 'PO2', title: 'Poetry II', description: 'Comparison and contrast in poetry', examWeight: '10-13%' },
      { id: 'LF2', title: 'Longer Fiction or Drama II', description: 'Thematic complexity and literary techniques', examWeight: '10-13%' },
      { id: 'SF3', title: 'Short Fiction III', description: 'Advanced analysis and synthesis', examWeight: '6-8%' },
      { id: 'PO3', title: 'Poetry III', description: 'Advanced poetic analysis', examWeight: '6-8%' },
      { id: 'LF3', title: 'Longer Fiction or Drama III', description: 'Advanced literary analysis', examWeight: '6-8%' }
    ],
    sectionKeywords: {
      SF1: ["short story", "character", "setting", "narrator", "point of view", "fiction", "plot"],
      PO1: ["poem", "poetry", "stanza", "meter", "rhyme", "imagery", "figurative language", "metaphor", "simile"],
      LF1: ["novel", "drama", "play", "protagonist", "antagonist", "conflict", "theme", "plot"],
      SF2: ["comparison", "contrast", "context", "interpretation", "allusion", "symbol"],
      PO2: ["tone", "mood", "speaker", "sonnet", "ode", "elegy", "free verse"],
      LF2: ["motif", "allegory", "irony", "satire", "bildungsroman", "literary technique"],
      SF3: ["synthesis", "analysis", "unreliable narrator", "stream of consciousness"],
      PO3: ["extended metaphor", "conceit", "volta", "enjambment", "caesura"],
      LF3: ["tragedy", "comedy", "epic", "postmodern", "magical realism"],
    },
  },
  'APSTATS': {
    subjectCode: 'APSTATS',
    displayName: 'AP Statistics',
    crackApPath: 'statistics',
    units: [
      { id: 'EOV', title: 'Exploring One-Variable Data', description: 'Distributions, measures of center and spread', examWeight: '15-23%' },
      { id: 'ETV', title: 'Exploring Two-Variable Data', description: 'Scatterplots, correlation, and regression', examWeight: '5-7%' },
      { id: 'CD', title: 'Collecting Data', description: 'Sampling methods and experimental design', examWeight: '12-15%' },
      { id: 'PRD', title: 'Probability, Random Variables, and Distributions', description: 'Probability rules and distribution models', examWeight: '10-20%' },
      { id: 'SD', title: 'Sampling Distributions', description: 'Central limit theorem and sampling variability', examWeight: '7-12%' },
      { id: 'ICP', title: 'Inference for Categorical Data: Proportions', description: 'Confidence intervals and tests for proportions', examWeight: '12-15%' },
      { id: 'IQM', title: 'Inference for Quantitative Data: Means', description: 'T-tests and confidence intervals for means', examWeight: '7-10%' },
      { id: 'ICC', title: 'Inference for Categorical Data: Chi-Square', description: 'Chi-square tests for association', examWeight: '2-5%' },
      { id: 'IQS', title: 'Inference for Quantitative Data: Slopes', description: 'Inference for regression slopes', examWeight: '2-5%' }
    ],
    sectionKeywords: {
      EOV: ["histogram", "boxplot", "mean", "median", "standard deviation", "distribution", "outlier", "shape", "skew"],
      ETV: ["scatterplot", "correlation", "regression", "residual", "least squares", "r-squared", "linear"],
      CD: ["sampling", "experiment", "observational study", "random", "bias", "confounding", "stratified", "cluster"],
      PRD: ["probability", "random variable", "binomial", "normal", "expected value", "independence", "conditional"],
      SD: ["sampling distribution", "central limit theorem", "sample mean", "standard error", "proportion"],
      ICP: ["confidence interval", "proportion", "hypothesis test", "p-value", "significance", "z-test"],
      IQM: ["t-test", "mean", "confidence interval", "degrees of freedom", "paired", "two-sample"],
      ICC: ["chi-square", "goodness of fit", "independence", "homogeneity", "expected count", "observed"],
      IQS: ["regression", "slope", "t-test for slope", "inference", "linear model", "prediction"],
    },
  },
  'APPHYS1': {
    subjectCode: 'APPHYS1',
    displayName: 'AP Physics 1: Algebra-Based',
    crackApPath: 'physics-1',
    units: [
      { id: 'KIN', title: 'Unit 1: Kinematics', description: 'Motion in one and two dimensions', examWeight: '10-15%' },
      { id: 'DYN', title: 'Unit 2: Force and Translational Dynamics', description: "Newton's laws and force analysis", examWeight: '18-23%' },
      { id: 'WKE', title: 'Unit 3: Work, Energy, and Power', description: 'Work, energy, and conservation laws', examWeight: '18-23%' },
      { id: 'LMOM', title: 'Unit 4: Linear Momentum', description: 'Impulse, momentum, and collisions', examWeight: '10-15%' },
      { id: 'TRD', title: 'Unit 5: Torque and Rotational Dynamics', description: 'Rotational kinematics and dynamics', examWeight: '10-15%' },
      { id: 'EMRS', title: 'Unit 6: Energy and Momentum of Rotating Systems', description: 'Energy and momentum of rotating systems', examWeight: '5-8%' },
      { id: 'OSC', title: 'Unit 7: Oscillations', description: 'Springs, pendulums, and oscillations', examWeight: '5-8%' },
      { id: 'FLU', title: 'Unit 8: Fluids', description: 'Fluid statics, dynamics, and pressure', examWeight: '10-15%' }
    ],
    sectionKeywords: {
      KIN: ["velocity", "acceleration", "displacement", "projectile", "kinematics", "motion", "free fall", "trajectory"],
      DYN: ["newton", "force", "friction", "normal force", "tension", "net force", "free body diagram", "mass", "dynamics"],
      WKE: ["kinetic energy", "potential energy", "work", "power", "conservation of energy", "spring", "joule"],
      LMOM: ["momentum", "impulse", "collision", "elastic", "inelastic", "conservation of momentum", "linear momentum"],
      TRD: ["torque", "angular velocity", "angular acceleration", "moment of inertia", "rotational", "angular momentum", "dynamics"],
      EMRS: ["rotational kinetic energy", "angular momentum", "rotating system", "conservation of angular momentum"],
      OSC: ["oscillation", "pendulum", "spring", "period", "frequency", "amplitude", "harmonic"],
      FLU: ["fluid", "pressure", "buoyancy", "archimedes", "bernoulli", "density", "pascal", "viscosity"],
    },
  },
  'APPHYS2': {
    subjectCode: 'APPHYS2',
    displayName: 'AP Physics 2: Algebra-Based',
    crackApPath: 'physics-2',
    units: [
      { id: 'THD', title: 'Unit 9: Thermodynamics', description: 'Heat, temperature, and thermodynamic laws', examWeight: '15-18%' },
      { id: 'EFP', title: 'Unit 10: Electric Force, Field, and Potential', description: 'Coulomb law, electric fields, and potential', examWeight: '15-18%' },
      { id: 'EC', title: 'Unit 11: Electric Circuits', description: 'Current, resistance, and circuit analysis', examWeight: '15-18%' },
      { id: 'MEI', title: 'Unit 12: Magnetism and Electromagnetism', description: 'Magnetic forces and electromagnetic induction', examWeight: '12-15%' },
      { id: 'GPO', title: 'Unit 13: Geometric Optics', description: 'Reflection, refraction, and mirror analysis', examWeight: '12-15%' },
      { id: 'WPO', title: 'Unit 14: Waves, Sound, and Physical Optics', description: 'Interference, diffraction, and wave properties', examWeight: '12-15%' },
      { id: 'MOD', title: 'Unit 15: Modern Physics', description: 'Photoelectric effect, atomic models, nuclear physics', examWeight: '12-15%' }
    ],
    sectionKeywords: {
      THD: ["heat", "temperature", "entropy", "thermodynamics", "ideal gas", "internal energy", "specific heat"],
      EFP: ["electric field", "coulomb", "charge", "potential", "voltage", "capacitor", "conductor", "insulator"],
      EC: ["circuit", "current", "resistance", "ohm", "series", "parallel", "kirchhoff", "battery", "resistor"],
      MEI: ["magnetic field", "magnet", "electromagnetic", "induction", "faraday", "lenz", "flux", "electromagnetism"],
      GPO: ["reflection", "refraction", "lens", "mirror", "snell", "geometric optics"],
      WPO: ["diffraction", "interference", "wave", "physical optics", "sound", "standing wave", "doppler"],
      MOD: ["quantum", "photon", "photoelectric", "atomic", "nuclear", "radioactive", "half-life", "bohr", "modern physics"],
    },
  },
  'APES': {
    subjectCode: 'APES',
    displayName: 'AP Environmental Science',
    crackApPath: 'environmental-science',
    units: [
      { id: 'LWE', title: 'The Living World: Ecosystems', description: 'Energy flow, nutrient cycling, and ecosystem services', examWeight: '6-8%' },
      { id: 'LWB', title: 'The Living World: Biodiversity', description: 'Species diversity, ecosystem resilience', examWeight: '6-8%' },
      { id: 'POP', title: 'Populations', description: 'Population ecology and human population dynamics', examWeight: '10-15%' },
      { id: 'ESR', title: 'Earth Systems and Resources', description: 'Plate tectonics, soil, atmosphere, and water', examWeight: '10-15%' },
      { id: 'LWU', title: 'Land and Water Use', description: 'Agriculture, forestry, mining, and water management', examWeight: '10-15%' },
      { id: 'ERC', title: 'Energy Resources and Consumption', description: 'Renewable and nonrenewable energy sources', examWeight: '10-15%' },
      { id: 'APL', title: 'Atmospheric Pollution', description: 'Air pollution, smog, and acid deposition', examWeight: '10-15%' },
      { id: 'ATP', title: 'Aquatic and Terrestrial Pollution', description: 'Water pollution, soil contamination, and waste', examWeight: '10-15%' },
      { id: 'GCH', title: 'Global Change', description: 'Climate change, ozone depletion, and biodiversity loss', examWeight: '15-20%' }
    ],
    sectionKeywords: {
      LWE: ["ecosystem", "food web", "trophic", "energy flow", "nutrient cycle", "carbon cycle", "nitrogen cycle", "primary productivity"],
      LWB: ["biodiversity", "species", "extinction", "habitat", "invasive species", "keystone species", "indicator species"],
      POP: ["population", "carrying capacity", "growth rate", "demographic transition", "fertility", "mortality", "age structure"],
      ESR: ["plate tectonics", "soil", "atmosphere", "water cycle", "mineral", "rock cycle", "weathering", "erosion"],
      LWU: ["agriculture", "irrigation", "deforestation", "mining", "urbanization", "aquifer", "dam", "desertification"],
      ERC: ["fossil fuel", "nuclear", "solar", "wind", "renewable", "nonrenewable", "natural gas", "coal", "petroleum"],
      APL: ["air pollution", "smog", "ozone", "particulate", "acid rain", "clean air act", "emissions"],
      ATP: ["water pollution", "eutrophication", "groundwater", "solid waste", "hazardous waste", "biomagnification", "bioaccumulation"],
      GCH: ["climate change", "greenhouse gas", "global warming", "ozone depletion", "sea level rise", "carbon dioxide"],
    },
  },
  'APHUG': {
    subjectCode: 'APHUG',
    displayName: 'AP Human Geography',
    crackApPath: 'human-geography',
    units: [
      { id: 'TG', title: 'Thinking Geographically', description: 'Geographic concepts, tools, and spatial thinking', examWeight: '8-10%' },
      { id: 'PMP', title: 'Population and Migration', description: 'Population distribution, growth, and migration patterns', examWeight: '12-17%' },
      { id: 'CPP', title: 'Cultural Patterns and Processes', description: 'Cultural landscapes, diffusion, and identity', examWeight: '12-17%' },
      { id: 'PPP', title: 'Political Patterns and Processes', description: 'Political organization, boundaries, and governance', examWeight: '12-17%' },
      { id: 'ARL', title: 'Agriculture and Rural Land-Use', description: 'Agricultural practices and food systems', examWeight: '12-17%' },
      { id: 'CUL', title: 'Cities and Urban Land-Use', description: 'Urbanization, urban models, and sustainability', examWeight: '12-17%' },
      { id: 'IED', title: 'Industrial and Economic Development', description: 'Industrialization, development, and globalization', examWeight: '12-17%' }
    ],
    sectionKeywords: {
      TG: ["spatial", "scale", "region", "place", "map", "gis", "geographic", "diffusion", "distribution"],
      PMP: ["population", "migration", "fertility", "mortality", "demographic transition", "push factor", "pull factor", "refugee"],
      CPP: ["culture", "language", "religion", "ethnicity", "diffusion", "acculturation", "assimilation", "cultural landscape"],
      PPP: ["state", "nation", "sovereignty", "boundary", "gerrymandering", "centripetal", "centrifugal", "political"],
      ARL: ["agriculture", "green revolution", "subsistence", "commercial farming", "gmo", "von thunen", "food desert"],
      CUL: ["urban", "city", "suburb", "gentrification", "sprawl", "smart growth", "concentric zone", "sector model"],
      IED: ["industrialization", "development", "gdp", "hdi", "globalization", "outsourcing", "free trade", "rostow"],
    },
  },
};

const LEGACY_ID_MAP: Record<string, string> = {
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

export function getApiCodeForSubject(subjectId: string): string | null {
  const upperSubjectId = subjectId.toUpperCase();
  if (SUBJECT_REGISTRY[upperSubjectId]) {
    return upperSubjectId;
  }
  return LEGACY_ID_MAP[subjectId.toLowerCase()] || null;
}

export function getSectionByCode(subjectCode: string, sectionCode: string): { title: string; description: string } | null {
  const subject = SUBJECT_REGISTRY[subjectCode.toUpperCase()];
  if (!subject) return null;
  const unit = subject.units.find(u => u.id === sectionCode);
  if (unit) return { title: unit.title, description: unit.description };
  const section = subject.sections?.find(s => s.code === sectionCode);
  if (section) return { title: section.title, description: section.description };
  return null;
}

export function getSubjectConfig(subjectCode: string): SubjectMeta | null {
  return SUBJECT_REGISTRY[subjectCode.toUpperCase()] || null;
}

export function getAllSubjectCodes(): string[] {
  return Object.keys(SUBJECT_REGISTRY);
}

export function getSubjectRegistry(): Record<string, SubjectMeta> {
  return SUBJECT_REGISTRY;
}
