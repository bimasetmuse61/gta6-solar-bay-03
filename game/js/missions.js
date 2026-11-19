// The five story missions of Solar Bay, in order, plus courier job flavour.
// Each mission: intro dialogue lines, an objective kind, a target place,
// guide text shown in the HUD, a cash reward and outro dialogue.
export const MISSIONS = [
  {
    id: 'm1', title: 'First Wheels', place: 'garage', reward: 150,
    intro: [
      'Mara: Welcome to Solar Bay, cousin. No car, no cash, no respect.',
      'Mara: My old coupe is at Bay Garage. Take it — nobody will miss it. Much.',
      'You: And if the owner misses it?',
      'Mara: Then drive faster. That is the whole business model here.',
    ],
    objective: 'Reach Bay Garage and get in the marked car (E).',
    outro: ['Mara: See? Wheels. Now you are somebody. Come by the diner.'],
  },
  {
    id: 'm2', title: 'Diner Run', place: 'diner', reward: 200,
    intro: [
      'Mara: The Coral Diner owes me for a "catering incident".',
      'Mara: Pick up the envelope at the diner. Do not open it. Seriously.',
    ],
    objective: 'Go to the Coral Diner and pick up the envelope.',
    outro: ['Mara: Good. It was full of coupons. Valuable coupons. Next job is bigger.'],
  },
  {
    id: 'm3', title: 'Hotel Guest', place: 'hotel', reward: 300,
    intro: [
      'Mara: A guest at the Palms Hotel needs a quiet ride to the Lookout.',
      'Mara: Pick them up, keep it smooth, and whatever happens — no police.',
    ],
    objective: 'Drive to the Palms Hotel, then take the guest to Lookout Point.',
    outro: ['Guest: Five stars. Not the police kind. The good kind.', 'Mara: Paid. You are a natural.'],
  },
  {
    id: 'm4', title: 'Dockside Deal', place: 'docks', reward: 450,
    intro: [
      'Mara: Night work. A crate at the Docks needs to disappear.',
      'Mara: Grab it and bring it home. Expect attention — lose the heat after.',
    ],
    objective: 'Take the crate at the Docks, then return Home with no wanted stars.',
    outro: ['Mara: Clean. Well — clean enough. One last job, the big one.'],
  },
  {
    id: 'm5', title: 'Solar Bay Getaway', place: 'lookout', reward: 800,
    intro: [
      'Mara: Every crew in the bay wants this score. The Lookout, sunset.',
      'Mara: Get there, grab the case, and outrun whatever follows. Finish it.',
    ],
    objective: 'Reach Lookout Point, take the case, then escape: lose all wanted stars.',
    outro: [
      'Mara: You did it. Solar Bay is yours now, cousin.',
      'Mara: Courier work at the Depot still pays, if you ever get bored of paradise.',
    ],
  },
];
export const COURIER_PAY = { base: 60, perMeter: 0.08 };
export const COURIER_LINES = [
  'Depot: Hot food, hotter deadline. Go!',
  'Depot: Fragile. It is always fragile. Drive gentle-ish.',
  'Depot: Customer is watching the map. No pressure.',
];
