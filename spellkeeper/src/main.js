import {
  engineInit,
  clamp,
  vec2, setCameraPos, setCameraScale,
  drawLine, drawCircle, drawTextScreen,
  rgb, Color, setCanvasClearColor,
  mousePos, timeDelta, mainCanvasSize,
  setCanvasMaxAspect, setCanvasMaxSize, setCanvasMinAspect
} from 'littlejsengine';
import { solveIkChain } from './ikChain.js';
import { solveTorsoDrag } from './bodyRig.js';
import {
  DEFAULT_DIVE_CONFIG,
  advanceDiveState,
  createDiveState,
  deriveEffectiveReach,
  isDiveActive,
  shouldTriggerDive,
  startDive,
} from './diveState.js';
import { createCalibrationShotChain, createShotPlan, describeShotPlan } from './shotPlan.js';
import { createMatchState, isMatchComplete, recordShotResult } from './matchState.js';
import {
  advanceShotRuntime,
  getFeedbackState,
  createShotRuntime,
  getShotPose,
  recordShotRuntimeOutcome,
  queueNextShot,
} from './shotRuntime.js';
import { sampleShotPath } from './shotTrajectory.js';
import { playShotLaunchCue, playShotOutcomeCue } from './audioCues.js';

// Helper to convert hex to LittleJS Color
const c = (hex) => new Color().setHex(hex);

// --- Pitch & Stadium Constants ---
const GROUND_Y = -5.0;
const GROUND_HALF_WIDTH = 30.0;
const GROUND_LINE_THICKNESS = 0.08;
const PITCH_CENTER_X = 0.0;        // center of screen/pitch in world space
const COLOR_STADIUM_NIGHT = rgb(0.05, 0.06, 0.12);
const COLOR_GROUND_LINE = c('#ffffff');

// --- Goal Plane Bounding Dimensions ---
const GOAL_WIDTH = 7.32;   // ~7 meters between posts
const GOAL_HEIGHT = 2.44;  // standard height proportion
const GOAL_POST_THICKNESS = 0.2;
const COLOR_GOAL_FRAME = c('#ffffff');
const COLOR_SAVE_FEEDBACK = c('#66ff99');
const COLOR_DEFLECTION_FEEDBACK = c('#ffbf66');
const COLOR_MISS_FEEDBACK = c('#ff6677');
const COLOR_SCORE_FEEDBACK = c('#d7e8ff');
const SHOT_RESULT_FEEDBACK = {
  saved: { label: 'SAVE +100', color: COLOR_SAVE_FEEDBACK },
  deflected: { label: 'DEFLECTED +25', color: COLOR_DEFLECTION_FEEDBACK },
  conceded: { label: 'GOAL +0', color: COLOR_MISS_FEEDBACK },
};

const GOAL_LEFT_POST = vec2(PITCH_CENTER_X - GOAL_WIDTH / 2, GROUND_Y);
const GOAL_RIGHT_POST = vec2(PITCH_CENTER_X + GOAL_WIDTH / 2, GROUND_Y);
const GOAL_CROSSBAR_LEFT = vec2(PITCH_CENTER_X - GOAL_WIDTH / 2, GROUND_Y + GOAL_HEIGHT);
const GOAL_CROSSBAR_RIGHT = vec2(PITCH_CENTER_X + GOAL_WIDTH / 2, GROUND_Y + GOAL_HEIGHT);

// --- Goalkeeper (Familiar) Initial Joints/Structure ---
const FAMILIAR_TORSO_RADIUS = 0.60;
const FAMILIAR_HEAD_RADIUS = 0.25;
const FAMILIAR_HAND_RADIUS = 0.18;
const FAMILIAR_FOOT_RADIUS = 0.12;
const FAMILIAR_UPPER_ARM_THICKNESS = 0.10;
const FAMILIAR_FOREARM_THICKNESS = 0.08;
const FAMILIAR_THIGH_THICKNESS = 0.10;
const FAMILIAR_SHIN_THICKNESS = 0.08;
const COLOR_FAMILIAR_TORSO = c('#4d82cb');
const COLOR_FAMILIAR_HEAD = c('#2c4d7e');
const COLOR_FAMILIAR_ARM = c('#3d6db0');
const COLOR_FAMILIAR_HAND = c('#d95763');

// Initial joint layout offsets (in meters relative to ground/center)
const FAMILIAR_INIT_HEAD_Y = 1.55;
const FAMILIAR_INIT_TORSO_Y = 1;
const FAMILIAR_INIT_SHOULDER_X = 0.2;
const FAMILIAR_INIT_SHOULDER_Y = 1.15;
const FAMILIAR_INIT_ELBOW_X = 0.8;
const FAMILIAR_INIT_ELBOW_Y = 0.9;
const FAMILIAR_INIT_HAND_X = 1.2;
const FAMILIAR_INIT_HAND_Y = 1.2;
const FAMILIAR_INIT_HIP_X = 0.15;
const FAMILIAR_INIT_HIP_Y = 0.8;
const FAMILIAR_INIT_KNEE_X = 0.34;
const FAMILIAR_INIT_KNEE_Y = -0.05;
const FAMILIAR_INIT_FOOT_X = 0.48;
const FAMILIAR_INIT_FOOT_Y = -0.45;
const FAMILIAR_UPPER_ARM_LENGTH = Math.hypot(
  FAMILIAR_INIT_ELBOW_X - FAMILIAR_INIT_SHOULDER_X,
  FAMILIAR_INIT_ELBOW_Y - FAMILIAR_INIT_SHOULDER_Y,
);
const FAMILIAR_FOREARM_LENGTH = Math.hypot(
  FAMILIAR_INIT_HAND_X - FAMILIAR_INIT_ELBOW_X,
  FAMILIAR_INIT_HAND_Y - FAMILIAR_INIT_ELBOW_Y,
);
const FAMILIAR_THIGH_LENGTH = Math.hypot(
  FAMILIAR_INIT_KNEE_X - FAMILIAR_INIT_HIP_X,
  FAMILIAR_INIT_KNEE_Y - FAMILIAR_INIT_HIP_Y,
);
const FAMILIAR_SHIN_LENGTH = Math.hypot(
  FAMILIAR_INIT_FOOT_X - FAMILIAR_INIT_KNEE_X,
  FAMILIAR_INIT_FOOT_Y - FAMILIAR_INIT_KNEE_Y,
);
const FAMILIAR_HAND_IK = {
  left: {
    elbowSign: -1,
    fallbackDirection: { x: -1, y: 0 },
  },
  right: {
    elbowSign: 1,
    fallbackDirection: { x: 1, y: 0 },
  },
};
const FAMILIAR_TORSO_DRAG_MAX_SPEED = 4.0; // meters/second; snappy and athletic
const FAMILIAR_DIVE_VERTICAL_LIFT_SCALE = 0.32;
const FAMILIAR_DIVE_HEAD_LEAD_SCALE = 0.45;
const FAMILIAR_DIVE_SHOULDER_LEAD_SCALE = 0.28;
const FAMILIAR_REVEAL_EYE_GLOW_COLOR = c('#e8ffff');
const FAMILIAR_REVEAL_TAIL_COLOR = c('#9af7ff');
const FAMILIAR_REVEAL_AURA_COLOR = c('#b6ffff');
const FAMILIAR_REVEAL_EYE_OFFSET_X = 0.12;
const FAMILIAR_REVEAL_EYE_OFFSET_Y = 0.06;
const FAMILIAR_REVEAL_TAIL_OFFSET_X = 0.2;
const FAMILIAR_REVEAL_TAIL_OFFSET_Y = -0.15;
const FAMILIAR_REVEAL_TAIL_LENGTH = 0.42;
const FAMILIAR_REVEAL_TAIL_WIDTH = 0.06;

