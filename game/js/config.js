// Solar Bay tuning: city geometry, speeds, wanted tuning and palette in one place.
export const BLOCKS = 8;            // city is BLOCKS x BLOCKS blocks
export const BLOCK = 176;           // building block size (px)
export const ROAD = 72;             // road width between blocks
export const PITCH = BLOCK + ROAD;  // 248
export const WORLD = BLOCKS * PITCH + ROAD; // total world size (~2056)
export const SIDEWALK = 14;

export const PLAYER = { radius: 11, walk: 118, run: 196, health: 100 };
export const CAR = {
  length: 44, width: 22, accel: 340, brake: 520, reverse: 140,
  maxSpeed: 330, maxReverse: 110, friction: 0.86, turn: 2.6,
};
export const WANTED = {
  max: 5,
  decayDelay: 7,     // seconds hidden before stars start falling
  decayEvery: 6,     // seconds hidden per star lost
  policePerStar: 1,  // extra police cars per star
};
export const DAY_LENGTH = 240; // seconds for a full day-night cycle
export const SAVE_KEY = 'solar-bay.save.v1';

export const PALETTE = {
  road: '#3a3f4a', roadLine: '#d8c25a', sidewalk: '#9aa0a8', grass: '#57a05e',
  sand: '#e6cf8f', water: '#2e7fb8',
  building: ['#c96f4a', '#b8574d', '#d9a441', '#7a9e7e', '#5d8aa8', '#a2678a', '#8a6d4b', '#4f7f7a'],
  roof: ['#8f4f36', '#7d4038', '#a87f31', '#5d7d60', '#446a80', '#7a4f68', '#6b543a', '#3a5f5a'],
  car: ['#e74c3c', '#3498db', '#f1c40f', '#2ecc71', '#e67e22', '#ecf0f1', '#9b59b6', '#1abc9c'],
  police: '#eef2f5', policeTrim: '#2456a6',
};
export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
