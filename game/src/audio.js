// All sound is synthesized with WebAudio: no audio files, no network, nothing
// to load. Short oscillators and filtered noise make the plucks, chimes and
// thuds; a quiet two-note tide loops underneath while playing.
export function createAudio() {
  let context = null;
  let master = null;
  let muted = false;
  let tideTimer = null;

  function ensure() {
    if (context !== null) return true;
    try {
      const AudioContext = window.AudioContext ?? window.webkitAudioContext;
      if (AudioContext === undefined) return false;
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = 0.5;
      master.connect(context.destination);
    } catch {
      return false;
    }
    return context !== null;
  }

  function tone(frequency, duration, type, volume, slideTo) {
    if (!ensure() || muted) return;
    if (context.state === 'suspended') void context.resume();
    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    if (slideTo !== undefined) oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), now + duration);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    oscillator.connect(gain);
    gain.connect(master);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
  }

  function noise(duration, volume, filterFrequency) {
    if (!ensure() || muted) return;
    if (context.state === 'suspended') void context.resume();
    const now = context.currentTime;
    const length = Math.max(1, Math.floor(context.sampleRate * duration));
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = context.createBufferSource();
    source.buffer = buffer;
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFrequency;
    const gain = context.createGain();
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start(now);
  }

  return {
    /** Call once from a user gesture so the browser allows audio. */
    unlock() {
      if (ensure() && context.state === 'suspended') void context.resume();
    },
    toggleMute() {
      muted = !muted;
      if (master !== null) master.gain.value = muted ? 0 : 0.5;
      return muted;
    },
    isMuted() {
      return muted;
    },
    eat(combo) {
      const step = Math.min(combo, 8);
      tone(520 + step * 60, 0.12, 'sine', 0.25, 780 + step * 60);
    },
    golden() {
      tone(880, 0.16, 'triangle', 0.3, 1320);
      setTimeout(() => tone(1320, 0.2, 'triangle', 0.25, 1760), 70);
    },
    pearl() {
      tone(660, 0.14, 'sine', 0.28, 990);
      setTimeout(() => tone(990, 0.18, 'sine', 0.22, 1320), 80);
    },
    powerup() {
      tone(440, 0.12, 'triangle', 0.25, 660);
      setTimeout(() => tone(660, 0.12, 'triangle', 0.25, 880), 90);
      setTimeout(() => tone(880, 0.2, 'triangle', 0.25, 1320), 180);
    },
    hit() {
      noise(0.25, 0.4, 500);
      tone(160, 0.3, 'sawtooth', 0.2, 60);
    },
    levelUp() {
      tone(523, 0.12, 'triangle', 0.25);
      setTimeout(() => tone(659, 0.12, 'triangle', 0.25), 100);
      setTimeout(() => tone(784, 0.2, 'triangle', 0.28), 200);
    },
    gameOver() {
      tone(392, 0.25, 'triangle', 0.25, 370);
      setTimeout(() => tone(330, 0.25, 'triangle', 0.25, 311), 220);
      setTimeout(() => tone(262, 0.45, 'triangle', 0.28, 196), 440);
    },
    startTide() {
      if (tideTimer !== null || !ensure()) return;
      tideTimer = setInterval(() => {
        if (!muted) tone(196, 1.6, 'sine', 0.04, 220);
      }, 3200);
    },
    stopTide() {
      if (tideTimer !== null) {
        clearInterval(tideTimer);
        tideTimer = null;
      }
    },
  };
}
