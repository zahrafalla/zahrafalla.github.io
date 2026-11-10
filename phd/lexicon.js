/* =========================================================================
   lexicon.js — the shared vocabulary of your thesis
   -------------------------------------------------------------------------
   Used by add-paper.html (reading PDFs) and constellation.html (3D map).
   Edit the word lists here to tune what counts toward each theme / concept.
   ========================================================================= */
(function(){
  "use strict";

  /* The five thesis themes. `terms` are lower-case stems (substring match). */
  const THEMES = [
    { key:"collaborative", short:"Collab.",  label:"Collaborative",   color:"var(--c-collaborative)", hex:"#2fd2be",
      terms:["collaborat","cooperat","co-operat","teamwork","joint ","peer","group work","shared","social interaction","co-construct","dyad"] },
    { key:"embodied",      short:"Embodied", label:"Embodied",        color:"var(--c-embodied)",      hex:"#ff8a4c",
      terms:["embodi","enactive","gesture","sensorimotor","kinesthetic","kinaesthetic","bodily","full-body","full body","haptic","propriocept","movement"] },
    { key:"learning",      short:"Learning", label:"Learning",        color:"var(--c-learning)",      hex:"#6b93ff",
      terms:["learn","educat","pedagog","teach","instruct","conceptual understanding","scaffold"] },
    { key:"mathematics",   short:"Math",     label:"Mathematics",     color:"var(--c-mathematics)",   hex:"#a985ff",
      terms:["mathematic","math ","maths","geometr","algebra","arithmetic","calculus","fraction","spatial reasoning","number sense","proportion"] },
    { key:"vr",            short:"VR",       label:"Virtual Reality", color:"var(--c-vr)",            hex:"#ff6fae",
      terms:["virtual reality"," vr ","(vr)","immersive","head-mounted","head mounted","hmd","virtual environment","oculus","headset","avatar","presence"] },
  ];
  const THRESHOLD = 2;   // a theme is auto-ticked at this many matches

  /* DNA lens: concepts from your research neighbourhood, grouped by area. */
  const LENS = {
    "Collaboration & social":["dyad","peer","group","co-construct","joint attention","shared understanding","intersubjectiv","scaffold","dialogue","negotiat","mutual engagement","co-presence","awareness","turn-taking","common ground","distributed cognition","cscl","tutoring","help-seeking","roles"],
    "Embodiment & gesture":["gesture","pointing","deictic","iconic","propriocept","kinesthetic","sensorimotor","enact","manipulation","grounding","image schema","metaphor","bodily","haptic","touch","posture","grasp","motor","action"],
    "Learning & cognition":["zone of proximal","conceptual change","cognitive load","transfer","retention","misconcept","representation","abstraction","schema","metacognit","engagement","motivation","feedback","formative","prior knowledge","inquiry","constructivis","situated learning"],
    "Mathematics":["geometr","algebra","number sense","fraction","proportion","ratio","spatial reasoning","visualiz","proof","measurement","estimation","symmetry","coordinate","vector","graph","function","manipulative","number line","magnitude","quantity"],
    "VR, HCI & immersion":["immersion","presence","telepresence","avatar","head-mounted","controller","hand tracking","3d interaction","virtual environment","affordance","interface","interaction design","field of view","locomotion","simulator sickness","fidelity","spatial audio","multi-user"],
    "Theory & method":["phenomenolog","ethnograph","design-based","mixed method","qualitative","quantitative","protocol analysis","eye tracking","think-aloud","usability","pre-test","post-test","control group","effect size","grounded theory","activity theory","semiotic","multimodal"],
  };
  const LENS_COLOR = {
    "Collaboration & social":"var(--c-collaborative)", "Embodiment & gesture":"var(--c-embodied)",
    "Learning & cognition":"var(--c-learning)",       "Mathematics":"var(--c-mathematics)",
    "VR, HCI & immersion":"var(--c-vr)",              "Theory & method":"var(--c-method)",
  };
  const FAM_HUE = {
    "Collaboration & social":{h:170,s:62}, "Embodiment & gesture":{h:20,s:84},
    "Learning & cognition":{h:220,s:70},   "Mathematics":{h:262,s:60},
    "VR, HCI & immersion":{h:330,s:68},    "Theory & method":{h:208,s:14},
  };

  /* Nicer display names for word stems. */
  const LABEL = {
    "co-construct":"co-construction","intersubjectiv":"intersubjectivity","negotiat":"negotiation",
    "cscl":"CSCL","propriocept":"proprioception","enact":"enactment","zone of proximal":"ZPD",
    "misconcept":"misconception","metacognit":"metacognition","constructivis":"constructivism",
    "geometr":"geometry","visualiz":"visualisation","manipulative":"manipulatives",
    "phenomenolog":"phenomenology","ethnograph":"ethnography","design-based":"design-based research",
    "mixed method":"mixed methods","semiotic":"semiotics","3d interaction":"3D interaction",
  };

  /* Idea sparks: research prompts that light up when a concept appears. */
  const SPARKS = [
    {t:"gesture",          s:"Embodied × Collaboration: could learners co-gesture a concept together in VR to build shared understanding?"},
    {t:"manipulative",     s:"Math × VR: what can virtual manipulatives afford that physical ones cannot?"},
    {t:"presence",         s:"VR × Collaboration: does social presence change how partners reason about a problem together?"},
    {t:"scaffold",         s:"Learning × Collaboration: who scaffolds whom when both partners are embodied in VR?"},
    {t:"propriocept",      s:"Embodied × Math: can body position or movement encode a mathematical relationship?"},
    {t:"dyad",             s:"Collaboration: how does embodiment change as you move from a dyad to a larger group?"},
    {t:"metaphor",         s:"Embodied × Math: which bodily metaphor grounds the math idea in these papers?"},
    {t:"spatial reasoning",s:"Math × VR: VR is inherently spatial — design a task that exploits that for spatial reasoning."},
    {t:"joint attention",  s:"Collaboration × VR: how do partners establish joint attention on a shared 3D object?"},
    {t:"image schema",     s:"Embodied × Math: map the concept onto an image schema (path, container, balance…)."},
    {t:"avatar",           s:"VR × Embodiment: does the avatar's form shape how learners move and gesture?"},
    {t:"transfer",         s:"Learning: does embodied VR learning transfer back to pen-and-paper mathematics?"},
    {t:"eye tracking",     s:"Method: eye tracking could reveal where attention goes during collaborative VR math."},
    {t:"cognitive load",   s:"Learning × VR: is immersion lowering or raising cognitive load for this task?"},
    {t:"co-presence",      s:"Collaboration × VR: what does it take for two learners to feel truly 'together' in a VR math task?"},
    {t:"sensorimotor",     s:"Embodied × Math: which sensorimotor loops in VR could be designed to carry mathematical meaning?"},
    {t:"geometr",          s:"Math × Embodiment: let learners walk, stretch and rotate geometric objects with their whole body."},
  ];

  const label  = stem => LABEL[stem] || stem;
  const familyOf = stem => Object.keys(LENS).find(f => LENS[f].includes(stem)) || "Theory & method";
  const sparkFor = stem => SPARKS.find(s => s.t === stem || stem.startsWith(s.t) || s.t.startsWith(stem));

  /* Flatten an analysis' lens {family:[{t,n}]} to a DNA fingerprint {stem:count}. */
  function dnaOf(lens){
    const out = {};
    Object.values(lens||{}).forEach(items => items.forEach(x => { out[x.t] = Math.max(out[x.t]||0, x.n); }));
    return out;
  }

  window.LEX = { THEMES, THRESHOLD, LENS, LENS_COLOR, FAM_HUE, LABEL, SPARKS, label, familyOf, sparkFor, dnaOf };
})();
