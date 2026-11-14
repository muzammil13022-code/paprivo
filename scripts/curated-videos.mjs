/**
 * Hand-picked videos for the gaps in the Syllabus library.
 *
 * scripts/build-videos.mjs applies these after the library pass, so a rebuild
 * keeps them instead of wiping them. Nothing here replaces a library video:
 * empty sections are filled, missing units are built, and teacher playlists
 * (Mr Hassaan for pure maths, Mr Exham for biology) are appended as extra
 * sections alongside the library's own.
 * Every id is re-verified through YouTube's oEmbed endpoint at build time;
 * titles and channels come from oEmbed, not from this file.
 *
 * Shape:
 *   CURATED_PICKS  — unit -> section slug -> [video id, tags][]  (fills empty sections)
 *   CURATED_UNITS  — unit -> [name, slug, picks][]               (units the library lacks)
 *   CURATED_EXTRAS — unit -> [name, slug, picks][]               (appended, never replacing)
 */

export const CURATED_PICKS = {
  WCH12: {
    "chem-topic-8": [["j8M1ihTdD1w", ["IAL", "Lesson"]]],
  },
  WCH13: {
    "chem-practical-1": [
      ["BkVndJUnNkc", ["Exam technique"]],
      ["_owWiKzKdfI", ["Walkthrough"]],
    ],
  },
  WCH14: {
    "chem-topic-12": [
      ["ab478ih7Esw", ["Edexcel", "Lesson"]],
      ["eE8xvgUgTZw", ["Concept support"]],
    ],
    "chem-topic-13": [
      ["Gc0EwJTWmGc", ["IAL", "Lesson"]],
      ["J4WJCYpTYj8", ["Concept support"]],
    ],
  },
  WCH15: {
    "chem-topic-17": [
      ["bcrb_vl0dq0", ["Edexcel", "Revision"]],
      ["AArtRcpypnw", ["IAL", "Lesson"]],
    ],
    "chem-topic-20": [
      ["0Of7WwJJcmk", ["IAL", "Lesson"]],
      ["xf4BJ9gOahk", ["Revision"]],
    ],
  },
  WCH16: {
    "chem-practical-2": [
      ["GtCKZDE3n8U", ["Exam technique"]],
      ["tDVGjuPbXp4", ["Revision"]],
    ],
  },
  WPH13: {
    "physics-practical-1": [
      ["No_xQ0Ycw4s", ["Exam technique"]],
      ["o1ai6nymCNM", ["Revision"]],
    ],
  },
  WPH14: {
    "physics-topic-7": [
      ["xsVzk2B-CPo", ["Edexcel", "Revision"]],
      ["8dfBUxRzWxU", ["Concept support"]],
    ],
  },
  WPH15: {
    "physics-topic-11": [
      ["bCrClNWH_Y8", ["Edexcel", "Revision"]],
      ["4Ws2A6hsrI0", ["Concept support"]],
      ["Sqs-dWJB2CQ", ["Concept support"]],
    ],
  },
  WPH16: {
    "physics-practical-2": [
      ["eEZ8WEOMT-o", ["Revision"]],
      ["FQLiXawOOT4", ["Exam technique"]],
    ],
  },
  WBI13: {
    "bio-practical-1": [
      ["8RVK-vCKX-Q", ["Revision"]],
      ["dSQ5H1fL1Oo", ["Exam technique"]],
    ],
  },
  WBI14: {
    "bio-topic-5": [
      ["JDIZ9F7Rbw0", ["Edexcel", "Revision"]],
      ["KOpO87TLWUs", ["IAL", "Lesson"]],
    ],
  },
  WBI15: {
    "bio-topic-8": [
      ["L24NWY3Taas", ["Edexcel", "Lesson"]],
      ["jHx-01plgyY", ["Concept support"]],
    ],
  },
  WBI16: {
    "bio-practical-2": [
      ["83lS7oJ5WRU", ["Exam technique"]],
      ["FsRQtuTyWCQ", ["Revision"]],
    ],
  },
};

