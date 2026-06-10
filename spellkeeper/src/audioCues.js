const SILENCE = 0.0001;

let sharedAudioContext = null;

function getAudioContext() {
  const AudioContextCtor = globalThis.AudioContext ?? globalThis.webkitAudioContext;
  if (!AudioContextCtor) return null;

  if (!sharedAudioContext) {
    sharedAudioContext = new AudioContextCtor();
  }

  return sharedAudioContext;
}

function resumeAudioContext(context) {
  if (!context || context.state !== 'suspended' || typeof context.resume !== 'function') return;

  try {
    void context.resume();
  } catch {
    // Browser audio unlock can fail outside a user gesture. Ignore it.
  }
}

function scheduleVoice(context, {
  type = 'sine',
  frequency,
  gain = 0.05,
  delay = 0,
  attack = 0.005,
  decay = 0.12,
  detune = 0,
  frequencyEnd = null,
  stopPadding = 0.03,
} = {}) {
  const oscillator = context.createOscillator();
  const gainNode = context.createGain();
  const startTime = context.currentTime + delay;
  const stopTime = startTime + attack + decay + stopPadding;

  oscillator.type = type;
  oscillator.connect(gainNode);
  gainNode.connect(context.destination);

  oscillator.frequency.setValueAtTime(frequency, startTime);
  if (frequencyEnd != null) {
    oscillator.frequency.linearRampToValueAtTime(frequencyEnd, startTime + attack + decay);
  }

  if (detune !== 0) {
    oscillator.detune.setValueAtTime(detune, startTime);
  }

  gainNode.gain.setValueAtTime(SILENCE, startTime);
  gainNode.gain.linearRampToValueAtTime(gain, startTime + attack);
  gainNode.gain.linearRampToValueAtTime(SILENCE, startTime + attack + decay);

  oscillator.start(startTime);
  oscillator.stop(stopTime);
}

function scheduleChord(context, voices) {
  for (const voice of voices) {
    scheduleVoice(context, voice);
  }
}

function playLaunchCue(context) {
  scheduleChord(context, [
    { type: 'triangle', frequency: 180, gain: 0.045, attack: 0.004, decay: 0.07 },
    { type: 'sine', frequency: 360, gain: 0.028, delay: 0.012, attack: 0.003, decay: 0.05 },
  ]);
}

function playSavedCue(context) {
  scheduleChord(context, [
    { type: 'sine', frequency: 660, frequencyEnd: 880, gain: 0.05, attack: 0.004, decay: 0.1 },
    { type: 'triangle', frequency: 990, frequencyEnd: 1320, gain: 0.032, delay: 0.018, attack: 0.003, decay: 0.11 },
  ]);
}

function playDeflectedCue(context) {
  scheduleChord(context, [
    { type: 'square', frequency: 330, frequencyEnd: 260, gain: 0.045, attack: 0.004, decay: 0.09 },
    { type: 'triangle', frequency: 220, frequencyEnd: 180, gain: 0.03, delay: 0.014, attack: 0.004, decay: 0.12 },
  ]);
}

function playConcededCue(context) {
  scheduleChord(context, [
    { type: 'sine', frequency: 140, frequencyEnd: 88, gain: 0.055, attack: 0.01, decay: 0.22 },
    { type: 'triangle', frequency: 82, frequencyEnd: 55, gain: 0.035, delay: 0.03, attack: 0.012, decay: 0.28 },
  ]);
}

function playMatchEndCue(context, outcome) {
  if (outcome === 'conceded') {
    scheduleChord(context, [
      { type: 'sine', frequency: 70, frequencyEnd: 45, gain: 0.045, attack: 0.012, decay: 0.34, stopPadding: 0.05 },
      { type: 'triangle', frequency: 110, frequencyEnd: 70, gain: 0.02, delay: 0.04, attack: 0.01, decay: 0.26, stopPadding: 0.05 },
    ]);
    return;
  }

  scheduleChord(context, [
    { type: 'triangle', frequency: 523.25, frequencyEnd: 659.25, gain: 0.035, attack: 0.006, decay: 0.18, stopPadding: 0.04 },
    { type: 'sine', frequency: 659.25, frequencyEnd: 783.99, gain: 0.03, delay: 0.025, attack: 0.006, decay: 0.16, stopPadding: 0.04 },
    { type: 'sine', frequency: 783.99, frequencyEnd: 1046.5, gain: 0.022, delay: 0.05, attack: 0.006, decay: 0.14, stopPadding: 0.04 },
  ]);
}

export function playShotLaunchCue() {
  const context = getAudioContext();
  if (!context) return;

  resumeAudioContext(context);
  playLaunchCue(context);
}

export function playShotOutcomeCue(outcome, { matchComplete = false } = {}) {
  const context = getAudioContext();
  if (!context) return;

  resumeAudioContext(context);

  const canonicalOutcome = outcome === 'save' ? 'saved' : outcome;
  if (canonicalOutcome === 'saved') {
    playSavedCue(context);
  } else if (canonicalOutcome === 'deflected') {
    playDeflectedCue(context);
  } else {
    playConcededCue(context);
  }

  if (matchComplete) {
    playMatchEndCue(context, canonicalOutcome);
  }
}
