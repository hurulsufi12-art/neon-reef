// The screenshot scenes behind ?shot=start|play|action|end. Each one plays the
// real rules forward from a fresh world for a fixed number of steps, steered
// by a simple autopilot (chase the nearest food, keep clear of predators), so
// the frame is what a short game really looks like and the same seed always
// gives the same frame.
import { FIELD, STEP } from './config.js';
import { EVENT_OVER, KIND_EEL, KIND_SHARK } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 4;
const PLAY_SECONDS = 22;
const ACTION_SECONDS = 34;
const END_LIMIT_SECONDS = 600;
/** How far ahead, in seconds, the autopilot checks each way it could move. */
const HORIZON_PLAY = 0.8;
const HORIZON_ACTION = 0.6;
const HORIZON_END = 0.22;

/** Seconds until swimming in `direction` runs the fish into a predator. Predators are extrapolated along their velocity, so the check sees them coming. */
function timeToHit(state, direction, horizon) {
  const fish = state.fish;
  for (let t = 1 / 30; t <= horizon; t += 1 / 30) {
    const x = Math.min(FIELD.width - fish.radius, Math.max(fish.radius, fish.x + direction.x * 340 * t));
    const y = Math.min(FIELD.height - fish.radius, Math.max(92, fish.y + direction.y * 340 * t));
    for (const hunter of state.hunters) {
      if (!hunter.active) continue;
      const reach = fish.radius + hunter.radius + 8;
      const dx = hunter.x + hunter.vx * t - x;
      const dy = hunter.y + hunter.vy * t - y;
      if (dx * dx + dy * dy < reach * reach) return t;
    }
  }
  return Infinity;
}

/** Steer toward the nearest food when it is safe; otherwise dodge. A reckless pilot chases food blindly, straight into predators. */
function autopilot(state, horizon, reckless) {
  const fish = state.fish;
  let food = null;
  let foodDistance = Infinity;
  for (const mote of state.motes) {
    if (!mote.active) continue;
    const distance = Math.hypot(mote.x - fish.x, mote.y - fish.y);
    if (distance < foodDistance) {
      foodDistance = distance;
      food = mote;
    }
  }
  let direction = { x: 0, y: 0 };
  if (food !== null) {
    const dx = food.x - fish.x;
    const dy = food.y - fish.y;
    const length = Math.hypot(dx, dy) || 1;
    direction = { x: dx / length, y: dy / length };
  }
  if (reckless) return direction;
  // If the chosen way is hit soon, try the eight compass ways and keep the safest.
  if (timeToHit(state, direction, horizon) < horizon) {
    let best = { x: 0, y: 0 };
    let bestTime = -1;
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
      const candidate = { x: Math.cos(angle), y: Math.sin(angle) };
      const time = timeToHit(state, candidate, horizon);
      if (time > bestTime) {
        bestTime = time;
        best = candidate;
      }
    }
    direction = best;
  }
  return direction;
}

function simulate(world, seconds, horizon, reckless) {
  for (let index = 0; index < seconds / STEP; index += 1) {
    const events = world.step(STEP, autopilot(world.state, horizon, reckless), null, false, false);
    if (events & EVENT_OVER) break;
  }
}

/**
 * Set `world` to the named scene (start, play, action or end; any other name
 * is start) and return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  world.reset();
  if (name === 'play') {
    simulate(world, PLAY_SECONDS, HORIZON_PLAY);
    return { screen: world.state.lives === 0 ? SCREEN_OVER : SCREEN_PLAY, best: world.state.score };
  }
  if (name === 'action') {
    simulate(world, ACTION_SECONDS, HORIZON_ACTION);
    return { screen: world.state.lives === 0 ? SCREEN_OVER : SCREEN_PLAY, best: world.state.score };
  }
  if (name === 'end') {
    simulate(world, END_LIMIT_SECONDS, HORIZON_END, true);
    return { screen: SCREEN_OVER, best: world.state.score };
  }
  for (let index = 0; index < START_SECONDS / STEP; index += 1) {
    world.step(STEP, { x: 0, y: 0 }, null, false, true);
  }
  // Park the fish where the title panel does not cover it, so the cover shows the hero.
  world.state.fish.x = 200;
  world.state.fish.y = 612;
  return { screen: SCREEN_TITLE, best: 0 };
}

// Re-exported so the dossier outline names the predator kinds the autopilot dodges.
export const DODGED_KINDS = [KIND_EEL, KIND_SHARK];
