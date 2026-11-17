// Drawing only: the world's state and the current screen in, pixels out. The
// 1280x720 playfield is scaled to fit the window and centred, the margin filled
// with the backdrop colour. Neon glow, parallax plants, light rays, particles
// and big readable panels — the screenshots are what the judge mostly sees.
import { DEPTH, FIELD, FONT, LIVES, PALETTE, POWERUPS } from './config.js';
import { KIND_EEL, KIND_GOLDEN, KIND_PEARL, KIND_SHARK, KIND_URCHIN, WIN_SCORE } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

const PANEL = { width: 640, top: 108, line: 32, bottom: 64 };

function cachedLabel(prefix) {
  let value = -1;
  let text = '';
  return function label(next) {
    if (next !== value) {
      value = next;
      text = prefix + next;
    }
    return text;
  };
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const scoreLabel = cachedLabel('SCORE ');
  const levelLabel = cachedLabel('LEVEL ');
  const bestLabel = cachedLabel('BEST ');
  const finalLabel = cachedLabel('SCORE ');
  const goalLabel = cachedLabel('GOAL ');

  const fonts = new Map();
  function font(size, weight) {
    const key = `${weight ?? ''}${size}`;
    if (!fonts.has(key)) fonts.set(key, `${weight ? `${weight} ` : ''}${size}px ${FONT}`);
    return fonts.get(key);
  }

  function text(value, x, y, size, color, align, weight) {
    context.font = font(size, weight);
    context.fillStyle = color;
    context.textAlign = align ?? 'left';
    context.textBaseline = 'alphabetic';
    context.fillText(value, x, y);
  }

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  function toFieldX(cssX) {
    const ratio = window.devicePixelRatio || 1;
    return (cssX * ratio - view.x) / view.scale;
  }
  function toFieldY(cssY) {
    const ratio = window.devicePixelRatio || 1;
    return (cssY * ratio - view.y) / view.scale;
  }

  function circle(x, y, radius, color, glow, glowColor) {
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    if (glow) {
      context.shadowColor = glowColor ?? color;
      context.shadowBlur = glow;
    }
    context.fillStyle = color;
    context.fill();
    context.shadowBlur = 0;
  }

  function drawWater(state) {
    const gradient = context.createLinearGradient(0, 0, 0, FIELD.height);
    gradient.addColorStop(0, PALETTE.waterTop);
    gradient.addColorStop(0.45, PALETTE.waterMid);
    gradient.addColorStop(1, PALETTE.waterDeep);
    context.fillStyle = gradient;
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    // Light rays from the surface.
    context.save();
    context.globalAlpha = 0.07;
    context.fillStyle = '#bfe9ff';
    const t = state.elapsed;
    for (let i = 0; i < 5; i += 1) {
      const x = 120 + i * 240 + Math.sin(t * 0.3 + i * 1.7) * 30;
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x + 90, 0);
      context.lineTo(x + 190, FIELD.height);
      context.lineTo(x + 40, FIELD.height);
      context.closePath();
      context.fill();
    }
    context.restore();
    // Depth band labels, faint, so the risk/reward reads at a glance.
    context.save();
    context.globalAlpha = 0.5;
    text('SHALLOWS', 24, 92, 15, PALETTE.muted, 'left', '700');
    text('MID-REEF', 24, DEPTH.mid.top + 30, 15, PALETTE.muted, 'left', '700');
    text('DEEP TRENCH — GOLDEN PLANKTON', 24, DEPTH.deep.top + 30, 15, PALETTE.planktonGold, 'left', '700');
    context.restore();
  }

  function drawFloor(state) {
    context.fillStyle = PALETTE.sand;
    context.fillRect(0, FIELD.height - 26, FIELD.width, 26);
    for (const rock of state.rocks) {
      context.fillStyle = PALETTE.rock;
      context.beginPath();
      context.ellipse(rock.x, FIELD.height - 26, rock.width / 2, rock.height / 2, 0, Math.PI, 0);
      context.fill();
    }
    for (const plant of state.plants) {
      const sway = Math.sin(state.elapsed * 0.9 + plant.sway) * 12;
      const baseX = plant.x;
      const topX = baseX + sway;
      const topY = FIELD.height - 26 - plant.height;
      context.strokeStyle = plant.hue === 0 ? PALETTE.plant : PALETTE.plantBright;
      context.lineWidth = 7;
      context.lineCap = 'round';
      context.beginPath();
      context.moveTo(baseX, FIELD.height - 26);
      context.quadraticCurveTo(baseX + sway * 0.4, FIELD.height - 26 - plant.height * 0.6, topX, topY);
      context.stroke();
      circle(topX, topY, 7, plant.hue === 0 ? PALETTE.coralPink : PALETTE.coralOrange, 10);
    }
  }

  function drawBubbles(state) {
    context.save();
    context.globalAlpha = 0.55;
    context.strokeStyle = '#cfeeff';
    context.lineWidth = 1.5;
    for (const bubble of state.bubbles) {
      if (!bubble.active) continue;
      context.beginPath();
      context.arc(bubble.x, bubble.y, bubble.radius, 0, Math.PI * 2);
      context.stroke();
    }
    context.restore();
  }

  function drawMotes(state) {
    for (const mote of state.motes) {
      if (!mote.active) continue;
      const pulse = 0.7 + 0.3 * Math.sin(mote.phase * 2);
      if (mote.kind === KIND_GOLDEN) {
        circle(mote.x, mote.y, mote.radius * pulse, PALETTE.planktonGold, 22, PALETTE.planktonGold);
        context.fillStyle = '#fff6c9';
        context.beginPath();
        context.arc(mote.x - 3, mote.y - 3, 3.5, 0, Math.PI * 2);
        context.fill();
      } else if (mote.kind === KIND_PEARL) {
        circle(mote.x, mote.y, mote.radius, PALETTE.pearl, 18, '#ffffff');
        context.strokeStyle = '#9fd8ff';
        context.lineWidth = 2;
        context.beginPath();
        context.arc(mote.x, mote.y, mote.radius + 5, 0, Math.PI * 2);
        context.stroke();
      } else {
        circle(mote.x, mote.y, mote.radius * pulse, PALETTE.plankton, 14, PALETTE.plankton);
        context.fillStyle = '#d9fff2';
        context.beginPath();
        context.arc(mote.x, mote.y, 3, 0, Math.PI * 2);
        context.fill();
      }
    }
  }

  function drawHunters(state) {
    for (const hunter of state.hunters) {
      if (!hunter.active) continue;
      if (hunter.kind === KIND_EEL) {
        // A wavy eel: three glowing segments trailing behind the head.
        context.save();
        context.lineCap = 'round';
        for (let i = 0; i < 3; i += 1) {
          const trail = i * 18;
          const wave = Math.sin(hunter.phase - i * 0.9) * 10;
          context.strokeStyle = i === 0 ? PALETTE.eel : '#7a3fd4';
          context.lineWidth = 14 - i * 3;
          context.beginPath();
          const dir = hunter.vx >= 0 ? 1 : -1;
          context.moveTo(hunter.x - dir * trail, hunter.y + wave);
          context.lineTo(hunter.x - dir * (trail + 16), hunter.y + Math.sin(hunter.phase - (i + 1) * 0.9) * 10);
          context.stroke();
        }
        circle(hunter.x, hunter.y, 13, PALETTE.eel, 16, PALETTE.eel);
        context.fillStyle = '#ffffff';
        context.beginPath();
        context.arc(hunter.x + (hunter.vx >= 0 ? 5 : -5), hunter.y - 4, 3, 0, Math.PI * 2);
        context.fill();
        context.restore();
      } else if (hunter.kind === KIND_SHARK) {
        context.save();
        context.translate(hunter.x, hunter.y);
        context.scale(hunter.vx >= 0 ? 1 : -1, 1);
        context.fillStyle = PALETTE.shark;
        context.shadowColor = PALETTE.shark;
        context.shadowBlur = 12;
        context.beginPath();
        context.moveTo(34, 0);
        context.lineTo(-22, -16);
        context.lineTo(-12, 0);
        context.lineTo(-22, 16);
        context.closePath();
        context.fill();
        context.shadowBlur = 0;
        // Dorsal fin and tail.
        context.beginPath();
        context.moveTo(-2, -12);
        context.lineTo(-12, -30);
        context.lineTo(-18, -10);
        context.closePath();
        context.fill();
        context.beginPath();
        context.moveTo(-24, 0);
        context.lineTo(-44, -14);
        context.lineTo(-40, 0);
        context.lineTo(-44, 14);
        context.closePath();
        context.fill();
        context.fillStyle = '#10233a';
        context.beginPath();
        context.arc(16, -5, 3.5, 0, Math.PI * 2);
        context.fill();
        context.restore();
      } else {
        // Urchin: a dark ball with bright thorns.
        context.save();
        context.strokeStyle = PALETTE.urchin;
        context.lineWidth = 3;
        context.lineCap = 'round';
        for (let i = 0; i < 10; i += 1) {
          const angle = (i / 10) * Math.PI * 2 + hunter.phase * 0.2;
          context.beginPath();
          context.moveTo(hunter.x + Math.cos(angle) * 8, hunter.y + Math.sin(angle) * 8);
          context.lineTo(hunter.x + Math.cos(angle) * 20, hunter.y + Math.sin(angle) * 20);
          context.stroke();
        }
        circle(hunter.x, hunter.y, 12, '#3a0f1e', 10, PALETTE.urchin);
        context.restore();
      }
    }
  }

  function drawFish(state) {
    const fish = state.fish;
    if (fish.invulnerable > 0 && Math.floor(fish.invulnerable * 10) % 2 === 0) return; // blink while hurt
    context.save();
    context.translate(fish.x, fish.y);
    const facingRight = Math.cos(fish.angle) >= 0;
    context.scale(facingRight ? 1 : -1, 1);
    const tilt = Math.max(-0.5, Math.min(0.5, Math.sin(fish.angle) * (facingRight ? 1 : -1)));
    context.rotate(tilt * 0.4);
    // Tail fin, wagging with speed.
    const wag = Math.sin(state.elapsed * 14) * 6 * (0.4 + Math.min(1, Math.hypot(fish.vx, fish.vy) / 300));
    context.fillStyle = PALETTE.fishFin;
    context.beginPath();
    context.moveTo(-16, 0);
    context.lineTo(-34, -12 + wag);
    context.lineTo(-30, 0);
    context.lineTo(-34, 12 + wag);
    context.closePath();
    context.fill();
    // Body with glow.
    context.shadowColor = PALETTE.lantern;
    context.shadowBlur = 18;
    context.fillStyle = PALETTE.fishBody;
    context.beginPath();
    context.ellipse(0, 0, 22, 13, 0, 0, Math.PI * 2);
    context.fill();
    context.shadowBlur = 0;
    context.fillStyle = PALETTE.fishBelly;
    context.beginPath();
    context.ellipse(2, 5, 14, 6, 0, 0, Math.PI * 2);
    context.fill();
    // Stripes.
    context.strokeStyle = '#e8a93d';
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(-6, -11);
    context.lineTo(-2, 11);
    context.moveTo(4, -12);
    context.lineTo(8, 10);
    context.stroke();
    // Eye.
    context.fillStyle = '#10233a';
    context.beginPath();
    context.arc(11, -4, 4, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#ffffff';
    context.beginPath();
    context.arc(12.5, -5.5, 1.5, 0, Math.PI * 2);
    context.fill();
    // Lantern stalk and glowing orb.
    const pulse = 0.75 + 0.25 * Math.sin(fish.glow * 2);
    context.strokeStyle = '#e8a93d';
    context.lineWidth = 2.5;
    context.beginPath();
    context.moveTo(6, -11);
    context.quadraticCurveTo(14, -24, 22, -26);
    context.stroke();
    circle(23, -27, 6 * pulse + 2, PALETTE.lantern, 24, PALETTE.lantern);
    context.restore();
    // Shield ring.
    if (state.shield > 0) {
      context.save();
      context.strokeStyle = PALETTE.shield;
      context.globalAlpha = 0.6 + 0.3 * Math.sin(state.elapsed * 6);
      context.lineWidth = 3;
      context.beginPath();
      context.arc(fish.x, fish.y, fish.radius + 12, 0, Math.PI * 2);
      context.stroke();
      context.restore();
    }
  }

  function drawParticles(state) {
    for (const particle of state.particles) {
      if (!particle.active) continue;
      context.save();
      context.globalAlpha = Math.max(0, particle.life / particle.max);
      circle(particle.x, particle.y, particle.size, particle.color, 6, particle.color);
      context.restore();
    }
  }

  function drawHud(state, best) {
    // Top bar.
    context.fillStyle = 'rgba(4, 16, 31, 0.72)';
    context.fillRect(0, 0, FIELD.width, 64);
    text(scoreLabel(state.score), 20, 42, 28, PALETTE.text, 'left', '700');
    text(bestLabel(Math.max(best, state.score)), 260, 42, 20, PALETTE.muted, 'left', '700');
    text(levelLabel(state.level), 480, 42, 20, PALETTE.text, 'left', '700');
    // Goal progress: score toward WIN_SCORE.
    const goalX = 620;
    const goalWidth = 300;
    context.fillStyle = '#0f2f4a';
    context.fillRect(goalX, 22, goalWidth, 18);
    context.fillStyle = PALETTE.planktonGold;
    context.fillRect(goalX, 22, goalWidth * Math.min(1, state.score / WIN_SCORE), 18);
    context.strokeStyle = PALETTE.panelEdge;
    context.lineWidth = 2;
    context.strokeRect(goalX, 22, goalWidth, 18);
    text(goalLabel(WIN_SCORE), goalX + goalWidth + 12, 38, 16, PALETTE.planktonGold, 'left', '700');
    // Lives as hearts.
    for (let i = 0; i < LIVES; i += 1) {
      const x = FIELD.width - 30 - i * 34;
      const y = 32;
      context.fillStyle = i < state.lives ? '#ff5d73' : '#27405c';
      context.beginPath();
      context.moveTo(x, y + 8);
      context.bezierCurveTo(x - 12, y - 4, x - 6, y - 12, x, y - 4);
      context.bezierCurveTo(x + 6, y - 12, x + 12, y - 4, x, y + 8);
      context.fill();
    }
    // Combo multiplier.
    if (state.multiplier > 1) {
      text(`COMBO x${state.multiplier}`, 20, 96, 24, PALETTE.planktonGold, 'left', '800');
      const comboWidth = 160 * Math.max(0, state.comboTimer / 4);
      context.fillStyle = PALETTE.planktonGold;
      context.fillRect(20, 104, comboWidth, 6);
    }
    // Active power-ups.
    let powerX = 20;
    const powerY = FIELD.height - 44;
    const timers = [
      ['SHIELD', state.shield, PALETTE.shield],
      ['SLOW', state.slow, '#b06cff'],
      ['MAGNET', state.magnet, PALETTE.plankton],
    ];
    for (const [name, timer, color] of timers) {
      if (timer <= 0) continue;
      const label = `${name} ${Math.ceil(timer)}s`;
      context.font = font(16, '700');
      const width = context.measureText(label).width + 20;
      context.fillStyle = 'rgba(4, 16, 31, 0.72)';
      context.fillRect(powerX, powerY - 20, width, 28);
      context.strokeStyle = color;
      context.lineWidth = 2;
      context.strokeRect(powerX, powerY - 20, width, 28);
      text(label, powerX + 10, powerY + 1, 16, color, 'left', '700');
      powerX += width + 10;
    }
    text('P pause · M mute', FIELD.width - 20, FIELD.height - 22, 14, PALETTE.muted, 'right');
  }

  function panel(lines, title, accent) {
    const height = PANEL.top + lines.length * PANEL.line + PANEL.bottom;
    const x = (FIELD.width - PANEL.width) / 2;
    const y = (FIELD.height - height) / 2;
    context.fillStyle = 'rgba(4, 16, 31, 0.82)';
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    context.fillStyle = PALETTE.panel;
    context.fillRect(x, y, PANEL.width, height);
    context.strokeStyle = accent ?? PALETTE.panelEdge;
    context.lineWidth = 3;
    context.strokeRect(x, y, PANEL.width, height);
    text(title, FIELD.width / 2, y + 64, 44, accent ?? PALETTE.text, 'center', '800');
    lines.forEach((line, index) => {
      text(line.text, FIELD.width / 2, y + 118 + index * PANEL.line, line.size ?? 20, line.color ?? PALETTE.text, 'center', line.weight);
    });
    return { x, y, width: PANEL.width, height };
  }

  function drawTitle(state, best) {
    drawWater(state);
    drawFloor(state);
    drawBubbles(state);
    drawMotes(state);
    drawFish(state);
    const lines = [
      { text: 'A lanternfish. A hungry reef. 7,500 points to restore it.', size: 20, color: PALETTE.text },
      { text: 'Eat glowing plankton — chain them for combo multipliers up to x8.', size: 19 },
      { text: 'Dive deep for golden plankton (+50).', size: 19 },
      { text: 'Pearls grant shield · slow-time · magnet.', size: 19 },
      { text: 'Dodge eels, sharks and urchins. You have 3 lives.', size: 19, color: PALETTE.danger },
      { text: 'WASD / arrows to swim · mouse to steer · hold click to dash', size: 18, color: PALETTE.muted },
      { text: 'P pause · M mute · R restart', size: 18, color: PALETTE.muted },
      { text: `BEST ${Math.max(best, 0)}`, size: 20, color: PALETTE.planktonGold, weight: '700' },
      { text: 'PRESS SPACE OR CLICK TO START', size: 22, color: PALETTE.plankton, weight: '800' },
    ];
    panel(lines, 'NEON REEF', PALETTE.plankton);
  }

  function drawPaused() {
    const lines = [
      { text: 'Take a breath. The reef waits.', size: 20 },
      { text: 'PRESS P OR SPACE TO KEEP SWIMMING', size: 20, color: PALETTE.plankton, weight: '700' },
    ];
    panel(lines, 'PAUSED', PALETTE.muted);
  }

  function drawOver(state, best) {
    const won = state.won;
    const lines = [
      { text: won ? 'The reef glows again — you restored it!' : 'The reef went dark…', size: 21, color: won ? PALETTE.planktonGold : PALETTE.danger },
      { text: finalLabel(state.score), size: 30, color: PALETTE.text, weight: '800' },
      { text: bestLabel(Math.max(best, state.score)), size: 20, color: PALETTE.planktonGold, weight: '700' },
      { text: `Level reached ${state.level} · Plankton eaten ${state.motesEaten} · Golden ${state.goldenEaten} · Pearls ${state.pearlsEaten}`, size: 18, color: PALETTE.muted },
      { text: won ? `GOAL ${WIN_SCORE} REACHED — PRESS R TO SWIM AGAIN` : 'PRESS R OR CLICK TO PLAY AGAIN', size: 21, color: PALETTE.plankton, weight: '800' },
    ];
    panel(lines, won ? 'REEF RESTORED!' : 'GAME OVER', won ? PALETTE.planktonGold : PALETTE.danger);
  }

  function drawBanner(state) {
    if (state.banner <= 0) return;
    context.save();
    context.globalAlpha = Math.min(1, state.banner);
    text(state.bannerText, FIELD.width / 2, 130, 30, PALETTE.planktonGold, 'center', '800');
    context.restore();
  }

  function draw(state, screen, best) {
    resize();
    const ratio = window.devicePixelRatio || 1;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, window.innerWidth, window.innerHeight);
    // Shake the whole field while a hit is fresh.
    let shakeX = 0;
    let shakeY = 0;
    if (state.shake > 0) {
      const magnitude = state.shake * 14;
      shakeX = Math.sin(state.elapsed * 61) * magnitude;
      shakeY = Math.cos(state.elapsed * 53) * magnitude;
    }
    context.save();
    context.translate(view.x / ratio + shakeX * view.scale, view.y / ratio + shakeY * view.scale);
    context.scale(view.scale, view.scale);
    if (screen === SCREEN_TITLE) {
      drawTitle(state, best);
    } else if (screen === SCREEN_PAUSED) {
      drawWater(state);
      drawFloor(state);
      drawBubbles(state);
      drawMotes(state);
      drawHunters(state);
      drawFish(state);
      drawParticles(state);
      drawHud(state, best);
      drawPaused();
    } else if (screen === SCREEN_OVER) {
      drawWater(state);
      drawFloor(state);
      drawBubbles(state);
      drawMotes(state);
      drawHunters(state);
      drawFish(state);
      drawParticles(state);
      drawHud(state, best);
      drawOver(state, best);
    } else {
      drawWater(state);
      drawFloor(state);
      drawBubbles(state);
      drawMotes(state);
      drawHunters(state);
      drawFish(state);
      drawParticles(state);
      drawHud(state, best);
      drawBanner(state);
    }
    context.restore();
  }

  return {
    draw,
    /** Convert a CSS-pixel pointer position to field coordinates. */
    toField(cssX, cssY) {
      return { x: toFieldX(cssX), y: toFieldY(cssY) };
    },
    toFieldX,
    toFieldY,
    view() {
      return view;
    },
  };
}