const FAMILIAR_BODY_OFFSETS = {
  head: { x: 0, y: FAMILIAR_INIT_HEAD_Y - FAMILIAR_INIT_TORSO_Y },
  leftShoulder: { x: -FAMILIAR_INIT_SHOULDER_X, y: FAMILIAR_INIT_SHOULDER_Y - FAMILIAR_INIT_TORSO_Y },
  rightShoulder: { x: FAMILIAR_INIT_SHOULDER_X, y: FAMILIAR_INIT_SHOULDER_Y - FAMILIAR_INIT_TORSO_Y },
  leftHip: { x: -FAMILIAR_INIT_HIP_X, y: FAMILIAR_INIT_HIP_Y - FAMILIAR_INIT_TORSO_Y },
  rightHip: { x: FAMILIAR_INIT_HIP_X, y: FAMILIAR_INIT_HIP_Y - FAMILIAR_INIT_TORSO_Y },
  leftKnee: { x: -FAMILIAR_INIT_KNEE_X, y: FAMILIAR_INIT_KNEE_Y - FAMILIAR_INIT_TORSO_Y },
  rightKnee: { x: FAMILIAR_INIT_KNEE_X, y: FAMILIAR_INIT_KNEE_Y - FAMILIAR_INIT_TORSO_Y },
  leftFoot: { x: -FAMILIAR_INIT_FOOT_X, y: FAMILIAR_INIT_FOOT_Y - FAMILIAR_INIT_TORSO_Y },
  rightFoot: { x: FAMILIAR_INIT_FOOT_X, y: FAMILIAR_INIT_FOOT_Y - FAMILIAR_INIT_TORSO_Y },
};

// All dimensions and joints are defined in physical meters relative to the ground.
const Familiar = {
  torsoPos: vec2(PITCH_CENTER_X, GROUND_Y + FAMILIAR_INIT_TORSO_Y),
  headPos: vec2(PITCH_CENTER_X, GROUND_Y + FAMILIAR_INIT_HEAD_Y),
  leftShoulder: vec2(PITCH_CENTER_X - FAMILIAR_INIT_SHOULDER_X, GROUND_Y + FAMILIAR_INIT_SHOULDER_Y),
  rightShoulder: vec2(PITCH_CENTER_X + FAMILIAR_INIT_SHOULDER_X, GROUND_Y + FAMILIAR_INIT_SHOULDER_Y),
  leftElbow: vec2(PITCH_CENTER_X - FAMILIAR_INIT_ELBOW_X, GROUND_Y + FAMILIAR_INIT_ELBOW_Y),
  rightElbow: vec2(PITCH_CENTER_X + FAMILIAR_INIT_ELBOW_X, GROUND_Y + FAMILIAR_INIT_ELBOW_Y),
  leftHand: vec2(PITCH_CENTER_X - FAMILIAR_INIT_HAND_X, GROUND_Y + FAMILIAR_INIT_HAND_Y),
  rightHand: vec2(PITCH_CENTER_X + FAMILIAR_INIT_HAND_X, GROUND_Y + FAMILIAR_INIT_HAND_Y),
  leftHip: vec2(PITCH_CENTER_X - FAMILIAR_INIT_HIP_X, GROUND_Y + FAMILIAR_INIT_HIP_Y),
  rightHip: vec2(PITCH_CENTER_X + FAMILIAR_INIT_HIP_X, GROUND_Y + FAMILIAR_INIT_HIP_Y),
  leftKnee: vec2(PITCH_CENTER_X - FAMILIAR_INIT_KNEE_X, GROUND_Y + FAMILIAR_INIT_KNEE_Y),
  rightKnee: vec2(PITCH_CENTER_X + FAMILIAR_INIT_KNEE_X, GROUND_Y + FAMILIAR_INIT_KNEE_Y),
  leftFoot: vec2(PITCH_CENTER_X - FAMILIAR_INIT_FOOT_X, GROUND_Y + FAMILIAR_INIT_FOOT_Y),
  rightFoot: vec2(PITCH_CENTER_X + FAMILIAR_INIT_FOOT_X, GROUND_Y + FAMILIAR_INIT_FOOT_Y),
  torsoRadius: FAMILIAR_TORSO_RADIUS,
  headRadius: FAMILIAR_HEAD_RADIUS,
  handRadius: FAMILIAR_HAND_RADIUS,
  footRadius: FAMILIAR_FOOT_RADIUS,
};

// --- Ball Structure at Spawn ---
const BALL_RADIUS = 0.25;           // larger than real ball (0.11m) for visual clarity
const BALL_MAX_Z = 11.0;            // distance between starting position and goal line in Z axis
const BALL_SHADOW_SCALE = 0.9;
const BALL_SHADOW_OPACITY = 0.18;
const BALL_DETAIL_SCALE = 0.8;
const COLOR_BALL = c('#ffffff');
const COLOR_BALL_DETAIL = c('#AABBBB');
const SHOT_RESPAWN_DELAY = 0.35;
const SAVE_FEEDBACK_DURATION = 0.9;
const TUTORIAL_SHOT_TELEGRAPH_SHOTS = 2;
const TUTORIAL_SHOT_TELEGRAPH_FADE_DURATION = 0.85;
const TUTORIAL_SHOT_TELEGRAPH_SEGMENTS = 10;
const COLOR_TUTORIAL_SHOT_TELEGRAPH_CORE = c('#ffffff');

const initialMatchState = createMatchState();
const Match = {
  state: initialMatchState,
  shotPlanSeed: null,
  plan: createCalibrationShotChain({ totalShots: initialMatchState.totalShots }),
};

