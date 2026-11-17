// Neon Reef's rules and state, with no drawing and no browser in it: the
// lanternfish, the drifting plankton, the pearls and their power-ups, the
// predators, the combo, the levels and the win. step() advances one fixed step
// and returns what happened as bit flags, so the caller can react (sounds,
// announcements) without the world knowing about screens or sound. Nothing
// here allocates after createWorld returns, except the small decor lists
// rebuilt on reset.
import {
  COMBO, DEPTH, EEL, FIELD, FISH, GOLDEN, LEVEL, LIVES, PEARL, PLANKTON,
  POWERUP_DURATION, POWERUPS, POOL_SIZE, SHARK, STEP, URCHIN,
} from './config.js';
import { range } from './random.js';

export const KIND_PLANKTON = 0;
export const KIND_GOLDEN = 1;
export const KIND_PEARL = 2;

export const KIND_EEL = 0;
export const KIND_SHARK = 1;
export const KIND_URCHIN = 2;

export const EVENT_EAT = 1;
export const EVENT_GOLDEN = 2;
export const EVENT_PEARL = 4;
export const EVENT_HIT = 8;
export const EVENT_OVER = 16;
export const EVENT_LEVEL = 32;
export const EVENT_WIN = 64;

/** The score that restores the reef: reaching it wins the game. */
export const WIN_SCORE = 7500;

function overlaps(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const reach = a.radius + b.radius;
  return dx * dx + dy * dy < reach * reach;
}

