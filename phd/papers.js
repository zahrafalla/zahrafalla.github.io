/* =========================================================================
   papers.js  —  your thesis literature data
   -------------------------------------------------------------------------
   One entry per paper you have read:
     keywords : which of the 5 thesis themes the paper covers (true/false)
     dna      : the paper's concept fingerprint {concept: mentions}
                (filled in automatically by add-paper.html — it powers the
                 3D Constellation page and the idea "stars")

   You normally DON'T edit this file by hand. Use "add-paper.html" to read
   your PDFs, then download the new papers.js and replace this file.
   ========================================================================= */

window.PAPERS = [
  /* Sample #1 carries a FULL analysis (produced by add-paper.html from a test PDF),
     so you can see what your supervisor gets when they open a paper. */
  { title: "Collaborative embodied learning of mathematics in VR: a dyad study", authors: "", year: 2023,
    keywords: { collaborative:true,  embodied:true,  learning:true,  mathematics:true,  vr:true  },
    dna: {"gesture":5,"spatial reasoning":4,"presence":3,"transfer":3,"dyad":2,"joint attention":2,"geometr":2,"manipulative":2,"head-mounted":2,"virtual environment":2,"action":2,"peer":1,"group":1,"shared understanding":1,"scaffold":1,"dialogue":1,"negotiat":1,"propriocept":1,"enact":1,"metaphor":1,"conceptual change":1,"engagement":1,"fraction":1,"proportion":1,"ratio":1,"number line":1,"immersion":1,"avatar":1,"protocol analysis":1,"eye tracking":1,"think-aloud":1,"control group":1},
    analysis: {"v":1,"pages":1,"words":231,
      "abstract":"This study investigates collaborative embodied learning of mathematics in virtual reality. We explore how gesture and full body movement support spatial reasoning and geometry. Two learners worked together as a dyad inside an immersive head-mounted display environment. Social presence and joint attention shaped how the partners negotiated shared understanding. Embodied interaction with virtual manipulatives grounded abstract mathematical concepts. Collaborative gesture and peer dialogue improved conceptual understanding and transfer. We used eye tracking and a think-aloud protocol analysis to study the learning process. Scaffolding was central to the pedagogy in this immersive collaborative virtual environment.",
      "summary":["This study investigates collaborative embodied learning of mathematics in virtual reality.","Collaborative gesture and peer dialogue improved conceptual understanding and transfer.","Mathematics education increasingly uses virtual reality to teach geometry and spatial reasoning.","Virtual reality offers presence, immersion, and a shared virtual environment for teamwork.","These findings inform the design of collaborative embodied mathematics learning in virtual reality."],
      "themes":{
        "collaborative":{"n":15,"bins":"0100000010010100011000000010000000010100011000000000100100100000100000","ev":[["Collaborative gesture and peer dialogue improved conceptual understanding and transfer.","collaborat"],["Virtual reality offers presence, immersion, and a shared virtual environment for teamwork.","teamwork"]]},
        "embodied":{"n":17,"bins":"0100210000000010001000000000000011100000000002000000011000100000100110","ev":[["We explore how gesture and full body movement support spatial reasoning and geometry.","gesture"],["Embodied cognition suggests that gesture and movement ground mathematical understanding.","embodi"]]},
        "learning":{"n":14,"bins":"0010000100000000000100002100010100001000000000010000010100001000010000","ev":[["Scaffolding was central to the pedagogy in this immersive collaborative virtual environment.","pedagog"],["Mathematics education increasingly uses virtual reality to teach geometry and spatial reasoning.","educat"]]},
        "mathematics":{"n":14,"bins":"0010002000000000010000000000100200100000000000011001000010000000100001","ev":[["Mathematics education increasingly uses virtual reality to teach geometry and spatial reasoning.","mathematic"],["We explore how gesture and full body movement support spatial reasoning and geometry.","geometr"]]},
        "vr":{"n":15,"bins":"0001000002010000000000000011001000000001110001000100000000010000010100","ev":[["Virtual reality offers presence, immersion, and a shared virtual environment for teamwork.","virtual reality"],["Two learners worked together as a dyad inside an immersive head-mounted display environment.","immersive"]]}},
      "concepts":[["collaborative",6],["virtual reality",5],["embodied",5],["learning",5],["gesture",5],["understanding",5],["spatial reasoning",4],["mathematics",4]],
      "sparks":[["gesture",5],["spatial reasoning",4],["presence",3],["transfer",3],["manipulative",2],["dyad",2],["joint attention",2],["geometr",2],["scaffold",1],["propriocept",1],["metaphor",1],["avatar",1],["eye tracking",1]]} },

  { title: "Hand-tracking for embodied mathematics learning in virtual reality", authors: "", year: 2022,
    keywords: { collaborative:false, embodied:true,  learning:true,  mathematics:true,  vr:true  },
    dna: { "hand tracking":8, "gesture":6, "sensorimotor":4, "manipulative":3, "geometr":3, "presence":2, "cognitive load":2 } },

  { title: "Collaborative problem solving in shared virtual environments", authors: "", year: 2021,
    keywords: { collaborative:true,  embodied:false, learning:true,  mathematics:false, vr:true  },
    dna: { "virtual environment":6, "co-presence":5, "joint attention":3, "dialogue":4, "awareness":3, "presence":4, "multi-user":3, "negotiat":2 } },

  { title: "Embodied cognition and spatial reasoning in geometry", authors: "", year: 2019,
    keywords: { collaborative:false, embodied:true,  learning:true,  mathematics:true,  vr:false },
    dna: { "spatial reasoning":8, "geometr":7, "gesture":4, "metaphor":3, "image schema":3, "grounding":2, "representation":2 } },

  { title: "Social presence in multi-user VR classrooms", authors: "", year: 2022,
    keywords: { collaborative:true,  embodied:false, learning:true,  mathematics:false, vr:true  },
    dna: { "presence":9, "co-presence":4, "avatar":4, "multi-user":5, "engagement":3, "motivation":2, "group":3 } },

  { title: "Gesture-based interaction for learning algebra", authors: "", year: 2020,
    keywords: { collaborative:false, embodied:true,  learning:true,  mathematics:true,  vr:false },
    dna: { "gesture":8, "algebra":7, "metaphor":3, "representation":3, "transfer":2, "cognitive load":2 } },

  { title: "Peer collaboration and conceptual understanding of fractions", authors: "", year: 2018,
    keywords: { collaborative:true,  embodied:false, learning:true,  mathematics:true,  vr:false },
    dna: { "peer":6, "fraction":8, "dialogue":4, "conceptual change":3, "scaffold":3, "misconcept":2, "dyad":2 } },

  { title: "Immersive virtual reality for number sense development", authors: "", year: 2023,
    keywords: { collaborative:false, embodied:false, learning:true,  mathematics:true,  vr:true  },
    dna: { "number sense":7, "immersion":5, "number line":4, "magnitude":3, "presence":3, "engagement":2, "cognitive load":3 } },

  { title: "Full-body interaction supports collaborative learning", authors: "", year: 2017,
    keywords: { collaborative:true,  embodied:true,  learning:true,  mathematics:false, vr:false },
    dna: { "bodily":5, "gesture":4, "group":4, "joint attention":3, "awareness":2, "engagement":3, "sensorimotor":2 } },

  { title: "Head-mounted displays in mathematics education: a review", authors: "", year: 2021,
    keywords: { collaborative:false, embodied:false, learning:true,  mathematics:true,  vr:true  },
    dna: { "head-mounted":7, "immersion":4, "geometr":4, "spatial reasoning":3, "simulator sickness":3, "cognitive load":3, "transfer":2 } },

  { title: "Enactive metaphors for calculus concepts", authors: "", year: 2020,
    keywords: { collaborative:false, embodied:true,  learning:true,  mathematics:true,  vr:false },
    dna: { "enact":6, "metaphor":7, "image schema":4, "function":4, "gesture":3, "grounding":3 } },

  { title: "Designing collaborative embodied tasks for VR", authors: "", year: 2022,
    keywords: { collaborative:true,  embodied:true,  learning:true,  mathematics:false, vr:true  },
    dna: { "design-based":5, "gesture":5, "co-presence":4, "avatar":4, "joint attention":3, "presence":3, "roles":2, "affordance":2 } },

  { title: "The role of movement in learning", authors: "", year: 2016,
    keywords: { collaborative:false, embodied:true,  learning:true,  mathematics:false, vr:false },
    dna: { "sensorimotor":4, "bodily":4, "action":5, "grounding":3, "retention":2, "engagement":2 } },

  { title: "Virtual reality and presence: a survey", authors: "", year: 2019,
    keywords: { collaborative:false, embodied:false, learning:false, mathematics:false, vr:true  },
    dna: { "presence":10, "immersion":7, "telepresence":4, "fidelity":3, "field of view":2, "locomotion":2, "avatar":2 } },

  { title: "Collaboration scripts in computer-supported learning", authors: "", year: 2015,
    keywords: { collaborative:true,  embodied:false, learning:true,  mathematics:false, vr:false },
    dna: { "cscl":7, "scaffold":5, "roles":4, "dialogue":4, "group":3, "negotiat":2, "metacognit":2 } },

  { title: "Embodied design for proportional reasoning", authors: "", year: 2018,
    keywords: { collaborative:false, embodied:true,  learning:true,  mathematics:true,  vr:false },
    dna: { "proportion":8, "ratio":5, "gesture":4, "sensorimotor":3, "design-based":3, "grounding":2, "manipulative":2 } },

  { title: "Multi-user immersive geometry with shared manipulatives", authors: "", year: 2023,
    keywords: { collaborative:true,  embodied:false, learning:true,  mathematics:true,  vr:true  },
    dna: { "manipulative":7, "geometr":6, "multi-user":4, "joint attention":3, "co-presence":3, "spatial reasoning":3, "dialogue":2 } },

  { title: "Sensorimotor coupling in VR mathematics tasks", authors: "", year: 2024,
    keywords: { collaborative:false, embodied:true,  learning:true,  mathematics:true,  vr:true  },
    dna: { "sensorimotor":7, "propriocept":4, "gesture":3, "spatial reasoning":4, "presence":3, "eye tracking":3, "hand tracking":2 } },
];

/* This flag shows a small "sample data" banner on the site.
   It is set to false automatically when you export from add-paper.html. */
window.PAPERS_IS_SAMPLE = true;
