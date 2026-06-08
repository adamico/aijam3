const DEFAULT_EPSILON = 1e-6;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function easeOutCubic(t) {
  const clamped = clamp(t, 0, 1);
  return 1 - Math.pow(1 - clamped, 3);
}

function normalizeDirection(target, fallbackDirection = { x: 1, y: 0 }) {
  const length = Math.hypot(target.x, target.y);
  if (length <= DEFAULT_EPSILON) {
    return {
      x: Math.sign(fallbackDirection.x || 1) || 1,
      y: 0,
    };
  }

  return {
    x: target.x / length,
    y: target.y / length,
  };
}

export const DEFAULT_DIVE_CONFIG = {
  threatWindow: 0.34,
  triggerMarginScale: 1.15,
  reachBonusScale: 0.22,
  duration: 0.28,
  poseEasing: {
    windup: 0.16,
    commit: 0.52,
    recovery: 0.32,
  },
};

function normalizeConfig(config = {}) {
  return {
    ...DEFAULT_DIVE_CONFIG,
    ...config,
    poseEasing: {
      ...DEFAULT_DIVE_CONFIG.poseEasing,
      ...(config.poseEasing || {}),
    },
  };
}

export function createDiveState(config = DEFAULT_DIVE_CONFIG) {
  const activeConfig = normalizeConfig(config);

  return {
    status: 'idle',
    elapsed: 0,
    duration: activeConfig.duration,
    direction: null,
    triggerTarget: null,
    triggerOrigin: null,
    pose: {
      phase: 'idle',
      progress: 0,
      extension: 0,
      compression: 0,
    },
  };
}

function sampleDivePose(elapsed, duration, config) {
  const progress = duration <= DEFAULT_EPSILON ? 1 : clamp(elapsed / duration, 0, 1);
  const commitStart = config.poseEasing.windup;
  const recoveryStart = config.poseEasing.windup + config.poseEasing.commit;

  if (progress <= commitStart) {
    const t = commitStart <= DEFAULT_EPSILON ? 1 : progress / commitStart;
    return {
      phase: 'windup',
      progress,
      extension: easeOutCubic(t) * 0.55,
      compression: lerp(1, 0.2, easeOutCubic(t)),
    };
  }

  if (progress <= recoveryStart) {
    const t = config.poseEasing.commit <= DEFAULT_EPSILON
      ? 1
      : (progress - commitStart) / config.poseEasing.commit;
    return {
      phase: 'commit',
      progress,
      extension: lerp(0.55, 1, easeOutCubic(t)),
      compression: lerp(0.2, 0, easeOutCubic(t)),
    };
  }

  const t = config.poseEasing.recovery <= DEFAULT_EPSILON
    ? 1
    : (progress - recoveryStart) / config.poseEasing.recovery;

  return {
    phase: progress >= 1 ? 'expired' : 'recovery',
    progress,
    extension: lerp(1, 0, easeOutCubic(t)),
    compression: lerp(0, 1, easeOutCubic(t)),
  };
}

export function startDive(state, {
  cursorTarget,
  origin = { x: 0, y: 0 },
  fallbackDirection = { x: 1, y: 0 },
  config = DEFAULT_DIVE_CONFIG,
} = {}) {
  if (!cursorTarget) {
    throw new Error('DiveState cursorTarget is required');
  }

  const activeConfig = normalizeConfig(config);
  const direction = normalizeDirection({
    x: cursorTarget.x - origin.x,
    y: cursorTarget.y - origin.y,
  }, fallbackDirection);

  return {
    ...state,
    status: 'diving',
    elapsed: 0,
    duration: activeConfig.duration,
    direction,
    triggerTarget: { ...cursorTarget },
    triggerOrigin: { ...origin },
    pose: {
      ...sampleDivePose(0, activeConfig.duration, activeConfig),
    },
  };
}

export const triggerDive = startDive;

export function advanceDiveState(state, dt = 0, config = DEFAULT_DIVE_CONFIG) {
  if (state.status !== 'diving') {
    return state;
  }

  const activeConfig = normalizeConfig(config);
  const nextElapsed = state.elapsed + Math.max(0, dt);
  const nextPose = sampleDivePose(nextElapsed, state.duration, activeConfig);
  const isExpired = nextElapsed >= state.duration;

  return {
    ...state,
    status: isExpired ? 'expired' : 'diving',
    elapsed: isExpired ? state.duration : nextElapsed,
    pose: nextPose,
  };
}

export function isDiveActive(state) {
  return state.status === 'diving';
}