export function createWorld(random) {
  const fish = {
    x: FIELD.width / 2, y: FIELD.height / 2, vx: 0, vy: 0,
    radius: FISH.radius, angle: 0, invulnerable: 0, glow: 0,
  };
  const motes = [];
  for (let i = 0; i < POOL_SIZE; i += 1) {
    motes.push({ active: false, kind: KIND_PLANKTON, x: 0, y: 0, radius: PLANKTON.radius, phase: 0, life: 0 });
  }
  const hunters = [];
  for (let i = 0; i < 24; i += 1) {
    hunters.push({ active: false, kind: KIND_EEL, x: 0, y: 0, vx: 0, vy: 0, radius: EEL.radius, phase: 0, turn: 0 });
  }
  const particles = [];
  for (let i = 0; i < 128; i += 1) {
    particles.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, size: 3, color: '#ffffff' });
  }
  const bubbles = [];
  for (let i = 0; i < 40; i += 1) {
    bubbles.push({ active: false, x: 0, y: 0, radius: 3, speed: 20 });
  }

  const plants = [];
  const rocks = [];
  const state = {
    fish, motes, hunters, particles, bubbles, plants, rocks,
    score: 0, lives: LIVES, level: 1, elapsed: 0,
    combo: 0, comboTimer: 0, multiplier: 1,
    shield: 0, slow: 0, magnet: 0, powerupIndex: 0,
    won: false, shake: 0, banner: 0, bannerText: '',
    planktonTimer: 0, goldenTimer: 0, pearlTimer: 0,
    eelTimer: 0, sharkTimer: 0, urchinTimer: 0, bubbleTimer: 0,
    pearlsEaten: 0, goldenEaten: 0, motesEaten: 0,
  };

  function reset() {
    fish.x = FIELD.width / 2;
    fish.y = FIELD.height / 2;
    fish.vx = 0;
    fish.vy = 0;
    fish.angle = 0;
    fish.invulnerable = 0;
    for (const mote of motes) mote.active = false;
    for (const hunter of hunters) hunter.active = false;
    for (const particle of particles) particle.active = false;
    for (const bubble of bubbles) bubble.active = false;
    plants.length = 0;
    rocks.length = 0;
    for (let i = 0; i < 26; i += 1) {
      plants.push({
        x: range(random, 0, FIELD.width), height: range(random, 50, 150),
        sway: range(random, 0, Math.PI * 2), hue: random() < 0.5 ? 0 : 1,
      });
    }
    for (let i = 0; i < 9; i += 1) {
      rocks.push({ x: range(random, 0, FIELD.width), width: range(random, 50, 140), height: range(random, 18, 46) });
    }
    state.score = 0;
    state.lives = LIVES;
    state.level = 1;
    state.elapsed = 0;
    state.combo = 0;
    state.comboTimer = 0;
    state.multiplier = 1;
    state.shield = 0;
    state.slow = 0;
    state.magnet = 0;
    state.powerupIndex = 0;
    state.won = false;
    state.shake = 0;
    state.banner = 0;
    state.bannerText = '';
    state.planktonTimer = 0.3;
    state.goldenTimer = GOLDEN.interval;
    state.pearlTimer = PEARL.interval;
    state.eelTimer = 2.2;
    state.sharkTimer = SHARK.interval;
    state.urchinTimer = URCHIN.interval;
    state.bubbleTimer = 0;
    state.pearlsEaten = 0;
    state.goldenEaten = 0;
    state.motesEaten = 0;
    // A welcoming scatter of food so the first seconds already feel alive.
    for (let i = 0; i < 8; i += 1) spawnMote(KIND_PLANKTON, range(random, 80, FIELD.width - 80), range(random, 60, FIELD.height - 120));
  }

  function freeMote() {
    for (let i = 0; i < motes.length; i += 1) if (!motes[i].active) return motes[i];
    return null;
  }

  function freeHunter() {
    for (let i = 0; i < hunters.length; i += 1) if (!hunters[i].active) return hunters[i];
    return null;
  }

  function freeParticle() {
    for (let i = 0; i < particles.length; i += 1) if (!particles[i].active) return particles[i];
    return null;
  }

  function burst(x, y, color, count, speed) {
    for (let i = 0; i < count; i += 1) {
      const particle = freeParticle();
      if (particle === null) return;
      const angle = random() * Math.PI * 2;
      const velocity = range(random, speed * 0.3, speed);
      particle.active = true;
      particle.x = x;
      particle.y = y;
      particle.vx = Math.cos(angle) * velocity;
      particle.vy = Math.sin(angle) * velocity;
      particle.max = range(random, 0.3, 0.7);
      particle.life = particle.max;
      particle.size = range(random, 2, 5);
      particle.color = color;
    }
  }

  function spawnMote(kind, x, y) {
    const mote = freeMote();
    if (mote === null) return;
    mote.active = true;
    mote.kind = kind;
    mote.x = x !== undefined ? x : range(random, 30, FIELD.width - 30);
    mote.y = y !== undefined ? y : -20;
    mote.phase = range(random, 0, Math.PI * 2);
    mote.life = 0;
    mote.radius = kind === KIND_GOLDEN ? GOLDEN.radius : kind === KIND_PEARL ? PEARL.radius : PLANKTON.radius;
  }

  function spawnEel() {
    const hunter = freeHunter();
    if (hunter === null) return;
    hunter.active = true;
    hunter.kind = KIND_EEL;
    hunter.radius = EEL.radius;
    hunter.x = random() < 0.5 ? -30 : FIELD.width + 30;
    hunter.y = range(random, 120, FIELD.height - 120);
    hunter.vx = (hunter.x < 0 ? 1 : -1) * (EEL.speed + EEL.speedPerLevel * (state.level - 1));
    hunter.vy = 0;
    hunter.phase = range(random, 0, Math.PI * 2);
    hunter.turn = 0;
  }

  function spawnShark() {
    const hunter = freeHunter();
    if (hunter === null) return;
    hunter.active = true;
    hunter.kind = KIND_SHARK;
    hunter.radius = SHARK.radius;
    hunter.x = random() < 0.5 ? -60 : FIELD.width + 60;
    hunter.y = range(random, DEPTH.deep.top + 40, FIELD.height - 80);
    hunter.vx = (hunter.x < 0 ? 1 : -1) * (SHARK.speed + SHARK.speedPerLevel * (state.level - 1));
    hunter.vy = 0;
    hunter.phase = 0;
    hunter.turn = 0;
  }

  function spawnUrchin() {
    const hunter = freeHunter();
    if (hunter === null) return;
    hunter.active = true;
    hunter.kind = KIND_URCHIN;
    hunter.radius = URCHIN.radius;
    hunter.x = range(random, 60, FIELD.width - 60);
    hunter.y = FIELD.height - 34;
    hunter.vx = 0;
    hunter.vy = 0;
    hunter.phase = range(random, 0, Math.PI * 2);
  }

  function grantPowerup() {
    const kind = POWERUPS[state.powerupIndex % POWERUPS.length];
    state.powerupIndex += 1;
    if (kind === 'shield') state.shield = POWERUP_DURATION.shield;
    else if (kind === 'slow') state.slow = POWERUP_DURATION.slow;
    else state.magnet = POWERUP_DURATION.magnet;
    return kind;
  }

  function eatMote(mote) {
    mote.active = false;
    state.combo += 1;
    state.comboTimer = COMBO.window;
    state.multiplier = Math.min(1 + Math.floor(state.combo / 4), COMBO.maxMultiplier);
    let gained = 0;
    let event = EVENT_EAT;
    if (mote.kind === KIND_GOLDEN) {
      gained = GOLDEN.points * state.multiplier;
      state.goldenEaten += 1;
      event = EVENT_GOLDEN;
      burst(mote.x, mote.y, '#ffd94d', 14, 160);
    } else if (mote.kind === KIND_PEARL) {
      gained = PEARL.points * state.multiplier;
      state.pearlsEaten += 1;
      event = EVENT_PEARL;
      burst(mote.x, mote.y, '#f2f7ff', 12, 140);
      grantPowerup();
    } else {
      const deep = mote.y > DEPTH.deep.top ? PLANKTON.deepBonus : 0;
      gained = (PLANKTON.points + deep) * state.multiplier;
      state.motesEaten += 1;
      burst(mote.x, mote.y, '#7dfcd6', 8, 110);
    }
    state.score += gained;
    if (!state.won && state.score >= WIN_SCORE) {
      state.won = true;
      return event | EVENT_WIN;
    }
    return event;
  }

  function hitFish(hunter) {
    if (fish.invulnerable > 0) return 0;
    if (state.shield > 0) {
      state.shield = 0;
      fish.invulnerable = FISH.invulnerable;
      state.shake = 0.35;
      burst(fish.x, fish.y, '#6fd3ff', 18, 220);
      return EVENT_HIT;
    }
    state.lives -= 1;
    state.combo = 0;
    state.comboTimer = 0;
    state.multiplier = 1;
    fish.invulnerable = FISH.invulnerable;
    state.shake = 0.5;
    burst(fish.x, fish.y, '#ff5d73', 22, 260);
    // Knock the fish away from what hit it.
    const dx = fish.x - hunter.x;
    const dy = fish.y - hunter.y;
    const length = Math.hypot(dx, dy) || 1;
    fish.vx = (dx / length) * 420;
    fish.vy = (dy / length) * 420;
    if (state.lives <= 0) return EVENT_HIT | EVENT_OVER;
    return EVENT_HIT;
  }

  /**
   * Advance one fixed step. `steer` is the keyboard vector {x, y} in [-1, 1];
   * `pointer` is the mouse target in field coordinates, or null. `attract`
   * is true while the pointer button is held. Returns event bit flags.
   */
  function step(dt, steer, pointer, attract, idle) {
    let events = 0;
    state.elapsed += dt;
    const level = Math.min(1 + Math.floor(state.elapsed / LEVEL.seconds), LEVEL.max);
    if (level !== state.level) {
      state.level = level;
      state.banner = 2.2;
      state.bannerText = `LEVEL ${level} — the reef grows hungrier`;
      events |= EVENT_LEVEL;
    }
    if (state.banner > 0) state.banner -= dt;
    if (state.shake > 0) state.shake -= dt;
    if (fish.invulnerable > 0) fish.invulnerable -= dt;
    if (state.shield > 0) state.shield -= dt;
    if (state.slow > 0) state.slow -= dt;
    if (state.magnet > 0) state.magnet -= dt;
    if (state.comboTimer > 0) {
      state.comboTimer -= dt;
      if (state.comboTimer <= 0) {
        state.combo = 0;
        state.multiplier = 1;
      }
    }
    fish.glow += dt * FISH.glowPulse;

    // --- steering: keys accelerate, the pointer pulls, holding dashes. ---
    const accel = FISH.accel * (attract ? 1.5 : 1);
    fish.vx += steer.x * accel * dt;
    fish.vy += steer.y * accel * dt;
    if (pointer !== null) {
      const dx = pointer.x - fish.x;
      const dy = pointer.y - fish.y;
      const distance = Math.hypot(dx, dy);
      if (distance > 24) {
        const pull = (attract ? 900 : 420) * Math.min(1, distance / 240);
        fish.vx += (dx / distance) * pull * dt;
        fish.vy += (dy / distance) * pull * dt;
      }
    }
    const drag = Math.exp(-FISH.drag * dt);
    fish.vx *= drag;
    fish.vy *= drag;
    const speed = Math.hypot(fish.vx, fish.vy);
    const cap = FISH.maxSpeed * (attract ? 1.35 : 1);
    if (speed > cap) {
      fish.vx = (fish.vx / speed) * cap;
      fish.vy = (fish.vy / speed) * cap;
    }
    fish.x += fish.vx * dt;
    fish.y += fish.vy * dt;
    fish.x = Math.max(fish.radius, Math.min(FIELD.width - fish.radius, fish.x));
    fish.y = Math.max(92, Math.min(FIELD.height - fish.radius - 8, fish.y));
    if (Math.abs(fish.vx) > 12) fish.angle = Math.atan2(fish.vy, fish.vx);

    if (idle) {
      // Title screen: the reef drifts on its own, no spawning, no danger.
      driftMotes(dt, 0.5);
      driftBubbles(dt);
      stepParticles(dt);
      return 0;
    }

    const slowFactor = state.slow > 0 ? 0.55 : 1;

    // --- spawning, faster and denser as the level rises. ---
    state.planktonTimer -= dt;
    if (state.planktonTimer <= 0) {
      spawnMote(KIND_PLANKTON);
      state.planktonTimer = Math.max(PLANKTON.interval * Math.pow(PLANKTON.intervalScale, state.level - 1), PLANKTON.minInterval) * range(random, 0.7, 1.3);
    }
    state.goldenTimer -= dt;
    if (state.goldenTimer <= 0) {
      spawnMote(KIND_GOLDEN, undefined, range(random, DEPTH.deep.top + 30, FIELD.height - 100));
      state.goldenTimer = Math.max(GOLDEN.interval * Math.pow(GOLDEN.intervalScale, state.level - 1), GOLDEN.minInterval) * range(random, 0.8, 1.2);
    }
    state.pearlTimer -= dt;
    if (state.pearlTimer <= 0) {
      spawnMote(KIND_PEARL);
      state.pearlTimer = Math.max(PEARL.interval * Math.pow(PEARL.intervalScale, state.level - 1), PEARL.minInterval) * range(random, 0.8, 1.2);
    }
    state.eelTimer -= dt;
    if (state.eelTimer <= 0) {
      spawnEel();
      state.eelTimer = Math.max(EEL.interval * Math.pow(EEL.intervalScale, state.level - 1), EEL.minInterval) * range(random, 0.8, 1.2);
    }
    if (state.level >= SHARK.firstLevel) {
      state.sharkTimer -= dt;
      if (state.sharkTimer <= 0) {
        spawnShark();
        state.sharkTimer = Math.max(SHARK.interval * Math.pow(SHARK.intervalScale, state.level - 1), SHARK.minInterval) * range(random, 0.8, 1.2);
      }
    }
    state.urchinTimer -= dt;
    if (state.urchinTimer <= 0) {
      spawnUrchin();
      state.urchinTimer = Math.max(URCHIN.interval * Math.pow(URCHIN.intervalScale, state.level - 1), URCHIN.minInterval) * range(random, 0.8, 1.2);
    }
    state.bubbleTimer -= dt;
    if (state.bubbleTimer <= 0) {
      const bubble = bubbles.find((item) => !item.active);
      if (bubble !== undefined) {
        bubble.active = true;
        bubble.x = range(random, 20, FIELD.width - 20);
        bubble.y = FIELD.height - 10;
        bubble.radius = range(random, 2, 6);
        bubble.speed = range(random, 24, 60);
      }
      state.bubbleTimer = range(random, 0.15, 0.5);
    }

    driftMotes(dt, 1);
    driftBubbles(dt);
    stepParticles(dt);

    // --- predators move, hunt, and leave when they cross the reef. ---
    for (const hunter of hunters) {
      if (!hunter.active) continue;
      if (hunter.kind === KIND_EEL) {
        hunter.phase += dt * 3;
        const hunt = state.slow > 0 ? 0 : 1;
        const dx = fish.x - hunter.x;
        const dy = fish.y - hunter.y;
        const distance = Math.hypot(dx, dy);
        if (distance < 210 && distance > 1) {
          hunter.vx += (dx / distance) * 180 * hunt * dt;
          hunter.vy += (dy / distance) * 120 * hunt * dt;
        }
        hunter.vy += Math.sin(hunter.phase) * 90 * dt;
        hunter.vx *= Math.exp(-0.6 * dt);
        hunter.vy *= Math.exp(-0.6 * dt);
        const hSpeed = Math.hypot(hunter.vx, hunter.vy);
        const hCap = (EEL.speed + EEL.speedPerLevel * (state.level - 1)) * slowFactor;
        if (hSpeed > hCap) {
          hunter.vx = (hunter.vx / hSpeed) * hCap;
          hunter.vy = (hunter.vy / hSpeed) * hCap;
        }
        hunter.x += hunter.vx * dt;
        hunter.y += hunter.vy * dt;
        if (hunter.x < -60 || hunter.x > FIELD.width + 60) hunter.active = false;
      } else if (hunter.kind === KIND_SHARK) {
        hunter.x += hunter.vx * slowFactor * dt;
        hunter.phase += dt;
        hunter.y += Math.sin(hunter.phase * 2) * 24 * dt;
        const dx = fish.x - hunter.x;
        const dy = fish.y - hunter.y;
        const distance = Math.hypot(dx, dy);
        if (distance < 200 && fish.y > DEPTH.deep.top) {
          hunter.vy += (dy / (distance || 1)) * 200 * dt;
        }
        if (hunter.x < -90 || hunter.x > FIELD.width + 90) hunter.active = false;
      } else {
        // Urchins sit still on the floor; they fade after a while.
        hunter.phase += dt;
        if (hunter.phase > 14) hunter.active = false;
      }
    }

    // --- magnet pulls nearby food toward the fish. ---
    if (state.magnet > 0) {
      for (const mote of motes) {
        if (!mote.active) continue;
        const dx = fish.x - mote.x;
        const dy = fish.y - mote.y;
        const distance = Math.hypot(dx, dy);
        if (distance < 220 && distance > 1) {
          mote.x += (dx / distance) * 260 * dt;
          mote.y += (dy / distance) * 260 * dt;
        }
      }
    }

    // --- collisions: food first, then predators. ---
    for (const mote of motes) {
      if (!mote.active) continue;
      if (overlaps(fish, mote)) events |= eatMote(mote);
    }
    if (fish.invulnerable <= 0) {
      for (const hunter of hunters) {
        if (!hunter.active) continue;
        if (overlaps(fish, hunter)) {
          events |= hitFish(hunter);
          if (events & EVENT_OVER) break;
        }
      }
    }
    return events;
  }

  function driftMotes(dt, rate) {
    for (const mote of motes) {
      if (!mote.active) continue;
      mote.life += dt;
      mote.phase += dt * 2;
      mote.y += PLANKTON.drift * rate * dt;
      mote.x += Math.sin(mote.phase) * 18 * dt;
      if (mote.y > FIELD.height + 30 || mote.life > 26) mote.active = false;
    }
  }

  function driftBubbles(dt) {
    for (const bubble of bubbles) {
      if (!bubble.active) continue;
      bubble.y -= bubble.speed * dt;
      bubble.x += Math.sin(bubble.y * 0.02) * 8 * dt;
      if (bubble.y < -10) bubble.active = false;
    }
  }

  function stepParticles(dt) {
    for (const particle of particles) {
      if (!particle.active) continue;
      particle.life -= dt;
      if (particle.life <= 0) {
        particle.active = false;
        continue;
      }
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vx *= Math.exp(-2 * dt);
      particle.vy *= Math.exp(-2 * dt);
    }
  }

  return { state, reset, step, STEP };
}