/** Units with no sections in the Syllabus library: build them from the spec. */
export const CURATED_UNITS = {
  WME03: [
    [
      "Variable acceleration",
      "m3-variable-acceleration",
      [
        ["uB3aZRL48_4", ["IAL", "Lesson"]],
        ["VmFejlRepKM", ["Past paper"]],
      ],
    ],
    [
      "Elastic strings and springs",
      "m3-elastic-strings",
      [
        ["iD8qDTDKd9k", ["Concept support"]],
        ["-N3Y6UU7V0E", ["IAL", "Lesson"]],
      ],
    ],
    [
      "Simple harmonic motion",
      "m3-shm",
      [
        ["tL3EZIfHAIU", ["Concept support"]],
        ["az5L05GhAxM", ["Concept support"]],
      ],
    ],
    [
      "Centres of mass of solids",
      "m3-centres-of-mass",
      [
        ["BKhIL7ltALw", ["Concept support"]],
        ["87EeSLHoA6c", ["Concept support"]],
      ],
    ],
  ],
  WST03: [
    ["Combinations of random variables", "s3-combinations", [["Eujxit90MOk", ["Concept support"]]]],
    [
      "Sampling distributions",
      "s3-sampling",
      [
        ["RLnmwvF2N00", ["IAL", "Lesson"]],
        ["DKnw03lMxsw", ["IAL", "Lesson"]],
      ],
    ],
    ["Estimation and confidence", "s3-estimation", [["ENnlSlvQHO0", ["Concept support"]]]],
    [
      "Chi-squared tests",
      "s3-chi-squared",
      [
        ["eK1DGTfppe8", ["Concept support"]],
        ["HKDqlYSLt68", ["Concept support"]],
      ],
    ],
    [
      "Hypothesis tests for means",
      "s3-hypothesis-means",
      [
        ["9ENXa6c8WrM", ["Edexcel", "Lesson"]],
        ["6fXC4cYWIxw", ["Lesson"]],
      ],
    ],
  ],
};

/**
 * Extra sections appended to a unit's own videos, so the library keeps its
 * picks and these read as additional help from a named teacher.
 */
const H = ["Mr Hassaan", "Extra help"];
const E = ["Mr Exham", "Extra help"];
const O = ["The Organic Chemistry Tutor", "Extra help"];

