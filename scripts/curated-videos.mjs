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
};
