const SHOT_RAMP = [
  {
    hex: 'standard',
    start: { x: -1.2, y: -4.55 },
    target: { x: -0.8, y: -3.85 },
    difficulty: 1,
    lesson: 'straight-warmup',
  },
  {
    hex: 'standard',
    start: { x: 1.2, y: -4.55 },
    target: { x: 0.9, y: -3.55 },
    difficulty: 2,
    lesson: 'straight-low-corner',
  },
  {
    hex: 'heavy',
    start: { x: -1.8, y: -4.55 },
    target: { x: 1.0, y: -3.85 },
    difficulty: 3,
    lesson: 'heavy-slow-big',
  },
  {
    hex: 'curve',
    start: { x: -2.4, y: -4.55 },
    target: { x: -1.1, y: -3.65 },
    curveDirection: 1,
    difficulty: 4,
    lesson: 'curve-same-lane-read',
  },
  {
    hex: 'fireball',
    start: { x: 0.2, y: -4.55 },
    target: { x: 0.2, y: -3.25 },
    difficulty: 5,
    lesson: 'fireball-central-speed',
  },
  {
    hex: 'standard',
    start: { x: 2.1, y: -4.55 },
    target: { x: 2.55, y: -3.1 },
    difficulty: 6,
    lesson: 'straight-wide-high',
  },
  {
    hex: 'curve',
    start: { x: 2.5, y: -4.55 },
    target: { x: 1.85, y: -3.2 },
    curveDirection: -1,
    difficulty: 7,
    lesson: 'curve-opposite-bow',
  },
  {
    hex: 'fireball',
    start: { x: -2.2, y: -4.55 },
    target: { x: -2.75, y: -3.0 },
    difficulty: 8,
    lesson: 'fireball-wide-high',
  },
  {
    hex: 'heavy',
    start: { x: 2.7, y: -4.55 },
    target: { x: -2.6, y: -3.95 },
    difficulty: 9,
    lesson: 'heavy-cross-goal-drag',
  },
  {
    hex: 'fireball',
    start: { x: -2.8, y: -4.55 },
    target: { x: 2.9, y: -3.05 },
    difficulty: 10,
    lesson: 'fireball-final-cross',
  },
];

function cloneShotConfig(config) {
  return {
    ...config,
    start: { ...config.start },
    target: { ...config.target },
  };
}

export function getShotRampPlan() {
  return SHOT_RAMP.map(cloneShotConfig);
}

export function getRampShotConfig(attemptIndex) {
  if (!Number.isInteger(attemptIndex) || attemptIndex < 0) {
    throw new Error(`Shot attempt index must be a non-negative integer: ${attemptIndex}`);
  }

  return cloneShotConfig(SHOT_RAMP[attemptIndex % SHOT_RAMP.length]);
}
