import { advanceShot, createShot } from './shotTrajectory.js';
import { resolveCrossingSave } from './saveResolver.js';

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

function cloneRuntime(runtime) {
  return {
    ...runtime,
    plan: runtime.plan.map(clonePlanEntry),
    shotDimensions: { ...runtime.shotDimensions },
    shotTiming: { ...runtime.shotTiming },
    activeShotEntry: runtime.activeShotEntry ? clonePlanEntry(runtime.activeShotEntry) : null,
    activeShot: runtime.activeShot ? cloneShot(runtime.activeShot) : null,
    feedback: cloneFeedbackState(runtime.feedback),
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
    respawnTimer: 0,
    nextShotIndex: null,
    matchComplete: false,
    shotResolved: false,
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
    respawnTimer: 0,
    nextShotIndex: null,
    matchComplete: false,
    shotResolved: false,
    feedback: {
      lastResult: null,
      timer: 0,
    },
  };

  return spawnShotEntry(state, 0);
}

function spawnNextShot(runtime) {
  const nextIndex = runtime.nextShotIndex ?? runtime.activeShotIndex + 1;
  if (nextIndex >= runtime.plan.length) {
    return runtime;
  }

  return spawnShotEntry(runtime, nextIndex);
}

export function recordShotRuntimeOutcome(runtime, {
  result = null,
  nextShotIndex = null,
  matchComplete = false,
} = {}) {
  if (!runtime) return runtime;

  const nextRuntime = cloneRuntime(runtime);

  if (result) {
    nextRuntime.feedback = {
      lastResult: { ...result },
      timer: nextRuntime.shotTiming.feedbackDuration,
    };
  }

  nextRuntime.matchComplete = Boolean(matchComplete);
  nextRuntime.nextShotIndex = Number.isInteger(nextShotIndex) && nextShotIndex >= 0
    ? nextShotIndex
    : null;

  if (nextRuntime.matchComplete) {
    nextRuntime.respawnTimer = 0;
    nextRuntime.nextShotIndex = null;
  }

  return nextRuntime;
}

export function advanceShotRuntime(runtime, {
  dt = 1 / 60,
  saveSegments = [],
  resolveSave = resolveCrossingSave,
} = {}) {
  if (!runtime) {
    return { runtime, events: [] };
  }

  const step = Math.max(0, dt);
  const nextRuntime = cloneRuntime(runtime);
  const events = [];

  if (nextRuntime.feedback.timer > 0) {
    nextRuntime.feedback.timer = Math.max(0, nextRuntime.feedback.timer - step);
  }

  if (nextRuntime.respawnTimer > 0) {
    nextRuntime.respawnTimer = Math.max(0, nextRuntime.respawnTimer - step);
    if (nextRuntime.respawnTimer === 0) {
      if (nextRuntime.matchComplete || nextRuntime.nextShotIndex == null) {
        return { runtime: nextRuntime, events };
      }

      return {
        runtime: spawnNextShot(nextRuntime),
        events,
      };
    }

    return { runtime: nextRuntime, events };
  }

  if (nextRuntime.shotResolved || !nextRuntime.activeShot) {
    return { runtime: nextRuntime, events };
  }

  const previousZ = nextRuntime.activeShot.sample?.z ?? nextRuntime.activeShot.start?.z ?? nextRuntime.activeShot.maxZ;
  const advancedShot = advanceShot(nextRuntime.activeShot, step);

  nextRuntime.activeShot = cloneShot(advancedShot);
  nextRuntime.activeShotEntry = nextRuntime.activeShotEntry
    ? clonePlanEntry(nextRuntime.activeShotEntry)
    : nextRuntime.plan[nextRuntime.activeShotIndex]
      ? clonePlanEntry(nextRuntime.plan[nextRuntime.activeShotIndex])
      : null;

  if (advancedShot.sample?.isComplete) {
    const result = resolveSave({
      previousZ,
      currentZ: advancedShot.sample.z,
      ball: {
        x: advancedShot.sample.x,
        y: advancedShot.sample.y,
        radius: advancedShot.sample.radius,
      },
      segments: saveSegments,
    });

    nextRuntime.activeShot.sample = {
      ...nextRuntime.activeShot.sample,
      saveResult: { ...result },
    };
    nextRuntime.feedback = {
      lastResult: { ...result },
      timer: nextRuntime.shotTiming.feedbackDuration,
    };
    nextRuntime.respawnTimer = nextRuntime.shotTiming.respawnDelay;
    nextRuntime.nextShotIndex = nextRuntime.activeShotIndex + 1;
    nextRuntime.shotResolved = true;

    events.push({
      type: 'shot-resolved',
      shotIndex: nextRuntime.activeShotIndex,
      ...result,
      result: { ...result },
    });
  }

  return { runtime: nextRuntime, events };
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

  return spawnNextShot(cloneRuntime(runtime));
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
