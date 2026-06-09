import {
  engineInit,
  vec2, setCameraPos, setCameraScale,
  drawLine, drawCircle, drawTextScreen,
  rgb, Color, setCanvasClearColor,
  mousePos, timeDelta, mainCanvasSize
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
import { DEFAULT_SHOT_PLAN_SEED, createShotPlan, describeShotPlan } from './shotPlan.js';
import { createMatchState, isMatchComplete, recordShotResult } from './matchState.js';
import {
  advanceShotRuntime,
  createShotRuntime,
  recordShotRuntimeOutcome,
  queueNextShot,
} from './shotRuntime.js';

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
const COLOR_MISS_FEEDBACK = c('#ff6677');
const COLOR_SCORE_FEEDBACK = c('#d7e8ff');

const GOAL_LEFT_POST = vec2(PITCH_CENTER_X - GOAL_WIDTH / 2, GROUND_Y);
const GOAL_RIGHT_POST = vec2(PITCH_CENTER_X + GOAL_WIDTH / 2, GROUND_Y);
const GOAL_CROSSBAR_LEFT = vec2(PITCH_CENTER_X - GOAL_WIDTH / 2, GROUND_Y + GOAL_HEIGHT);
const GOAL_CROSSBAR_RIGHT = vec2(PITCH_CENTER_X + GOAL_WIDTH / 2, GROUND_Y + GOAL_HEIGHT);

// --- Goalkeeper (Familiar) Initial Joints/Structure ---
const FAMILIAR_TORSO_RADIUS = 0.65;
const FAMILIAR_HEAD_RADIUS = 0.45;
const FAMILIAR_HAND_RADIUS = 0.3;
const FAMILIAR_UPPER_ARM_THICKNESS = 0.18;
const FAMILIAR_FOREARM_THICKNESS = 0.15;
const COLOR_FAMILIAR_TORSO = c('#4d82cb');
const COLOR_FAMILIAR_HEAD = c('#2c4d7e');
const COLOR_FAMILIAR_ARM = c('#3d6db0');
const COLOR_FAMILIAR_HAND = c('#d95763');

// Initial joint layout offsets (in meters relative to ground/center)
const FAMILIAR_INIT_HEAD_Y = 1.7;
const FAMILIAR_INIT_TORSO_Y = 1;
const FAMILIAR_INIT_SHOULDER_X = 0.3;
const FAMILIAR_INIT_SHOULDER_Y = 1.2;
const FAMILIAR_INIT_ELBOW_X = 0.8;
const FAMILIAR_INIT_ELBOW_Y = 0.9;
const FAMILIAR_INIT_HAND_X = 1.2;
const FAMILIAR_INIT_HAND_Y = 1.2;
const FAMILIAR_UPPER_ARM_LENGTH = Math.hypot(
  FAMILIAR_INIT_ELBOW_X - FAMILIAR_INIT_SHOULDER_X,
  FAMILIAR_INIT_ELBOW_Y - FAMILIAR_INIT_SHOULDER_Y,
);
const FAMILIAR_FOREARM_LENGTH = Math.hypot(
  FAMILIAR_INIT_HAND_X - FAMILIAR_INIT_ELBOW_X,
  FAMILIAR_INIT_HAND_Y - FAMILIAR_INIT_ELBOW_Y,
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
const FAMILIAR_TORSO_DRAG_MAX_SPEED = 2.2; // meters/second; intentionally heavy
const FAMILIAR_DIVE_VERTICAL_LIFT_SCALE = 0.32;
const FAMILIAR_DIVE_HEAD_LEAD_SCALE = 0.45;
const FAMILIAR_DIVE_SHOULDER_LEAD_SCALE = 0.28;
const FAMILIAR_BODY_OFFSETS = {
  head: { x: 0, y: FAMILIAR_INIT_HEAD_Y - FAMILIAR_INIT_TORSO_Y },
  leftShoulder: { x: -FAMILIAR_INIT_SHOULDER_X, y: FAMILIAR_INIT_SHOULDER_Y - FAMILIAR_INIT_TORSO_Y },
  rightShoulder: { x: FAMILIAR_INIT_SHOULDER_X, y: FAMILIAR_INIT_SHOULDER_Y - FAMILIAR_INIT_TORSO_Y },
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
  torsoRadius: FAMILIAR_TORSO_RADIUS,
  headRadius: FAMILIAR_HEAD_RADIUS,
  handRadius: FAMILIAR_HAND_RADIUS,
};

// --- Ball Structure at Spawn ---
const BALL_RADIUS = 0.45;           // larger than real ball (0.11m) for visual clarity
const BALL_MAX_Z = 11.0;            // distance between starting position and goal line in Z axis
const BALL_SHADOW_SCALE = 0.9;
const BALL_SHADOW_OPACITY = 0.18;
const BALL_DETAIL_SCALE = 0.8;
const COLOR_BALL = c('#ffffff');
const COLOR_BALL_DETAIL = c('#AABBBB');
const SHOT_RESPAWN_DELAY = 0.35;
const SAVE_FEEDBACK_DURATION = 0.9;

const initialMatchState = createMatchState();
const Match = {
  state: initialMatchState,
  shotPlanSeed: DEFAULT_SHOT_PLAN_SEED,
  plan: createShotPlan(DEFAULT_SHOT_PLAN_SEED, { totalShots: initialMatchState.totalShots }),
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

const Dive = {
  state: createDiveState(),
  visualPose: cloneDiveVisualPose(),
  canTrigger: true,
};

const Ball = {
  x: PITCH_CENTER_X,             // centered on pitch
  y: GROUND_Y + BALL_RADIUS,     // rests on the ground
  z: BALL_MAX_Z,          // spawns at camera/penalty distance
  radius: BALL_RADIUS,
  scale: 1,
  color: '#ffffff',
  shadow: {
    x: PITCH_CENTER_X,
    y: GROUND_Y,
    scale: BALL_SHADOW_SCALE,
    opacity: BALL_SHADOW_OPACITY,
  },
  shot: null,
  shotIndex: 0,
  respawnTimer: 0,
  lastSaveResult: null,
  feedbackTimer: 0,
  saves: 0,
  conceded: 0,
  runtime: null,
};

// --- Camera & Projection Constants ---
const CAMERA_TILT_ANGLE = 40.0; // degrees, camera tilt down from horizon
const COS_THETA = Math.cos((CAMERA_TILT_ANGLE * Math.PI) / 180);
const SIN_THETA = Math.sin((CAMERA_TILT_ANGLE * Math.PI) / 180);
const CAMERA_CENTER_Y = -6.0;  // centers the scene vertically on screen
const CAMERA_SCALE = 96;       // fits the goal and ball on screen

function resetFamiliarPose() {
  Familiar.torsoPos = vec2(PITCH_CENTER_X, GROUND_Y + FAMILIAR_INIT_TORSO_Y);
  setFamiliarTorsoX(Familiar.torsoPos.x);
  Familiar.leftElbow = vec2(PITCH_CENTER_X - FAMILIAR_INIT_ELBOW_X, GROUND_Y + FAMILIAR_INIT_ELBOW_Y);
  Familiar.rightElbow = vec2(PITCH_CENTER_X + FAMILIAR_INIT_ELBOW_X, GROUND_Y + FAMILIAR_INIT_ELBOW_Y);
  Familiar.leftHand = vec2(PITCH_CENTER_X - FAMILIAR_INIT_HAND_X, GROUND_Y + FAMILIAR_INIT_HAND_Y);
  Familiar.rightHand = vec2(PITCH_CENTER_X + FAMILIAR_INIT_HAND_X, GROUND_Y + FAMILIAR_INIT_HAND_Y);
}

function cloneRuntimeShotSample(sample) {
  if (!sample) return null;

  return {
    ...sample,
    shadow: sample.shadow ? { ...sample.shadow } : null,
    saveResult: sample.saveResult ? { ...sample.saveResult } : null,
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

  const sample = runtime.activeShot?.sample;
  if (sample) {
    applyShotSample(sample);
  }

  Ball.shotIndex = runtime.activeShotIndex;
  Ball.respawnTimer = runtime.respawnTimer ?? 0;
  Ball.feedbackTimer = runtime.feedback?.timer ?? 0;
  Ball.lastSaveResult = runtime.feedback?.lastResult ? { ...runtime.feedback.lastResult } : null;
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
  setCameraPos(vec2(PITCH_CENTER_X, CAMERA_CENTER_Y));
  setCameraScale(CAMERA_SCALE);
  resetFamiliarPose();
  Dive.state = createDiveState();
  Dive.visualPose = cloneDiveVisualPose();
  Dive.canTrigger = true;
  Match.state = createMatchState();
  Match.shotPlanSeed = options.shotPlanSeed ?? createRuntimeShotPlanSeed();
  Match.plan = createShotPlan(Match.shotPlanSeed, { totalShots: Match.state.totalShots });
  Ball.runtime = createBallRuntime();
  Ball.saves = 0;
  Ball.conceded = 0;
  Ball.lastSaveResult = null;
  Ball.feedbackTimer = 0;
  syncBallFromRuntime(Ball.runtime);
}

export function gameUpdate() {
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
  Ball.saves = Match.state.saves;
  Ball.conceded = Match.state.conceded;

  if (Ball.runtime) {
    Ball.runtime = recordShotRuntimeOutcome(Ball.runtime, {
      nextShotIndex: Match.state.shotsTaken,
      matchComplete: isMatchComplete(Match.state),
    });
    syncBallFromRuntime(Ball.runtime);
  }

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

    applyMatchShotOutcome(event.result.outcome);
  }

  return getBallPose();
}

export function getBallPose() {
  return {
    x: Ball.x,
    y: Ball.y,
    z: Ball.z,
    radius: Ball.radius,
    scale: Ball.scale,
    color: Ball.color,
    shadow: { ...Ball.shadow },
    hex: Ball.shot?.hex,
    saveResult: Ball.lastSaveResult ? { ...Ball.lastSaveResult } : null,
  };
}

export function getSaveState() {
  return {
    saves: Ball.saves,
    conceded: Ball.conceded,
    feedbackTimer: Ball.feedbackTimer,
    lastResult: Ball.lastSaveResult ? { ...Ball.lastSaveResult } : null,
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

function setFamiliarTorsoX(x) {
  Familiar.torsoPos = vec2(x, Familiar.torsoPos.y);
  Familiar.headPos = vec2(x + FAMILIAR_BODY_OFFSETS.head.x, Familiar.torsoPos.y + FAMILIAR_BODY_OFFSETS.head.y);
  Familiar.leftShoulder = vec2(
    x + FAMILIAR_BODY_OFFSETS.leftShoulder.x,
    Familiar.torsoPos.y + FAMILIAR_BODY_OFFSETS.leftShoulder.y,
  );
  Familiar.rightShoulder = vec2(
    x + FAMILIAR_BODY_OFFSETS.rightShoulder.x,
    Familiar.torsoPos.y + FAMILIAR_BODY_OFFSETS.rightShoulder.y,
  );
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

  setFamiliarTorsoX(pose.torso.x);
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
  Familiar.torsoPos = vec2(Familiar.torsoPos.x - pose.torso.x, Familiar.torsoPos.y - pose.torso.y);
  Familiar.headPos = vec2(Familiar.headPos.x - pose.head.x, Familiar.headPos.y - pose.head.y);
  Familiar.leftShoulder = vec2(Familiar.leftShoulder.x - pose.shoulders.x, Familiar.leftShoulder.y - pose.shoulders.y);
  Familiar.rightShoulder = vec2(Familiar.rightShoulder.x - pose.shoulders.x, Familiar.rightShoulder.y - pose.shoulders.y);
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

  Familiar.torsoPos = vec2(Familiar.torsoPos.x + torsoOffset.x, Familiar.torsoPos.y + torsoOffset.y);
  Familiar.headPos = vec2(Familiar.headPos.x + headOffset.x, Familiar.headPos.y + headOffset.y);
  Familiar.leftShoulder = vec2(Familiar.leftShoulder.x + shoulderOffset.x, Familiar.leftShoulder.y + shoulderOffset.y);
  Familiar.rightShoulder = vec2(Familiar.rightShoulder.x + shoulderOffset.x, Familiar.rightShoulder.y + shoulderOffset.y);
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
  ];
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

function drawKeeper() {
  const goalDepth = BALL_MAX_Z;
  const fam = (x, y) => project(x, y, goalDepth);

  const torso = fam(Familiar.torsoPos.x, Familiar.torsoPos.y);
  drawCircle(torso.pos, Familiar.torsoRadius * torso.scale, COLOR_FAMILIAR_TORSO);

  const head = fam(Familiar.headPos.x, Familiar.headPos.y);
  drawCircle(head.pos, Familiar.headRadius * head.scale, COLOR_FAMILIAR_HEAD);

  const lShoulder = fam(Familiar.leftShoulder.x, Familiar.leftShoulder.y);
  const lElbow = fam(Familiar.leftElbow.x, Familiar.leftElbow.y);
  const lHand = fam(Familiar.leftHand.x, Familiar.leftHand.y);
  const rShoulder = fam(Familiar.rightShoulder.x, Familiar.rightShoulder.y);
  const rElbow = fam(Familiar.rightElbow.x, Familiar.rightElbow.y);
  const rHand = fam(Familiar.rightHand.x, Familiar.rightHand.y);

  drawLine(lShoulder.pos, lElbow.pos, FAMILIAR_UPPER_ARM_THICKNESS * lShoulder.scale, COLOR_FAMILIAR_ARM);
  drawLine(lElbow.pos, lHand.pos, FAMILIAR_FOREARM_THICKNESS * lElbow.scale, COLOR_FAMILIAR_ARM);
  drawLine(rShoulder.pos, rElbow.pos, FAMILIAR_UPPER_ARM_THICKNESS * rShoulder.scale, COLOR_FAMILIAR_ARM);
  drawLine(rElbow.pos, rHand.pos, FAMILIAR_FOREARM_THICKNESS * rElbow.scale, COLOR_FAMILIAR_ARM);

  drawCircle(lHand.pos, Familiar.handRadius * lHand.scale, COLOR_FAMILIAR_HAND);
  drawCircle(rHand.pos, Familiar.handRadius * rHand.scale, COLOR_FAMILIAR_HAND);
}

function drawBall() {
  // Ball starts near camera (z=MAX_Z) and approaches goal (z=0).
  // depthFromCamera = how far the ball is from the camera lens.
  const depthFromCamera = BALL_MAX_Z - Ball.z; // 0 = near camera, MAX_Z = at goal
  const { pos: ballPos } = project(Ball.x, Ball.y, depthFromCamera);

  // Draw Ground Shadow projected on the ground plane at GROUND_Y.
  // The trajectory sample shrinks/fades this shadow as height increases.
  const { pos: shadowPos } = project(Ball.shadow.x, Ball.shadow.y, depthFromCamera);
  const shadowRadius = Ball.radius * Ball.scale * BALL_SHADOW_SCALE * Ball.shadow.scale;
  drawCircle(shadowPos, shadowRadius, rgb(1, 1, 1, Ball.shadow.opacity));

  // Draw projected Ball with per-hex tint. Orthographic projection keeps size constant.
  drawCircle(ballPos, Ball.radius * Ball.scale, Ball.color ? c(Ball.color) : COLOR_BALL);
  // Ball outline/inner detail to distinguish it.
  drawCircle(ballPos, Ball.radius * Ball.scale * BALL_DETAIL_SCALE, COLOR_BALL_DETAIL);
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
    `Shot ${Match.state.shotsTaken}/${Match.state.totalShots}   Saves ${Match.state.saves}   Misses ${Match.state.conceded}   Score ${Match.state.ongoingScore}`,
    vec2(centerX, 34),
    28,
    COLOR_SCORE_FEEDBACK,
    3,
    COLOR_STADIUM_NIGHT,
  );

  if (isMatchComplete(Match.state)) {
    drawTextScreen(
      Match.state.status === 'won' ? 'MATCH WON!' : 'MATCH LOST',
      vec2(centerX, 86),
      48,
      Match.state.status === 'won' ? COLOR_SAVE_FEEDBACK : COLOR_MISS_FEEDBACK,
      5,
      COLOR_STADIUM_NIGHT,
    );
    drawTextScreen(
      `Final Score ${Match.state.score}`,
      vec2(centerX, 136),
      32,
      COLOR_SCORE_FEEDBACK,
      4,
      COLOR_STADIUM_NIGHT,
    );
    return;
  }

  if (!Ball.lastSaveResult || Ball.feedbackTimer <= 0) return;

  const isSave = Ball.lastSaveResult.outcome === 'save';
  drawTextScreen(
    isSave ? 'SAVE!' : 'MISS!',
    vec2(centerX, 86),
    56,
    isSave ? COLOR_SAVE_FEEDBACK : COLOR_MISS_FEEDBACK,
    5,
    COLOR_STADIUM_NIGHT,
  );
}

// Startup LittleJS Engine only if running in a browser environment
if (typeof window !== 'undefined') {
  engineInit(gameInit, gameUpdate, gameUpdatePost, gameRender, gameRenderPost, []);
}

// Force page reload on hot reload for stability
if (import.meta.hot) import.meta.hot.accept(() => location.reload());