export function createRuntimeShotPlanSeed() {
  return `spellkeeper-match-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

const EMPTY_DIVE_VISUAL_POSE = {
  torso: { x: 0, y: 0 },
  head: { x: 0, y: 0 },
  shoulders: { x: 0, y: 0 },
};

function cloneDiveVisualPose(pose = EMPTY_DIVE_VISUAL_POSE) {
  return {
    torso: { ...pose.torso },
    head: { ...pose.head },
    shoulders: { ...pose.shoulders },
  };
}

const RESPONSIVE_CANVAS_ASPECT_RATIO = 16 / 9;
const RESPONSIVE_CANVAS_MAX_SIZE = vec2(3840, 2160);

function configureResponsiveCanvas() {
  setCanvasMinAspect(RESPONSIVE_CANVAS_ASPECT_RATIO);
  setCanvasMaxAspect(RESPONSIVE_CANVAS_ASPECT_RATIO);
  setCanvasMaxSize(RESPONSIVE_CANVAS_MAX_SIZE);
}

function updateCameraFraming() {
  setCameraPos(vec2(PITCH_CENTER_X, CAMERA_CENTER_Y));
  setCameraScale(mainCanvasSize.y / CAMERA_VISIBLE_HEIGHT);
}

const Dive = {
  state: createDiveState(),
  visualPose: cloneDiveVisualPose(),
  canTrigger: true,
};

const Ball = {
  shot: null,
  shotIndex: 0,
  respawnTimer: 0,
  runtime: null,
};

// --- Camera & Projection Constants ---
const CAMERA_TILT_ANGLE = 40.0; // degrees, camera tilt down from horizon
const COS_THETA = Math.cos((CAMERA_TILT_ANGLE * Math.PI) / 180);
const SIN_THETA = Math.sin((CAMERA_TILT_ANGLE * Math.PI) / 180);
const CAMERA_CENTER_Y = -6.0;  // centers the scene vertically on screen
const CAMERA_VISIBLE_HEIGHT = 10; // selected responsive prototype height-fit framing

function resetFamiliarPose() {
  setFamiliarPoseFromTorso(vec2(PITCH_CENTER_X, GROUND_Y + FAMILIAR_INIT_TORSO_Y));
}

function cloneRuntimeShotSample(sample) {
  if (!sample) return null;

  return {
    ...sample,
    shadow: sample.shadow ? { ...sample.shadow } : null,
    saveResult: cloneSaveResult(sample.saveResult),
  };
}

function cloneSaveResult(result) {
  if (!result) return null;

  return {
    ...result,
    contactSegments: Array.isArray(result.contactSegments)
      ? result.contactSegments.map(contact => ({ ...contact }))
      : [],
  };
}

function syncBallFromRuntime(runtime) {
  if (!runtime) return;

  Ball.runtime = runtime;
  Ball.shot = runtime.activeShot ? {
    ...runtime.activeShot,
    start: { ...runtime.activeShot.start },
    target: { ...runtime.activeShot.target },
    sample: cloneRuntimeShotSample(runtime.activeShot.sample),
  } : null;

  const sample = getShotPose(runtime);
  if (sample) {
    applyShotSample(sample);
  }

  Ball.shotIndex = runtime.activeShotIndex;
  Ball.respawnTimer = runtime.respawnTimer ?? 0;
}

function createBallRuntime() {
  return createShotRuntime({
    shotPlan: Match.plan,
    shotDimensions: {
      maxZ: BALL_MAX_Z,
      groundY: GROUND_Y,
      radius: BALL_RADIUS,
    },
    shotTiming: {
      respawnDelay: SHOT_RESPAWN_DELAY,
      feedbackDuration: SAVE_FEEDBACK_DURATION,
    },
  });
}

export function gameInit(options = {}) {
  setCanvasClearColor(COLOR_STADIUM_NIGHT);
  updateCameraFraming();
  resetFamiliarPose();
  Dive.state = createDiveState();
  Dive.visualPose = cloneDiveVisualPose();
  Dive.canTrigger = true;
  Match.state = createMatchState();
  const hasSeed = options.shotPlanSeed !== undefined && options.shotPlanSeed !== null;
  Match.shotPlanSeed = hasSeed ? options.shotPlanSeed : null;
  Match.plan = hasSeed
    ? createShotPlan(Match.shotPlanSeed, { totalShots: Match.state.totalShots })
    : createCalibrationShotChain({ totalShots: Match.state.totalShots });
  Ball.runtime = createBallRuntime();
  syncBallFromRuntime(Ball.runtime);
  playShotLaunchCue();
}

export function getShotResultFeedback(outcome) {
  const canonicalOutcome = outcome === 'save' ? 'saved' : outcome;
  return SHOT_RESULT_FEEDBACK[canonicalOutcome] ?? SHOT_RESULT_FEEDBACK.conceded;
}

function formatContactSegments(contactSegments = []) {
  if (!Array.isArray(contactSegments) || contactSegments.length === 0) {
    return 'no contact';
  }

  return contactSegments
    .map(contact => `${contact.id ?? 'unknown'}(${contact.segmentType ?? 'body'})`)
    .join(', ');
}

function createFallbackShotResult(outcome) {
  const canonicalOutcome = outcome === 'save' ? 'saved' : outcome;
  if (canonicalOutcome !== 'saved' && canonicalOutcome !== 'deflected' && canonicalOutcome !== 'conceded') {
    return null;
  }

  return {
    outcome: canonicalOutcome,
    saveQuality: canonicalOutcome === 'saved'
      ? 'clean-save'
      : canonicalOutcome === 'deflected'
        ? 'deflection'
        : 'concession',
    isSave: canonicalOutcome === 'saved',
    isSaved: canonicalOutcome === 'saved',
    isCleanSave: canonicalOutcome === 'saved',
    isDeflection: canonicalOutcome === 'deflected',
    isConcession: canonicalOutcome === 'conceded',
    scoreDelta: canonicalOutcome === 'saved'
      ? 100
      : canonicalOutcome === 'deflected'
        ? 25
        : 0,
    segmentId: null,
    distance: null,
    overlapDepth: null,
    contactSegments: [],
  };
}

function formatPressureTags(pressureTags = []) {
  if (!Array.isArray(pressureTags) || pressureTags.length === 0) {
    return 'no tags';
  }

  return pressureTags.join(', ');
}

export function getShotResolutionSummary() {
  const feedback = getFeedbackState(Ball.runtime);
  const result = cloneSaveResult(feedback?.lastResult);
  const shotEntry = feedback?.lastShotEntry ?? Ball.runtime?.activeShotEntry ?? null;

  if (!result) return null;

  const canonicalOutcome = result.outcome === 'save' ? 'saved' : result.outcome;
  const resultFeedback = getShotResultFeedback(canonicalOutcome);

  return {
    outcome: canonicalOutcome,
    isSave: Boolean(result.isSave ?? canonicalOutcome === 'saved'),
    isSaved: Boolean(result.isSaved ?? canonicalOutcome === 'saved'),
    saveQuality: result.saveQuality ?? (
      canonicalOutcome === 'saved'
        ? 'clean-save'
        : canonicalOutcome === 'deflected'
          ? 'deflection'
          : canonicalOutcome === 'concession'
            ? 'concession'
            : 'in-flight'
    ),
    scoreDelta: result.scoreDelta ?? (
      canonicalOutcome === 'saved'
        ? 100
        : canonicalOutcome === 'deflected'
          ? 25
          : 0
    ),
    isCleanSave: Boolean(result.isCleanSave ?? canonicalOutcome === 'saved'),
    isDeflection: Boolean(result.isDeflection ?? canonicalOutcome === 'deflected'),
    isConcession: Boolean(result.isConcession ?? canonicalOutcome === 'conceded'),
    crossedGoalPlane: Boolean(result.crossedGoalPlane),
    segmentId: result.segmentId ?? null,
    distance: result.distance ?? null,
    overlapDepth: result.overlapDepth ?? null,
    contactSegments: Array.isArray(result.contactSegments) ? result.contactSegments : [],
    shotIndex: shotEntry?.index ?? null,
    hex: shotEntry?.shot?.hex ?? null,
    originLane: shotEntry?.shot?.originLane ?? null,
    targetLane: shotEntry?.shot?.targetLane ?? null,
    placementHeight: shotEntry?.shot?.placementHeight ?? null,
    pressureTags: Array.isArray(shotEntry?.designer?.pressureTags) ? [...shotEntry.designer.pressureTags] : [],
    intendedFailureMode: shotEntry?.designer?.intendedFailureMode ?? null,
    difficultyBand: shotEntry?.designer?.difficultyBand ?? null,
    shotLabel: shotEntry?.designer?.label ?? null,
    label: resultFeedback.label,
  };
}

export function getFamiliarRevealState() {
  const feedback = getFeedbackState(Ball.runtime);
  const result = feedback?.lastResult;
  const isCleanSave = Boolean(result?.isCleanSave);
  const duration = Ball.runtime?.shotTiming?.feedbackDuration ?? SAVE_FEEDBACK_DURATION;
  const visibility = isCleanSave && feedback?.timer > 0 && duration > 0
    ? clamp(feedback.timer / duration, 0, 1)
    : 0;

  return {
    isActive: visibility > 0,
    visibility,
    isCleanSave,
    segmentId: result?.segmentId ?? null,
  };
}

export function gameUpdate() {
  updateCameraFraming();
  updateKeeperIk(mousePos, timeDelta);
  updateBallShot(timeDelta);
}

export function gameUpdatePost() {
  // Camera update/post process
}

export function goalPlaneFromProjectedMouse(projectedMousePos) {
  return {
    x: projectedMousePos.x,
    y: projectedMousePos.y / COS_THETA,
  };
}

export function spawnShot(index = Ball.shotIndex) {
  Ball.runtime = createBallRuntime();
  for (let shotIndex = 0; shotIndex < index; shotIndex += 1) {
    Ball.runtime = queueNextShot(Ball.runtime);
  }

  if (Ball.runtime.activeShotIndex !== index) {
    throw new Error(`Shot plan entry missing for shot index: ${index}`);
  }

  syncBallFromRuntime(Ball.runtime);
  playShotLaunchCue();
  return Ball.shot;
}

function applyShotSample(sample) {
  Ball.x = sample.x;
  Ball.y = sample.y;
  Ball.z = sample.z;
  Ball.radius = sample.radius;
  Ball.scale = sample.scale;
  Ball.color = sample.color;
  Ball.shadow = sample.shadow;
}

export function applyMatchShotOutcome(outcome) {
  if (isMatchComplete(Match.state)) return getMatchState();

  Match.state = recordShotResult(Match.state, outcome);
  const matchComplete = isMatchComplete(Match.state);

  if (Ball.runtime) {
    const currentFeedback = getFeedbackState(Ball.runtime);
    const canonicalOutcome = outcome === 'save' ? 'saved' : outcome;
    const feedbackMatchesOutcome = currentFeedback?.lastResult?.outcome === canonicalOutcome;
    const runtimeOutcome = {
      nextShotIndex: Match.state.shotsTaken,
      matchComplete: isMatchComplete(Match.state),
    };

    runtimeOutcome.result = feedbackMatchesOutcome
      ? currentFeedback.lastResult
      : createFallbackShotResult(canonicalOutcome);

    Ball.runtime = recordShotRuntimeOutcome(Ball.runtime, {
      ...runtimeOutcome,
      shotEntry: Ball.runtime?.activeShotEntry ?? null,
    });
    syncBallFromRuntime(Ball.runtime);
  }

  playShotOutcomeCue(outcome, {
    matchComplete,
  });

  return getMatchState();
}

export function updateBallShot(dt = 1 / 60) {
  if (!Ball.runtime) spawnShot(0);

  if (isMatchComplete(Match.state)) return getBallPose();

  const { runtime, events } = advanceShotRuntime(Ball.runtime, {
    dt,
    saveSegments: getFamiliarSaveSegments(),
  });
  syncBallFromRuntime(runtime);

  for (const event of events) {
    if (event.type !== 'shot-resolved') continue;

    applyMatchShotOutcome(event.result?.outcome ?? event.outcome);
  }

  return getBallPose();
}

export function getBallPose() {
  const sample = getShotPose(Ball.runtime);

  if (!sample) {
    return {
      x: PITCH_CENTER_X,
      y: GROUND_Y + BALL_RADIUS,
      z: BALL_MAX_Z,
      radius: BALL_RADIUS,
      scale: 1,
      color: '#ffffff',
      shadow: {
        x: PITCH_CENTER_X,
        y: GROUND_Y,
        scale: BALL_SHADOW_SCALE,
        opacity: BALL_SHADOW_OPACITY,
      },
      hex: Ball.shot?.hex,
      saveResult: null,
    };
  }

  return {
    x: sample.x,
    y: sample.y,
    z: sample.z,
    radius: sample.radius,
    scale: sample.scale,
    color: sample.color,
    shadow: { ...sample.shadow },
    hex: Ball.shot?.hex,
    saveResult: cloneSaveResult(sample.saveResult),
  };
}

export function getSaveState() {
  const feedback = getFeedbackState(Ball.runtime);

  return {
    saves: Match.state.saves,
    deflections: Match.state.deflections,
    conceded: Match.state.conceded,
    feedbackTimer: feedback?.timer ?? 0,
    lastResult: cloneSaveResult(feedback?.lastResult),
    summary: getShotResolutionSummary(),
  };
}

export function getMatchState() {
  return {
    ...Match.state,
  };
}

export function getShotPlanDebugInfo() {
  return describeShotPlan(Match.plan);
}

function setFamiliarPoseFromTorso(torsoPos) {
  Familiar.torsoPos = vec2(torsoPos.x, torsoPos.y);
  Familiar.headPos = vec2(torsoPos.x + FAMILIAR_BODY_OFFSETS.head.x, torsoPos.y + FAMILIAR_BODY_OFFSETS.head.y);
  Familiar.leftShoulder = vec2(
    torsoPos.x + FAMILIAR_BODY_OFFSETS.leftShoulder.x,
    torsoPos.y + FAMILIAR_BODY_OFFSETS.leftShoulder.y,
  );
  Familiar.rightShoulder = vec2(
    torsoPos.x + FAMILIAR_BODY_OFFSETS.rightShoulder.x,
    torsoPos.y + FAMILIAR_BODY_OFFSETS.rightShoulder.y,
  );
  Familiar.leftHip = vec2(torsoPos.x + FAMILIAR_BODY_OFFSETS.leftHip.x, torsoPos.y + FAMILIAR_BODY_OFFSETS.leftHip.y);
  Familiar.rightHip = vec2(torsoPos.x + FAMILIAR_BODY_OFFSETS.rightHip.x, torsoPos.y + FAMILIAR_BODY_OFFSETS.rightHip.y);
  Familiar.leftKnee = vec2(torsoPos.x + FAMILIAR_BODY_OFFSETS.leftKnee.x, torsoPos.y + FAMILIAR_BODY_OFFSETS.leftKnee.y);
  Familiar.rightKnee = vec2(torsoPos.x + FAMILIAR_BODY_OFFSETS.rightKnee.x, torsoPos.y + FAMILIAR_BODY_OFFSETS.rightKnee.y);
  Familiar.leftFoot = vec2(torsoPos.x + FAMILIAR_BODY_OFFSETS.leftFoot.x, torsoPos.y + FAMILIAR_BODY_OFFSETS.leftFoot.y);
  Familiar.rightFoot = vec2(torsoPos.x + FAMILIAR_BODY_OFFSETS.rightFoot.x, torsoPos.y + FAMILIAR_BODY_OFFSETS.rightFoot.y);
}

function updateFamiliarBodyRig(target, dt = 1 / 60) {
  const pose = solveTorsoDrag({
    torso: Familiar.torsoPos,
    target,
    shoulders: [FAMILIAR_BODY_OFFSETS.leftShoulder, FAMILIAR_BODY_OFFSETS.rightShoulder],
    maxReach: FAMILIAR_UPPER_ARM_LENGTH + FAMILIAR_FOREARM_LENGTH,
    maxSpeed: FAMILIAR_TORSO_DRAG_MAX_SPEED,
    dt,
  });

  setFamiliarPoseFromTorso(vec2(pose.torso.x, Familiar.torsoPos.y));
  return pose;
}

function applyHandIk(side, target) {
  const config = FAMILIAR_HAND_IK[side];
  const pose = solveIkChain({
    shoulder: Familiar[`${side}Shoulder`],
    target,
    upperLength: FAMILIAR_UPPER_ARM_LENGTH,
    lowerLength: FAMILIAR_FOREARM_LENGTH,
    elbowSign: config.elbowSign,
    fallbackDirection: config.fallbackDirection,
  });

  Familiar[`${side}Elbow`] = vec2(pose.elbow.x, pose.elbow.y);
  Familiar[`${side}Hand`] = vec2(pose.hand.x, pose.hand.y);
  return pose;
}

export function applyLeftHandIk(target) {
  return applyHandIk('left', target);
}

export function applyRightHandIk(target) {
  return applyHandIk('right', target);
}

function getDiveBodyModel() {
  return {
    torso: { x: Familiar.torsoPos.x, y: Familiar.torsoPos.y },
    shoulders: [
      { x: Familiar.leftShoulder.x, y: Familiar.leftShoulder.y },
      { x: Familiar.rightShoulder.x, y: Familiar.rightShoulder.y },
    ],
    upperArmLength: FAMILIAR_UPPER_ARM_LENGTH,
    forearmLength: FAMILIAR_FOREARM_LENGTH,
    handRadius: Familiar.handRadius,
  };
}

function clearDivePoseFromFamiliar() {
  const pose = Dive.visualPose;
  setFamiliarPoseFromTorso(vec2(
    Familiar.torsoPos.x - pose.torso.x,
    Familiar.torsoPos.y - pose.torso.y,
  ));
  Dive.visualPose = cloneDiveVisualPose();
}

function applyDivePoseToFamiliar(diveState, bodyModel) {
  if (!isDiveActive(diveState)) return { isActive: false, offset: { x: 0, y: 0 }, reachBonus: 0 };

  const effectiveReach = deriveEffectiveReach(bodyModel);
  const reachBonus = effectiveReach * DEFAULT_DIVE_CONFIG.reachBonusScale;
  const extension = diveState.pose.extension;
  const verticalLift = Math.max(0, diveState.direction.y) * reachBonus * FAMILIAR_DIVE_VERTICAL_LIFT_SCALE;
  const torsoOffset = {
    x: diveState.direction.x * reachBonus * extension,
    y: verticalLift * extension,
  };
  const headOffset = {
    x: torsoOffset.x + diveState.direction.x * reachBonus * extension * FAMILIAR_DIVE_HEAD_LEAD_SCALE,
    y: torsoOffset.y + verticalLift * FAMILIAR_DIVE_HEAD_LEAD_SCALE,
  };
  const shoulderOffset = {
    x: torsoOffset.x + diveState.direction.x * reachBonus * extension * FAMILIAR_DIVE_SHOULDER_LEAD_SCALE,
    y: torsoOffset.y,
  };

  setFamiliarPoseFromTorso(vec2(
    Familiar.torsoPos.x + torsoOffset.x,
    Familiar.torsoPos.y + torsoOffset.y,
  ));
  Dive.visualPose = { torso: torsoOffset, head: headOffset, shoulders: shoulderOffset };

  return { isActive: true, offset: torsoOffset, reachBonus, extension };
}

export function applyKeeperHandIk(target, dt = 1 / 60) {
  clearDivePoseFromFamiliar();
  const triggerBody = getDiveBodyModel();
  const origin = triggerBody.torso;

  Dive.state = advanceDiveState(Dive.state, dt);
  if (!isDiveActive(Dive.state)) {
    const trigger = shouldTriggerDive({
      cursorTarget: target,
      origin,
      body: triggerBody,
      shot: Ball.shot,
    });
    if (!trigger.shouldTrigger) {
      Dive.canTrigger = true;
    } else if (Dive.canTrigger) {
      Dive.state = advanceDiveState(startDive(Dive.state, { cursorTarget: target, origin }), dt);
      Dive.canTrigger = false;
    }
  }

  const body = updateFamiliarBodyRig(target, dt);
  const dive = applyDivePoseToFamiliar(Dive.state, getDiveBodyModel());

  return {
    body,
    dive,
    left: applyLeftHandIk(target),
    right: applyRightHandIk(target),
  };
}

export function updateKeeperIk(projectedMousePos, dt = 1 / 60) {
  return applyKeeperHandIk(goalPlaneFromProjectedMouse(projectedMousePos), dt);
}

export function getDiveState() {
  return {
    ...Dive.state,
    direction: Dive.state.direction ? { ...Dive.state.direction } : null,
    triggerTarget: Dive.state.triggerTarget ? { ...Dive.state.triggerTarget } : null,
    triggerOrigin: Dive.state.triggerOrigin ? { ...Dive.state.triggerOrigin } : null,
    pose: { ...Dive.state.pose },
  };
}

export function getFamiliarPose() {
  return {
    torso: { x: Familiar.torsoPos.x, y: Familiar.torsoPos.y },
    head: { x: Familiar.headPos.x, y: Familiar.headPos.y },
    leftShoulder: { x: Familiar.leftShoulder.x, y: Familiar.leftShoulder.y },
    rightShoulder: { x: Familiar.rightShoulder.x, y: Familiar.rightShoulder.y },
    leftElbow: { x: Familiar.leftElbow.x, y: Familiar.leftElbow.y },
    rightElbow: { x: Familiar.rightElbow.x, y: Familiar.rightElbow.y },
    leftHand: { x: Familiar.leftHand.x, y: Familiar.leftHand.y },
    rightHand: { x: Familiar.rightHand.x, y: Familiar.rightHand.y },
    leftHip: { x: Familiar.leftHip.x, y: Familiar.leftHip.y },
    rightHip: { x: Familiar.rightHip.x, y: Familiar.rightHip.y },
    leftKnee: { x: Familiar.leftKnee.x, y: Familiar.leftKnee.y },
    rightKnee: { x: Familiar.rightKnee.x, y: Familiar.rightKnee.y },
    leftFoot: { x: Familiar.leftFoot.x, y: Familiar.leftFoot.y },
    rightFoot: { x: Familiar.rightFoot.x, y: Familiar.rightFoot.y },
  };
}

export function getFamiliarSaveSegments() {
  return [
    { id: 'torso', center: Familiar.torsoPos, radius: Familiar.torsoRadius },
    { id: 'leftUpperArm', start: Familiar.leftShoulder, end: Familiar.leftElbow, radius: FAMILIAR_UPPER_ARM_THICKNESS / 2 },
    { id: 'leftForearm', start: Familiar.leftElbow, end: Familiar.leftHand, radius: FAMILIAR_FOREARM_THICKNESS / 2 },
    { id: 'leftHand', center: Familiar.leftHand, radius: Familiar.handRadius },
    { id: 'rightUpperArm', start: Familiar.rightShoulder, end: Familiar.rightElbow, radius: FAMILIAR_UPPER_ARM_THICKNESS / 2 },
    { id: 'rightForearm', start: Familiar.rightElbow, end: Familiar.rightHand, radius: FAMILIAR_FOREARM_THICKNESS / 2 },
    { id: 'rightHand', center: Familiar.rightHand, radius: Familiar.handRadius },
    { id: 'leftThigh', type: 'deflection', start: Familiar.leftHip, end: Familiar.leftKnee, radius: FAMILIAR_THIGH_THICKNESS / 2 },
    { id: 'leftShin', type: 'deflection', start: Familiar.leftKnee, end: Familiar.leftFoot, radius: FAMILIAR_SHIN_THICKNESS / 2 },
    { id: 'leftFoot', type: 'deflection', center: Familiar.leftFoot, radius: Familiar.footRadius },
    { id: 'rightThigh', type: 'deflection', start: Familiar.rightHip, end: Familiar.rightKnee, radius: FAMILIAR_THIGH_THICKNESS / 2 },
    { id: 'rightShin', type: 'deflection', start: Familiar.rightKnee, end: Familiar.rightFoot, radius: FAMILIAR_SHIN_THICKNESS / 2 },
    { id: 'rightFoot', type: 'deflection', center: Familiar.rightFoot, radius: Familiar.footRadius },
  ];
}

function clamp01(value) {
  return clamp(value, 0, 1);
}

function pointDelta(a, b) {
  return vec2(b.x - a.x, b.y - a.y);
}

function pointLength(point) {
  return Math.hypot(point.x, point.y);
}

function normalizePoint(point) {
  const length = pointLength(point);
  return length > 0 ? vec2(point.x / length, point.y / length) : vec2(0, 0);
}





function jointBend(start, joint, end) {
  const incoming = normalizePoint(pointDelta(joint, start));
  const outgoing = normalizePoint(pointDelta(joint, end));
  const dot = clamp(incoming.x * outgoing.x + incoming.y * outgoing.y, -1, 1);
  return Math.acos(dot);
}

function segmentStress(start, joint, end, restLength, diveBias = 0) {
  const reach = Math.hypot(end.x - start.x, end.y - start.y) / Math.max(restLength, 0.0001);
  const extension = clamp01((reach - 0.64) / 0.36);
  const straightness = clamp01(1 - jointBend(start, joint, end) / Math.PI);
  return {
    extension,
    straightness,
    bend: clamp01(1 - straightness),
    stress: clamp01(extension * 0.62 + straightness * 0.38 + diveBias),
    flap: clamp01(extension * 0.52 + straightness * 0.3 + diveBias * 0.8),
  };
}

export function getFamiliarPapercraftState(pose = getFamiliarPose(), diveState = getDiveState()) {
  if (!pose) {
    return {
      torso: { shiftX: 0, liftY: 0, lean: 0, squash: 0, flap: 0 },
      head: { lagX: 0, lagY: 0, wobble: 0, flap: 0 },
      leftArm: { extension: 0, straightness: 0, bend: 0, stress: 0, flap: 0 },
      rightArm: { extension: 0, straightness: 0, bend: 0, stress: 0, flap: 0 },
      leftLeg: { extension: 0, straightness: 0, bend: 0, stress: 0, flap: 0 },
      rightLeg: { extension: 0, straightness: 0, bend: 0, stress: 0, flap: 0 },
    };
  }

  const diveExtension = clamp01(diveState?.pose?.extension ?? 0);
  const diveDirection = diveState?.direction ?? { x: 0, y: 0 };
  const torsoShiftX = clamp01(Math.abs(pose.torso.x - PITCH_CENTER_X) / 2.4);
  const torsoLiftY = clamp01(Math.max(0, pose.torso.y - (GROUND_Y + FAMILIAR_INIT_TORSO_Y)) / 0.85);
  const torsoLean = clamp01(torsoShiftX * 0.5 + Math.abs(diveDirection.x) * diveExtension * 0.35);
  const torsoSquash = clamp01(torsoShiftX * 0.28 + torsoLiftY * 0.52 + diveExtension * 0.7);
  const torsoFlap = clamp01(torsoShiftX * 0.4 + torsoLiftY * 0.25 + diveExtension * 0.9);
  const headOffsetX = pose.head.x - pose.torso.x - FAMILIAR_BODY_OFFSETS.head.x;
  const headOffsetY = pose.head.y - pose.torso.y - FAMILIAR_BODY_OFFSETS.head.y;
  const headLagX = clamp01(Math.abs(headOffsetX) / 0.95 + torsoShiftX * 0.2);
  const headLagY = clamp01(Math.max(0, headOffsetY) / 0.55 + torsoLiftY * 0.5);
  const headWobble = clamp01(Math.hypot(headOffsetX, headOffsetY) / 1.05 + diveExtension * 0.45);
  const headFlap = clamp01(headWobble * 0.8 + torsoShiftX * 0.2);
  const limbBias = torsoShiftX * 0.15 + diveExtension * 0.45 + torsoLiftY * 0.2;

  return {
    torso: {
      shiftX: torsoShiftX,
      liftY: torsoLiftY,
      lean: torsoLean,
      squash: torsoSquash,
      flap: torsoFlap,
    },
    head: {
      lagX: headLagX,
      lagY: headLagY,
      wobble: headWobble,
      flap: headFlap,
    },
    leftArm: segmentStress(pose.leftShoulder, pose.leftElbow, pose.leftHand, FAMILIAR_UPPER_ARM_LENGTH + FAMILIAR_FOREARM_LENGTH, limbBias),
    rightArm: segmentStress(pose.rightShoulder, pose.rightElbow, pose.rightHand, FAMILIAR_UPPER_ARM_LENGTH + FAMILIAR_FOREARM_LENGTH, limbBias),
    leftLeg: segmentStress(pose.leftHip, pose.leftKnee, pose.leftFoot, FAMILIAR_THIGH_LENGTH + FAMILIAR_SHIN_LENGTH, torsoShiftX * 0.08 + diveExtension * 0.18),
    rightLeg: segmentStress(pose.rightHip, pose.rightKnee, pose.rightFoot, FAMILIAR_THIGH_LENGTH + FAMILIAR_SHIN_LENGTH, torsoShiftX * 0.08 + diveExtension * 0.18),
  };
}

function project(x3d, y3d, depthFromCamera) {
  // depthFromCamera = BALL_MAX_Z - z3d -> z3d = BALL_MAX_Z - depthFromCamera
  const z3d = BALL_MAX_Z - depthFromCamera;

  const xProj = x3d;
  const yProj = y3d * COS_THETA - z3d * SIN_THETA;
  return {
    pos: vec2(xProj, yProj),
    scale: 1.0, // uniform scale in orthographic projection
  };
}

function drawGoal() {
  const goalDepth = BALL_MAX_Z;

  // 1. Draw ground/pitch line at goal plane depth
  const gL = project(-GROUND_HALF_WIDTH, GROUND_Y, goalDepth);
  const gR = project(GROUND_HALF_WIDTH, GROUND_Y, goalDepth);
  drawLine(gL.pos, gR.pos, GROUND_LINE_THICKNESS * gL.scale, COLOR_GROUND_LINE);

  // 2. Draw Goal Frame — posts and crossbar projected from 3D at z=0
  const postBotL = project(GOAL_LEFT_POST.x, GOAL_LEFT_POST.y, goalDepth);
  const postTopL = project(GOAL_CROSSBAR_LEFT.x, GOAL_CROSSBAR_LEFT.y, goalDepth);
  const postBotR = project(GOAL_RIGHT_POST.x, GOAL_RIGHT_POST.y, goalDepth);
  const postTopR = project(GOAL_CROSSBAR_RIGHT.x, GOAL_CROSSBAR_RIGHT.y, goalDepth);
  const lineW = GOAL_POST_THICKNESS * postBotL.scale;
  drawLine(postBotL.pos, postTopL.pos, lineW, COLOR_GOAL_FRAME); // left post
  drawLine(postBotR.pos, postTopR.pos, lineW, COLOR_GOAL_FRAME); // right post
  drawLine(postTopL.pos, postTopR.pos, lineW, COLOR_GOAL_FRAME); // crossbar
}

function drawPapercraftCircle(pos, radius, fillColor, outlineColor, stress = 0) {
  const borderThickness = 0.065 + stress * 0.02;
  drawCircle(pos, radius, fillColor, borderThickness, outlineColor);
}

function drawPaperLimb(start, joint, end, width, stress) {
  drawLine(start, joint, width * (1 + stress * 0.12), COLOR_FAMILIAR_ARM);
  drawLine(joint, end, width * 0.9 * (1 + stress * 0.12), COLOR_FAMILIAR_ARM);
}

function drawKeeper() {
  const goalDepth = BALL_MAX_Z;
  const fam = (x, y) => project(x, y, goalDepth);
  const reveal = getFamiliarRevealState();
  const paper = getFamiliarPapercraftState();
  const revealGlowScale = 1 + reveal.visibility * 0.35;

  const torsoAnchor = fam(Familiar.torsoPos.x, Familiar.torsoPos.y);
  const head = fam(Familiar.headPos.x, Familiar.headPos.y);
  const headPosWithLag = vec2(
    head.pos.x + (paper.head.lagX - 0.5) * 0.08 * Math.sign(Familiar.rightShoulder.x - Familiar.leftShoulder.x || 1),
    head.pos.y - paper.head.lagY * 0.12,
  );

  // Draw neck connection
  const neckWidth = 0.22 * torsoAnchor.scale;
  drawLine(torsoAnchor.pos, headPosWithLag, neckWidth, COLOR_FAMILIAR_ARM);

  drawPapercraftCircle(
    torsoAnchor.pos,
    Familiar.torsoRadius * torsoAnchor.scale,
    COLOR_FAMILIAR_TORSO.copy().setAlpha(0.85),
    COLOR_FAMILIAR_TORSO,
    paper.torso.squash,
  );

  drawPapercraftCircle(
    headPosWithLag,
    Familiar.headRadius * head.scale,
    COLOR_FAMILIAR_HEAD.copy().setAlpha(0.85),
    COLOR_FAMILIAR_HEAD,
    paper.head.wobble,
  );

  if (reveal.isActive) {
    const leftEye = vec2(
      head.pos.x - FAMILIAR_REVEAL_EYE_OFFSET_X * revealGlowScale,
      head.pos.y + FAMILIAR_REVEAL_EYE_OFFSET_Y * revealGlowScale,
    );
    const rightEye = vec2(
      head.pos.x + FAMILIAR_REVEAL_EYE_OFFSET_X * revealGlowScale,
      head.pos.y + FAMILIAR_REVEAL_EYE_OFFSET_Y * revealGlowScale,
    );
    const tailStart = vec2(
      torsoAnchor.pos.x + FAMILIAR_REVEAL_TAIL_OFFSET_X,
      torsoAnchor.pos.y + FAMILIAR_REVEAL_TAIL_OFFSET_Y,
    );
    const tailEnd = vec2(
      tailStart.x - FAMILIAR_REVEAL_TAIL_LENGTH * revealGlowScale,
      tailStart.y - FAMILIAR_REVEAL_TAIL_LENGTH * 0.15,
    );
    const tailTip = vec2(
      tailEnd.x - FAMILIAR_REVEAL_TAIL_LENGTH * 0.08,
      tailEnd.y + FAMILIAR_REVEAL_TAIL_LENGTH * 0.06,
    );

    drawCircle(
      head.pos,
      Familiar.headRadius * head.scale * 1.08 * revealGlowScale,
      FAMILIAR_REVEAL_AURA_COLOR,
    );
    drawCircle(
      leftEye,
      Familiar.headRadius * 0.09 * revealGlowScale,
      FAMILIAR_REVEAL_EYE_GLOW_COLOR,
    );
    drawCircle(
      rightEye,
      Familiar.headRadius * 0.09 * revealGlowScale,
      FAMILIAR_REVEAL_EYE_GLOW_COLOR,
    );
    drawLine(
      tailStart,
      tailEnd,
      FAMILIAR_REVEAL_TAIL_WIDTH * revealGlowScale,
      FAMILIAR_REVEAL_TAIL_COLOR,
    );
    drawCircle(
      tailTip,
      FAMILIAR_REVEAL_TAIL_WIDTH * 1.2 * revealGlowScale,
      FAMILIAR_REVEAL_TAIL_COLOR,
    );
  }

  const lShoulder = fam(Familiar.leftShoulder.x, Familiar.leftShoulder.y);
  const lElbow = fam(Familiar.leftElbow.x, Familiar.leftElbow.y);
  const lHand = fam(Familiar.leftHand.x, Familiar.leftHand.y);
  const rShoulder = fam(Familiar.rightShoulder.x, Familiar.rightShoulder.y);
  const rElbow = fam(Familiar.rightElbow.x, Familiar.rightElbow.y);
  const rHand = fam(Familiar.rightHand.x, Familiar.rightHand.y);
  const lHip = fam(Familiar.leftHip.x, Familiar.leftHip.y);
  const lKnee = fam(Familiar.leftKnee.x, Familiar.leftKnee.y);
  const lFoot = fam(Familiar.leftFoot.x, Familiar.leftFoot.y);
  const rHip = fam(Familiar.rightHip.x, Familiar.rightHip.y);
  const rKnee = fam(Familiar.rightKnee.x, Familiar.rightKnee.y);
  const rFoot = fam(Familiar.rightFoot.x, Familiar.rightFoot.y);

  drawPaperLimb(lShoulder.pos, lElbow.pos, lHand.pos, FAMILIAR_UPPER_ARM_THICKNESS, paper.leftArm.stress);
  drawPaperLimb(rShoulder.pos, rElbow.pos, rHand.pos, FAMILIAR_UPPER_ARM_THICKNESS, paper.rightArm.stress);
  drawPaperLimb(lHip.pos, lKnee.pos, lFoot.pos, FAMILIAR_THIGH_THICKNESS, paper.leftLeg.stress * 0.88);
  drawPaperLimb(rHip.pos, rKnee.pos, rFoot.pos, FAMILIAR_THIGH_THICKNESS, paper.rightLeg.stress * 0.88);

  drawPapercraftCircle(lHand.pos, Familiar.handRadius * lHand.scale, COLOR_FAMILIAR_HAND.copy().setAlpha(0.85), COLOR_FAMILIAR_HAND, paper.leftArm.flap);
  drawPapercraftCircle(rHand.pos, Familiar.handRadius * rHand.scale, COLOR_FAMILIAR_HAND.copy().setAlpha(0.85), COLOR_FAMILIAR_HAND, paper.rightArm.flap);
  drawPapercraftCircle(lFoot.pos, Familiar.footRadius * lFoot.scale, COLOR_FAMILIAR_ARM.copy().setAlpha(0.85), COLOR_FAMILIAR_ARM, paper.leftLeg.flap);
  drawPapercraftCircle(rFoot.pos, Familiar.footRadius * rFoot.scale, COLOR_FAMILIAR_ARM.copy().setAlpha(0.85), COLOR_FAMILIAR_ARM, paper.rightLeg.flap);
}

function drawBall() {
  // Ball starts near camera (z=MAX_Z) and approaches goal (z=0).
  // depthFromCamera = how far the ball is from the camera lens.
  const ball = getBallPose();
  const depthFromCamera = BALL_MAX_Z - ball.z; // 0 = near camera, MAX_Z = at goal
  const { pos: ballPos } = project(ball.x, ball.y, depthFromCamera);

  // Draw Ground Shadow projected on the ground plane at GROUND_Y.
  // The trajectory sample shrinks/fades this shadow as height increases.
  const { pos: shadowPos } = project(ball.shadow.x, ball.shadow.y, depthFromCamera);
  const shadowRadius = ball.radius * ball.scale * BALL_SHADOW_SCALE * ball.shadow.scale;
  drawCircle(shadowPos, shadowRadius, rgb(1, 1, 1, ball.shadow.opacity));

  drawTutorialShotTelegraph();

  // Draw projected Ball with per-hex tint. Orthographic projection keeps size constant.
  drawCircle(ballPos, ball.radius * ball.scale, ball.color ? c(ball.color) : COLOR_BALL);
  // Ball outline/inner detail to distinguish it.
  drawCircle(ballPos, ball.radius * ball.scale * BALL_DETAIL_SCALE, COLOR_BALL_DETAIL);
}

export function getTutorialShotTelegraph(runtime = Ball.runtime) {
  const shot = runtime?.activeShot;
  if (!shot || runtime.shotResolved || runtime.activeShotIndex >= TUTORIAL_SHOT_TELEGRAPH_SHOTS) {
    return null;
  }

  const visibility = clamp(1 - (shot.elapsed ?? 0) / TUTORIAL_SHOT_TELEGRAPH_FADE_DURATION, 0, 1);
  if (visibility <= 0) {
    return null;
  }

  return {
    shotIndex: runtime.activeShotIndex,
    visibility,
    points: sampleShotPath(shot, TUTORIAL_SHOT_TELEGRAPH_SEGMENTS),
  };
}

function drawTutorialShotTelegraph() {
  const telegraph = getTutorialShotTelegraph();
  if (!telegraph) return;

  const pathColor = rgb(0.87, 0.96, 1, telegraph.visibility * 0.4);
  const targetColor = rgb(1, 1, 1, telegraph.visibility * 0.55);
  const startColor = rgb(0.87, 0.96, 1, telegraph.visibility * 0.28);

  for (let index = 1; index < telegraph.points.length; index += 1) {
    const previous = telegraph.points[index - 1];
    const current = telegraph.points[index];
    const previousProjection = project(previous.x, previous.y, BALL_MAX_Z - previous.z);
    const currentProjection = project(current.x, current.y, BALL_MAX_Z - current.z);

    drawLine(previousProjection.pos, currentProjection.pos, 0.045, pathColor);
  }

  const start = telegraph.points[0];
  const target = telegraph.points[telegraph.points.length - 1];
  const startProjection = project(start.x, start.y, BALL_MAX_Z - start.z);
  const targetProjection = project(target.x, target.y, BALL_MAX_Z - target.z);

  drawCircle(targetProjection.pos, 0.18, targetColor);
  drawCircle(targetProjection.pos, 0.075, COLOR_TUTORIAL_SHOT_TELEGRAPH_CORE);
  drawCircle(startProjection.pos, 0.12, startColor);
}

export function gameRender() {
  drawGoal();
  drawKeeper();
  drawBall();
}

export function gameRenderPost() {
  drawSaveFeedback();
}

function drawSaveFeedback() {
  const centerX = mainCanvasSize.x / 2;
  drawTextScreen(
    `Shot ${Match.state.shotsTaken}/${Match.state.totalShots}   Saves ${Match.state.saves}   Deflections ${Match.state.deflections}   Goals ${Match.state.conceded}   Score ${Match.state.ongoingScore}`,
    vec2(centerX, 34),
    28,
    COLOR_SCORE_FEEDBACK,
    3,
    COLOR_STADIUM_NIGHT,
  );

  const feedback = getFeedbackState(Ball.runtime);
  const summary = getShotResolutionSummary();
  const hasOutcomeFeedback = Boolean(feedback?.lastResult && feedback.timer > 0);
  const outcomeY = 86;
  const matchBannerY = hasOutcomeFeedback ? 136 : 86;
  const finalScoreY = hasOutcomeFeedback ? 186 : 136;
  const summaryY = isMatchComplete(Match.state)
    ? (hasOutcomeFeedback ? 232 : 186)
    : 136;

  if (hasOutcomeFeedback) {
    const resultFeedback = getShotResultFeedback(feedback.lastResult.outcome);
    drawTextScreen(
      resultFeedback.label,
      vec2(centerX, outcomeY),
      56,
      resultFeedback.color,
      5,
      COLOR_STADIUM_NIGHT,
    );
  }

  if (summary && (hasOutcomeFeedback || isMatchComplete(Match.state))) {
    const shotSummary = summary.shotIndex == null
      ? 'Shot ?'
      : `Shot ${summary.shotIndex + 1}`;
    const designSummary = [
      summary.hex,
      `${summary.originLane ?? '?'} -> ${summary.targetLane ?? '?'}`,
      summary.placementHeight ?? '?',
      summary.difficultyBand ?? 'unknown band',
      summary.intendedFailureMode ?? 'unknown failure mode',
    ].join('   ');
    drawTextScreen(
      `${summary.saveQuality === 'clean-save' ? 'Clean Save' : summary.saveQuality === 'deflection' ? 'Deflection' : 'Concession'}   ${summary.label}   Δ${summary.scoreDelta}   ${formatContactSegments(summary.contactSegments)}`,
      vec2(centerX, summaryY),
      18,
      COLOR_SCORE_FEEDBACK,
      2,
      COLOR_STADIUM_NIGHT,
    );
    drawTextScreen(
      `${shotSummary}   ${designSummary}   ${formatPressureTags(summary.pressureTags)}`,
      vec2(centerX, summaryY + 24),
      14,
      COLOR_SCORE_FEEDBACK,
      1,
      COLOR_STADIUM_NIGHT,
    );
  }

  if (isMatchComplete(Match.state)) {
    drawTextScreen(
      Match.state.status === 'won' ? 'MATCH WON!' : 'MATCH LOST',
      vec2(centerX, matchBannerY),
      48,
      Match.state.status === 'won' ? COLOR_SAVE_FEEDBACK : COLOR_MISS_FEEDBACK,
      5,
      COLOR_STADIUM_NIGHT,
    );
    drawTextScreen(
      `Final Score ${Match.state.score}`,
      vec2(centerX, finalScoreY),
      32,
      COLOR_SCORE_FEEDBACK,
      4,
      COLOR_STADIUM_NIGHT,
    );
  }
}

// Startup LittleJS Engine only if running in a browser environment
configureResponsiveCanvas();
if (typeof window !== 'undefined') {
  engineInit(gameInit, gameUpdate, gameUpdatePost, gameRender, gameRenderPost, []);
}

// Force page reload on hot reload for stability
if (import.meta.hot) import.meta.hot.accept(() => location.reload());
