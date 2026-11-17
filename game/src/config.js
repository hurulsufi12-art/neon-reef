// Neon Reef — every tuning number, colour and rule in one place.
// The playfield is a fixed 1280x720 logical area; the renderer scales it to the
// window, so no rule below depends on the screen size. The reef has three depth
// bands: the bright shallows (safe, common food), the twilight mid-reef (mixed)
// and the deep trench (rare golden plankton, more predators) — risk vs reward.
export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

export const FISH = {
  radius: 20,
  accel: 2400,
  maxSpeed: 340,
  drag: 3.2,
  /** Seconds of mercy after a hit, during which the fish blinks and cannot be hit. */
  invulnerable: 2.0,
  /** How fast the lantern glow pulses. */
  glowPulse: 2.4,
};

export const LIVES = 3;

/** Seconds of play before the reef gets harder; difficulty never stops growing. */
export const LEVEL = { seconds: 18, max: 12 };

export const PLANKTON = {
  radius: 9,
  /** Drift speed of a food mote. */
  drift: 26,
  points: 10,
  /** A food mote's glow is worth more the deeper it drifts. */
  deepBonus: 5,
  /** Seconds between spawns at level 1; shrinks as levels rise. */
  interval: 0.55,
  intervalScale: 0.94,
  minInterval: 0.22,
};

export const GOLDEN = {
  radius: 13,
  points: 50,
  /** Golden plankton only ever spawns in the deep trench. */
  interval: 7.0,
  intervalScale: 0.95,
  minInterval: 4.0,
};

export const PEARL = {
  radius: 12,
  points: 25,
  interval: 11.0,
  intervalScale: 0.96,
  minInterval: 7.0,
};

/** Power-ups granted by pearls, in the order they cycle. */
export const POWERUPS = ['shield', 'slow', 'magnet'];
export const POWERUP_DURATION = { shield: 8, slow: 7, magnet: 9 };

export const EEL = {
  radius: 16,
  speed: 130,
  speedPerLevel: 10,
  interval: 4.0,
  intervalScale: 0.9,
  minInterval: 1.6,
};

export const SHARK = {
  radius: 30,
  speed: 105,
  speedPerLevel: 9,
  /** Sharks only appear from level 3, patrolling the deep trench. */
  firstLevel: 3,
  interval: 9.0,
  intervalScale: 0.92,
  minInterval: 5.0,
};

export const URCHIN = {
  radius: 15,
  /** Urchins sit on the reef floor and thorns; they never move. */
  interval: 6.0,
  intervalScale: 0.94,
  minInterval: 3.5,
};

/** Combo: each mote eaten within the window raises the multiplier; it decays. */
export const COMBO = {
  window: 4.0,
  maxMultiplier: 8,
  /** Points added per combo step on top of the mote's own points. */
  stepBonus: 5,
};

export const POOL_SIZE = 96;

export const PALETTE = {
  backdrop: '#04101f',
  waterTop: '#0a2a4a',
  waterMid: '#07203a',
  waterDeep: '#030c1a',
  sand: '#1d2f45',
  rock: '#16283e',
  plant: '#1f7a5c',
  plantBright: '#2fae7e',
  coralPink: '#ff6fa5',
  coralOrange: '#ff9a3d',
  plankton: '#7dfcd6',
  planktonGold: '#ffd94d',
  pearl: '#f2f7ff',
  eel: '#b06cff',
  shark: '#8fa8c8',
  urchin: '#ff5d73',
  fishBody: '#ffd166',
  fishBelly: '#fff3c4',
  fishFin: '#ff8c42',
  lantern: '#ffe066',
  shield: '#6fd3ff',
  text: '#eaf6ff',
  muted: '#9fc3d8',
  panel: '#0a2438',
  panelEdge: '#2a6f8f',
  danger: '#ff5d73',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'neon-reef.best';

/** Depth bands, in y pixels: shallows, mid-reef, deep trench. */
export const DEPTH = {
  shallows: { top: 0, bottom: 240 },
  mid: { top: 240, bottom: 480 },
  deep: { top: 480, bottom: 720 },
};
