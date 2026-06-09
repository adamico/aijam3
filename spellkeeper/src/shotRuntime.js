import { advanceShot, createShot } from './shotTrajectory.js';

export const DEFAULT_SHOT_RUNTIME_DIMENSIONS = {
  maxZ: 11,
  groundY: -5,
  radius: 0.45,
};

export const DEFAULT_SHOT_RUNTIME_TIMING = {
  respawnDelay: 0.35,
  feedbackDuration: 0.9,
};

function cloneShotPose(pose) {
  if (!pose) return null;

  return {
    ...pose,
    shadow: pose.shadow ? { ...pose.shadow } : null,
    saveResult: pose.saveResult ? { ...pose.saveResult } : null,
  };
}

function cloneShot(shot) {
  return {
    ...shot,
    start: { ...shot.start },
    target: { ...shot.target },
    sample: cloneShotPose(shot.sample),
  };
}

function clonePlanEntry(entry) {
  return {
    ...entry,
    shot: {
      ...entry.shot,
      start: { ...entry.shot.start },
      target: { ...entry.shot.target },
    },
    designer: entry.designer
      ? {
          ...entry.designer,
          pressureTags: [...entry.designer.pressureTags],
        }
      : entry.designer,
  };
}

function cloneFeedbackState(feedback) {
  return {
    ...feedback,
    lastResult: feedback.lastResult ? { ...feedback.lastResult } : null,
  };
}

function normalizeDimensions(dimensions = {}) {
  const shotDimensions = {
    ...DEFAULT_SHOT_RUNTIME_DIMENSIONS,
    ...dimensions,
  };

  if (!Number.isFinite(shotDimensions.maxZ) || shotDimensions.maxZ <= 0) {
    throw new Error(`Shot runtime maxZ must be a positive number: ${shotDimensions.maxZ}`);
  }

  if (!Number.isFinite(shotDimensions.groundY)) {
    throw new Error(`Shot runtime groundY must be a finite number: ${shotDimensions.groundY}`);
  }

  if (!Number.isFinite(shotDimensions.radius) || shotDimensions.radius <= 0) {
    throw new Error(`Shot runtime radius must be a positive number: ${shotDimensions.radius}`);
  }

  return shotDimensions;
}

function normalizeTiming(timing = {}) {
  const shotTiming = {
    ...DEFAULT_SHOT_RUNTIME_TIMING,
    ...timing,
  };

  if (!Number.isFinite(shotTiming.respawnDelay) || shotTiming.respawnDelay < 0) {
    throw new Error(`Shot runtime respawnDelay must be a non-negative number: ${shotTiming.respawnDelay}`);
  }

  if (!Number.isFinite(shotTiming.feedbackDuration) || shotTiming.feedbackDuration < 0) {
    throw new Error(`Shot runtime feedbackDuration must be a non-negative number: ${shotTiming.feedbackDuration}`);
  }

  return shotTiming;
}

function normalizePlan(shotPlan) {
  if (!Array.isArray(shotPlan) || shotPlan.length === 0) {
    throw new Error('Shot runtime requires a non-empty Shot Plan');
  }

  return shotPlan.map(clonePlanEntry);
}

function spawnShotEntry(state, index) {
  const entry = state.plan[index];
  if (!entry) {
    throw new Error(`Shot runtime entry missing for shot index: ${index}`);
  }

  const activeShot = advanceShot(
    createShot({
      ...entry.shot,
      maxZ: state.shotDimensions.maxZ,
      groundY: state.shotDimensions.groundY,
      radius: state.shotDimensions.radius,
    }),
    0,
  );

  return {
    ...state,
    activeShotIndex: index,
    activeShotEntry: clonePlanEntry(entry),
    activeShot: cloneShot(activeShot),
  };
}

export function createShotRuntime({
  shotPlan,
  shotDimensions,
  shotTiming,
} = {}) {
  const plan = normalizePlan(shotPlan);
  const state = {
    plan,
    shotDimensions: normalizeDimensions(shotDimensions),
    shotTiming: normalizeTiming(shotTiming),
    activeShotIndex: 0,
    activeShotEntry: null,
    activeShot: null,
    feedback: {
      lastResult: null,
      timer: 0,
    },
  };

  return spawnShotEntry(state, 0);
}

export function advanceShotRuntime(runtime, dt = 1 / 60) {
  if (!runtime?.activeShot) return runtime;

  const advancedShot = advanceShot(runtime.activeShot, Math.max(0, dt));
  return {
    ...runtime,
    activeShot: cloneShot(advancedShot),
  };
}

export function recordShotRuntimeFeedback(runtime, result) {
  if (!runtime) return runtime;

  return {
    ...runtime,
    feedback: {
      lastResult: result ? { ...result } : null,
      timer: runtime.shotTiming.feedbackDuration,
    },
  };
}

export function queueNextShot(runtime) {
  if (!runtime) return runtime;

  const nextIndex = runtime.activeShotIndex + 1;
  if (nextIndex >= runtime.plan.length) {
    return runtime;
  }

  return {
    ...spawnShotEntry(runtime, nextIndex),
  };
}

export function getActiveShot(runtime) {
  return runtime?.activeShotEntry ? clonePlanEntry(runtime.activeShotEntry) : null;
}

export function getShotPose(runtime) {
  return runtime?.activeShot?.sample ? cloneShotPose(runtime.activeShot.sample) : null;
}

export function getFeedbackState(runtime) {
  return runtime?.feedback ? cloneFeedbackState(runtime.feedback) : null;
}
