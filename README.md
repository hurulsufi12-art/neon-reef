# Neon Reef

[![best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01)
[![rank](https://make.fun/badge/best-game-01/hurulsufi12-art/neon-reef/rank.svg)](https://make.fun/bounty/best-game-01)
[![reward](https://make.fun/badge/best-game-01/hurulsufi12-art/neon-reef/reward.svg)](https://make.fun/bounty/best-game-01)

> **Before submitting:** replace `OWNER` and `REPO` in the rank and reward badge URLs above with this repository's GitHub owner and repo name, and set this repo's GitHub About website to https://make.fun with the topic `makefun`.

**Neon Reef** is a complete, original top-down arcade game for the
[make.fun](https://make.fun) `best-game-01` bounty ("Make the best game").
Pilot a lanternfish through a glowing reef: eat plankton, chain combos,
dive deep for golden plankton and pearls, dodge eels, sharks and urchins,
and reach **7,500 points to restore the reef** — or lose all 3 lives trying.

## How to play

- **WASD / arrow keys** to swim, **mouse** to steer, **hold click** to dash
- Eat glowing plankton (+10, +5 more in the deep trench). Eat within 4 seconds
  of the last mote to raise the combo multiplier, up to **x8**
- **Golden plankton** (+50) only drifts in the deep trench — more food, more predators
- **Pearls** (+25) grant a power-up, cycling shield → slow-time → magnet
- Dodge **eels** (they hunt you), **sharks** (from level 3, patrolling the deep),
  and **urchins** (spiked, sitting on the reef floor)
- Levels get faster and denser every 18 seconds. **P** pause, **M** mute, **R** restart

## Run it

```bash
node serve.ts   # game/ on http://localhost:8080 — open in desktop Chrome
```

No build step, no network requests, no external assets: all art is drawn on
canvas and all sound is synthesized with WebAudio.

## Files

- `main.ts` — the hand-in program: copies `game/` and `screenshots/` to
  `/output` and writes `dossier.json` (`MAKEFUN_OUTPUT_DIR=out node main.ts`)
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged
- `game/index.html` + `game/src/` — the game: `config.js` (tuning),
  `random.js` (seeded RNG), `audio.js` (WebAudio synth), `input.js`
  (keyboard + mouse), `world.js` (rules and simulation), `render.js`
  (canvas drawing and screens), `shots.js` (screenshot scenes), `main.js` (loop)
- `screenshots/` — 4 real renders: title, play, action, game over
- `shots.json` — the `?shot=` scenes the screenshots were taken from

## License

MIT — see [LICENSE](LICENSE).
