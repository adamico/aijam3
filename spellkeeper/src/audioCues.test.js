import { afterEach, describe, expect, it, vi } from 'vitest';

class MockParam {
  constructor() {
    this.calls = [];
  }

  setValueAtTime(value, time) {
    this.calls.push({ method: 'setValueAtTime', value, time });
  }

  linearRampToValueAtTime(value, time) {
    this.calls.push({ method: 'linearRampToValueAtTime', value, time });
  }
}

class MockOscillator {
  constructor() {
    this.type = 'sine';
    this.frequency = new MockParam();
    this.detune = new MockParam();
    this.connect = vi.fn();
    this.start = vi.fn();
    this.stop = vi.fn();
  }
}

class MockGain {
  constructor() {
    this.gain = new MockParam();
    this.connect = vi.fn();
  }
}

class MockAudioContext {
  constructor() {
    this.currentTime = 10;
    this.state = 'suspended';
    this.destination = {};
    this.oscillators = [];
    this.gains = [];
    this.resume = vi.fn(async () => {
      this.state = 'running';
    });
  }

  createOscillator() {
    const oscillator = new MockOscillator();
    this.oscillators.push(oscillator);
    return oscillator;
  }

  createGain() {
    const gain = new MockGain();
    this.gains.push(gain);
    return gain;
  }
}

describe('audio cues', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('generates a short launch chirp', async () => {
    const context = new MockAudioContext();
    vi.stubGlobal('AudioContext', class {
      constructor() {
        return context;
      }
    });

    const { playShotLaunchCue } = await import('./audioCues.js');
    playShotLaunchCue();

    expect(context.resume).toHaveBeenCalledTimes(1);
    expect(context.oscillators).toHaveLength(2);
    expect(context.oscillators[0].type).toBe('triangle');
    expect(context.oscillators[1].type).toBe('sine');
    expect(context.oscillators[0].frequency.calls[0]).toMatchObject({ method: 'setValueAtTime', value: 180 });
    expect(context.oscillators[1].frequency.calls[0]).toMatchObject({ method: 'setValueAtTime', value: 360 });
    expect(context.gains[0].gain.calls.some(call => call.method === 'linearRampToValueAtTime')).toBe(true);
  });

  it('layers the outcome cue with a match-end flourish when the match ends', async () => {
    const context = new MockAudioContext();
    vi.stubGlobal('AudioContext', class {
      constructor() {
        return context;
      }
    });

    const { playShotOutcomeCue } = await import('./audioCues.js');
    playShotOutcomeCue('conceded', { matchComplete: true });

    expect(context.oscillators).toHaveLength(4);
    expect(context.oscillators[0].frequency.calls[0]).toMatchObject({ value: 140 });
    expect(context.oscillators[2].frequency.calls[0]).toMatchObject({ value: 70 });
    expect(context.oscillators[3].type).toBe('triangle');
  });
});
