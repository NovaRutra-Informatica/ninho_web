// A short, quiet cue shared by explicit navigation actions. Saves stay silent.
export const NAVIGATION_SOUND = { frequency: 720, duration: 0.07, throttle: 0.14, amplitude: 0.024 } as const;

export function createNavigationSound(makeContext: () => AudioContext = () => new AudioContext(), clock = () => performance.now() / 1000) {
  let context: AudioContext | undefined;
  let active: OscillatorNode | undefined;
  let lastPlayed = -Infinity;
  let preparing = false;
  let generation = 0;
  let idleTimer: ReturnType<typeof setTimeout> | undefined;
  const visible = () => document.visibilityState !== 'hidden';
  function releaseContext() {
    if (context && context.state !== 'closed') void context.close().catch(() => {});
    context = undefined;
  }

  function stop() {
    generation += 1;
    clearTimeout(idleTimer);
    active?.stop();
    active = undefined;
    releaseContext();
  }

  async function play(enabled = true) {
    if (!enabled || !visible()) { stop(); return; }
    if (preparing || active || clock() - lastPlayed < NAVIGATION_SOUND.throttle) return;
    clearTimeout(idleTimer);
    preparing = true;
    const request = generation;
    try {
      const audioContext = context ??= makeContext();
      if (audioContext.state === 'suspended') await audioContext.resume();
      if (request !== generation || audioContext.state !== 'running' || !visible()) return;
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      const start = audioContext.currentTime;
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(NAVIGATION_SOUND.frequency, start);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(NAVIGATION_SOUND.amplitude, start + 0.008);
      gain.gain.linearRampToValueAtTime(0, start + NAVIGATION_SOUND.duration);
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.onended = () => {
        oscillator.disconnect();
        gain.disconnect();
        if (active === oscillator) {
          active = undefined;
          idleTimer = setTimeout(releaseContext, 350);
        }
      };
      active = oscillator;
      lastPlayed = clock();
      oscillator.start(start);
      oscillator.stop(start + NAVIGATION_SOUND.duration);
    } catch {
      // Browser audio restrictions must never block navigation or persistence.
      active = undefined;
    } finally { preparing = false; }
  }
  return { play, stop };
}

export const navigationSound = createNavigationSound();
