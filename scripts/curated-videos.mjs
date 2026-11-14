/**
 * Hand-picked videos for the gaps in the Syllabus library.
 *
 * scripts/build-videos.mjs applies these after the library pass, so a rebuild
 * keeps them instead of wiping them. Every id is re-verified through YouTube's
 * oEmbed endpoint at build time; titles and channels come from oEmbed, not
 * from this file.
 *
 * Shape:
 *   CURATED_PICKS — unit -> section slug -> [video id, tags][]  (fills empty sections)
 *   CURATED_UNITS — unit -> [name, slug, picks][]               (units the library lacks)
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
    [
      "Combinations of random variables",
      "s3-combinations",
      [["Eujxit90MOk", ["Concept support"]]],
    ],
    [
      "Sampling distributions",
      "s3-sampling",
      [
        ["RLnmwvF2N00", ["IAL", "Lesson"]],
        ["DKnw03lMxsw", ["IAL", "Lesson"]],
      ],
    ],
    [
      "Estimation and confidence",
      "s3-estimation",
      [["ENnlSlvQHO0", ["Concept support"]]],
    ],
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
