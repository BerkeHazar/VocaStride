let ctx: AudioContext | null = null;
let enabled = true;
let haptics = true;

export function setSoundEnabled(on: boolean) {
  enabled = on;
}

export function setHapticsEnabled(on: boolean) {
  haptics = on;
}

function ac(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function tone(freqs: number[], dur: number, type: OscillatorType = 'sine', vol = 0.05) {
  if (!enabled) return;
  const c = ac();
  if (!c) return;
  const t0 = c.currentTime;
  freqs.forEach((f, i) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f, t0 + i * 0.06);
    gain.gain.setValueAtTime(0.0001, t0 + i * 0.06);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + i * 0.06 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + i * 0.06 + dur);
    osc.connect(gain).connect(c.destination);
    osc.start(t0 + i * 0.06);
    osc.stop(t0 + i * 0.06 + dur + 0.02);
  });
}

export type Sfx = 'tap' | 'ok' | 'bad' | 'match' | 'level' | 'win' | 'flip';

export function sfx(name: Sfx) {
  if (!enabled) return;
  switch (name) {
    case 'tap':
      tone([520], 0.05, 'sine', 0.025);
      break;
    case 'flip':
      tone([340, 440], 0.07, 'triangle', 0.03);
      break;
    case 'ok':
      tone([660, 880], 0.1, 'sine', 0.045);
      break;
    case 'bad':
      tone([180, 140], 0.16, 'sawtooth', 0.03);
      break;
    case 'match':
      tone([720, 960, 1200], 0.09, 'triangle', 0.035);
      break;
    case 'level':
      tone([523, 659, 784, 1047], 0.16, 'sine', 0.05);
      break;
    case 'win':
      tone([523, 659, 784, 1047, 1319], 0.22, 'triangle', 0.05);
      break;
  }
}

export function buzz(pattern: number | number[]) {
  if (!haptics) return;
  if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    /* yok say */
  }
}