export const CURATED_EXTRAS = {
  WMA11: [
    ["Mr Hassaan — Algebraic expressions", "hs-p1-algebraic-expressions", [["b8ZvHcI5J18", H], ["Y4oIN-boVe4", H]]],
    ["Mr Hassaan — Equations and inequalities", "hs-p1-equations-inequalities", [["rsvZzfSqSyo", H], ["vlJeQtjHems", H]]],
    ["Mr Hassaan — Graphs and transformations", "hs-p1-graphs-transformations", [["MKp4yQoWBMM", H], ["PLSqFhPlgCw", H]]],
    ["Mr Hassaan — Trigonometry", "hs-p1-trigonometry", [["6WayV3VTYTw", H], ["MnYB7tVgDzs", H]]],
  ],
  WMA12: [
    ["Mr Hassaan — Proof", "hs-p2-proof", [["RapwlK8yFaw", H], ["1nPhyCvL6zg", H]]],
    ["Mr Hassaan — Algebra and functions", "hs-p2-algebra-functions", [["KpCIRJd9vmw", H], ["e261hH7AHoE", H]]],
    ["Mr Hassaan — Coordinate geometry", "hs-p2-coordinate-geometry", [["Z5ZnbRW3DhM", H], ["hK9vhfXb3tg", H]]],
    ["Mr Hassaan — Sequences and series", "hs-p2-sequences-series", [["cMfz1Yqxe2s", H], ["wP_RiLCYsBs", H]]],
    ["Mr Hassaan — Radians and trigonometry", "hs-p2-radians-trigonometry", [["gECKDmBzB9c", H], ["1Wmai0hOKUY", H]]],
    ["Mr Hassaan — Exponentials and logarithms", "hs-p2-exponentials-logarithms", [["kknXLahiFZU", H], ["e2Z_3JvwloQ", H]]],
  ],
  WMA13: [
    ["Mr Hassaan — Algebra and functions", "hs-p3-algebra-functions", [["EDlGNOVgqrs", H], ["W2_KiibyfuY", H]]],
    ["Mr Hassaan — Trigonometry", "hs-p3-trigonometry", [["tQxtuqB43rw", H], ["mPyTgOJ5UaA", H]]],
    ["Mr Hassaan — Exponentials and logarithms", "hs-p3-exponentials-logarithms", [["sfzC4RWilYA", H], ["j4_KgHbB62g", H]]],
    ["Mr Hassaan — Differentiation", "hs-p3-differentiation", [["GXkJL8bA1Hg", H], ["n34eM0--kBU", H]]],
    ["Mr Hassaan — Integration", "hs-p3-integration", [["yrcu9Pr2chs", H], ["hGMoOiogD4I", H]]],
    ["Mr Hassaan — Numerical methods", "hs-p3-numerical-methods", [["bA3GcWBwi-s", H], ["xJ3xDQnWus0", H]]],
  ],
  WMA14: [
    ["Mr Hassaan — Algebra and functions", "hs-p4-algebra-functions", [["_LR7wBnlIqA", H], ["KBTcfpCYdOs", H]]],
    ["Mr Hassaan — Trigonometry", "hs-p4-trigonometry", [["UrKSBUA4B6U", H], ["dixrNCp4rDg", H]]],
    ["Mr Hassaan — Parametric equations", "hs-p4-parametric-equations", [["HVDSJhqaZio", H], ["8NYzbNb22ko", H]]],
    ["Mr Hassaan — Differentiation", "hs-p4-differentiation", [["xULvrH65OHE", H], ["OV-J9i76_aA", H]]],
    ["Mr Hassaan — Integration", "hs-p4-integration", [["1yQxU_rVVN8", H], ["cxkv-tVmHSM", H]]],
    ["Mr Hassaan — Vectors", "hs-p4-vectors", [["a-2YR6IC9JQ", H], ["odoi4GOPhQM", H]]],
  ],
  WBI11: [
    ["Mr Exham — Molecules, transport and health", "ex-molecules-transport", [["1_BkwMYGWnU", E], ["JSc876fvCrg", E]]],
    ["Mr Exham — Membranes, proteins, DNA and gene expression", "ex-membranes-gene-expression", [["vdANObA4Dpg", E], ["N-yDTLFYKFs", E]]],
  ],
  WBI12: [
    ["Mr Exham — Cell structure, reproduction and development", "ex-cells-reproduction", [["SwrqYwLlDxs", E], ["2Usx06H5LvQ", E]]],
    ["Mr Exham — Plant structure, biodiversity and conservation", "ex-plants-biodiversity", [["zeV9k3l6lTI", E], ["m6ZgMJXx1dU", E]]],
  ],
  WBI13: [
    ["Mr Exham — Core techniques", "ex-core-techniques", [["cLy7_aTul-Y", E], ["CR8jJak4jpY", E]]],
    ["Mr Exham — Analysis and evaluation", "ex-analysis-evaluation", [["x-FjOSX_4XA", E], ["zva39Sobz-M", E]]],
    ["Mr Exham — Statistical tests", "ex-statistical-tests", [["Me6X-MhpK8g", E]]],
  ],
  WBI14: [
    ["Mr Exham — Energy flow, ecosystems and the environment", "ex-energy-flow", [["gS8XyJQJBZs", E], ["snm56bdTFDM", E]]],
    ["Mr Exham — Microbiology, immunity and forensics", "ex-microbiology-immunity", [["vog3vLlnsV8", E], ["ejyhTqAPVtI", E]]],
  ],
  WBI15: [
    ["Mr Exham — Respiration, muscles and the internal environment", "ex-respiration-homeostasis", [["Wfhgt75rIzc", E], ["GDRGJLV8LPA", E], ["yXWlSve_7Uw", E]]],
    ["Mr Exham — Coordination, response and gene technology", "ex-coordination-gene-tech", [["btdVcSLTfDk", E], ["XJkUtMW1yVM", E], ["ZCBrN-E1tQ0", E]]],
  ],
  WBI16: [
    ["Mr Exham — Advanced practicals", "ex-advanced-practicals", [["CR8jJak4jpY", E], ["HDigBCZJMwQ", E]]],
    ["Mr Exham — Statistical tests and evaluation", "ex-stats-evaluation", [["Me6X-MhpK8g", E], ["zva39Sobz-M", E]]],
  ],

  // Chemistry — one section per specification topic, The Organic Chemistry Tutor.
  WCH11: [
    ["Organic Chemistry Tutor — Moles and equations", "oct-moles", [["CK2yK_JTUH4", O], ["jtAj0s203CI", O]]],
    ["Organic Chemistry Tutor — Atomic structure and the periodic table", "oct-atomic", [["NIwcDnFjj98", O], ["N8PaCCDplRw", O]]],
    ["Organic Chemistry Tutor — Bonding and structure", "oct-bonding", [["S_k0kr2eZSQ", O], ["DBrq31w8vC4", O]]],
    ["Organic Chemistry Tutor — Organic chemistry and alkanes", "oct-alkanes", [["TYU_JluleME", O], ["Tj7mXcWkrTE", O]]],
    ["Organic Chemistry Tutor — Alkenes", "oct-alkenes", [["lKROX1C0JRs", O], ["6O-xSRC5Wg8", O]]],
  ],
  WCH12: [
    ["Organic Chemistry Tutor — Energetics", "oct-enthalpy", [["2ixEf2zpR8E", O], ["HlvllF6Ml9c", O]]],
    ["Organic Chemistry Tutor — Intermolecular forces", "oct-intermolecular", [["XSRa9P-xJl0", O], ["QdwzMPwPA3I", O]]],
    ["Organic Chemistry Tutor — Redox and Groups 1, 2 and 7", "oct-redox-groups", [["j0hI-a6EWWo", O], ["t55mYdWC5mo", O], ["moRp4_oIioc", O]]],
    ["Organic Chemistry Tutor — Kinetics and equilibria", "oct-rates-equilibria", [["JpoOfrPKgmM", O], ["bNcTt3l3Q8k", O]]],
    ["Organic Chemistry Tutor — Halogenoalkanes, alcohols and spectra", "oct-halogenoalkanes", [["yrV85H737o", O], ["K07VceUan0k", O], ["SzVxYTp3pZY", O]]],
  ],
  WCH13: [
    ["Organic Chemistry Tutor — Core techniques", "oct-core-techniques-1", [["HJvALCcKYAc", O], ["ekMM3-o_4FA", O]]],
    ["Organic Chemistry Tutor — Analysis and evaluation", "oct-analysis-1", [["JbEo46uV6d4", O], ["l2yuDvwYq5g", O]]],
    ["Organic Chemistry Tutor — Qualitative tests", "oct-qualitative", [["leCoWeIN-h8", O], ["FPidlCmymVg", O]]],
  ],
  WCH14: [
    ["Organic Chemistry Tutor — Kinetics", "oct-kinetics", [["7I0Xg92_eA4", O], ["16fFjAcxJSc", O]]],
    ["Organic Chemistry Tutor — Entropy and energetics", "oct-entropy", [["bp389WSTplY", O], ["2KuNzB0cZL4", O]]],
    ["Organic Chemistry Tutor — Chemical equilibria", "oct-equilibria", [["J4WJCYpTYj8", O], ["s0PnM_LlUp4", O]]],
    ["Organic Chemistry Tutor — Acid-base equilibria", "oct-acid-base", [["kBzPTEB21Po", O], ["OEW4-Sfyvik", O]]],
    ["Organic Chemistry Tutor — Carbonyls, acids and chirality", "oct-carbonyls", [["2seAPy1sZHE", O], ["EqBfua_kQ70", O], ["yzfcrwJ37kI", O]]],
  ],
  WCH15: [
    ["Organic Chemistry Tutor — Redox equilibria", "oct-redox-equilibria", [["lUXP856WluE", O], ["UzkLP8segcs", O]]],
    ["Organic Chemistry Tutor — Transition metals", "oct-transition", [["r4H5XjJPn58", O], ["yeNtqjE0dJw", O]]],
    ["Organic Chemistry Tutor — Arenes", "oct-arenes", [["ubtvxTvdWjA", O], ["7tsHis091lM", O]]],
    ["Organic Chemistry Tutor — Organic nitrogen compounds", "oct-nitrogen", [["Y6AzMr0Fn3Y", O], ["GtyquGq3aSE", O], ["EzjyF2qvtLs", O]]],
    ["Organic Chemistry Tutor — Organic synthesis", "oct-synthesis", [["nkh0egRNQz0", O], ["I85LgmfkJ0o", O]]],
  ],
  WCH16: [
    ["Organic Chemistry Tutor — Advanced practicals", "oct-core-techniques-2", [["ekMM3-o_4FA", O], ["FPidlCmymVg", O]]],
    ["Organic Chemistry Tutor — Evaluation style", "oct-evaluation-2", [["0IiHPKAvo7g", O], ["IBRzTvoHbHY", O]]],
  ],

  // Physics — one section per specification topic, The Organic Chemistry Tutor.
  WPH11: [
    ["Organic Chemistry Tutor — Kinematics and motion graphs", "oct-kinematics", [["dHjWVlfNraM", O], ["tfItlGfPHyo", O]]],
    ["Organic Chemistry Tutor — Forces and Newton's laws", "oct-forces", [["g550H4e5FCY", O], ["52R61aSWHg0", O]]],
    ["Organic Chemistry Tutor — Work, energy and power", "oct-work-energy", [["_MR1Dp8-F8w", O], ["_DwG8fukuj4", O]]],
    ["Organic Chemistry Tutor — Momentum", "oct-momentum", [["FfaEbqmvKQA", O], ["9YRgHikdcqs", O]]],
    ["Organic Chemistry Tutor — Fluids", "oct-fluids", [["nUKUzpRgdbY", O], ["Qgl_l0H7Qgc", O]]],
    ["Organic Chemistry Tutor — Materials", "oct-materials", [["HALbtyDUjp0", O], ["qQZRTBRJbl4", O]]],
  ],
  WPH12: [
    ["Organic Chemistry Tutor — The nature of light", "oct-light", [["KiJi8yqB_Rg", O], ["9hCrhllI0ck", O]]],
    ["Organic Chemistry Tutor — Waves", "oct-waves", [["ys0mQbJYQjY", O], ["-8nn8hb0H8o", O]]],
    ["Organic Chemistry Tutor — Wave-particle duality", "oct-duality", [["TX_4r76RppM", O], ["-LECEvusk8E", O]]],
    ["Organic Chemistry Tutor — DC electricity", "oct-dc", [["dEuBykX5_B4", O], ["_rSHqvjDksg", O]]],
  ],
  WPH13: [
    ["Organic Chemistry Tutor — Measurement techniques", "oct-measurement", [["8rZRYPoerPw", O], ["l2yuDvwYq5g", O]]],
    ["Organic Chemistry Tutor — Uncertainties and errors", "oct-uncertainties", [["b881nOem4vg", O], ["NBnw_2gUiV4", O]]],
    ["Organic Chemistry Tutor — Graphical analysis", "oct-graphs", [["P8hT5nDai6A", O], ["fyJAOD3X5tw", O]]],
    ["Organic Chemistry Tutor — Core practicals recap", "oct-practicals-1", [["1Q15fgz-lUk", O], ["G1mZutobxDU", O]]],
  ],
  WPH14: [
    ["Organic Chemistry Tutor — Further mechanics", "oct-further-mechanics", [["WQ9AH2S8B6Y", O], ["WzjIMuf-yuo", O]]],
    ["Organic Chemistry Tutor — Circular motion", "oct-circular", [["IawY86XveQE", O], ["_psIWtPBHzA", O]]],
    ["Organic Chemistry Tutor — Electric fields", "oct-electric-fields", [["kCp5yYjo9zE", O], ["LzKMQByFSLc", O]]],
    ["Organic Chemistry Tutor — Capacitors", "oct-capacitors", [["BimpNou0orc", O], ["PTyB6_Kt_5A", O]]],
    ["Organic Chemistry Tutor — Magnetic fields", "oct-magnetic", [["7MBawzone30", O], ["LDOa7UdfcMQ", O]]],
    ["Organic Chemistry Tutor — Nuclear and particle physics", "oct-nuclear", [["cPRFF-eCGT8", O], ["eLwraf_A80U", O]]],
  ],
  WPH15: [
    ["Organic Chemistry Tutor — Thermodynamics", "oct-thermodynamics", [["7Siv2NNCFag", O], ["TnDCxw0y6YM", O]]],
    ["Organic Chemistry Tutor — Nuclear decay", "oct-decay", [["WTQvfvoOF3g", O], ["oSM6nyil7Q8", O]]],
    ["Organic Chemistry Tutor — Oscillations", "oct-shm", [["_Gnke2x3vT8", O], ["iubb3eFBQ9U", O]]],
    ["Organic Chemistry Tutor — Gravitational fields", "oct-gravitational", [["Ep1jIhHdf2A", O], ["CCsbSq9wlyI", O]]],
  ],
  WPH16: [
    ["Organic Chemistry Tutor — Planning investigations", "oct-planning", [["xaAthgG0o8o", O], ["sNQsdrqsD_s", O]]],
    ["Organic Chemistry Tutor — Analysis and evaluation", "oct-analysis-2", [["JbEo46uV6d4", O], ["0IiHPKAvo7g", O]]],
    ["Organic Chemistry Tutor — Core practicals recap", "oct-practicals-2", [["1Q15fgz-lUk", O], ["PLQrPqYlPmI", O]]],
  ],
};
