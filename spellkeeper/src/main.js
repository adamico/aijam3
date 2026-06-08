import {
  engineInit,
  vec2, setCameraPos, setCameraScale,
  drawLine, drawCircle,
  rgb, Color, setCanvasClearColor,
  mousePos
} from 'littlejsengine';
import { solveIkChain } from './ikChain.js';

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
const COLOR_BALL_SHADOW = rgb(1, 1, 1, BALL_SHADOW_OPACITY);

const Ball = {
  x: PITCH_CENTER_X,             // centered on pitch
  y: GROUND_Y + BALL_RADIUS,     // rests on the ground
  z: BALL_MAX_Z,          // spawns at camera/penalty distance
  radius: BALL_RADIUS,
};

// --- Camera & Projection Constants ---
const CAMERA_TILT_ANGLE = 40.0; // degrees, camera tilt down from horizon
const COS_THETA = Math.cos((CAMERA_TILT_ANGLE * Math.PI) / 180);
const SIN_THETA = Math.sin((CAMERA_TILT_ANGLE * Math.PI) / 180);
const CAMERA_CENTER_Y = -6.0;  // centers the scene vertically on screen
const CAMERA_SCALE = 96;       // fits the goal and ball on screen

export function gameInit() {
  setCanvasClearColor(COLOR_STADIUM_NIGHT);
  setCameraPos(vec2(PITCH_CENTER_X, CAMERA_CENTER_Y));
  setCameraScale(CAMERA_SCALE);
}

export function gameUpdate() {
  updateKeeperIk(mousePos);
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

export function applyKeeperHandIk(target) {
  return {
    left: applyLeftHandIk(target),
    right: applyRightHandIk(target),
  };
}

export function updateKeeperIk(projectedMousePos) {
  return applyKeeperHandIk(goalPlaneFromProjectedMouse(projectedMousePos));
}

export function getFamiliarPose() {
  return {
    leftHand: { x: Familiar.leftHand.x, y: Familiar.leftHand.y },
    rightHand: { x: Familiar.rightHand.x, y: Familiar.rightHand.y },
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
  const { pos: ballPos, scale } = project(Ball.x, Ball.y, depthFromCamera);

  // Draw Ground Shadow projected on the ground plane at GROUND_Y
  const { pos: shadowPos } = project(Ball.x, GROUND_Y, depthFromCamera);
  const shadowRadius = Ball.radius * scale * BALL_SHADOW_SCALE;
  // Semi-transparent white shadow — visible on the dark background
  drawCircle(shadowPos, shadowRadius, COLOR_BALL_SHADOW);

  // Draw projected Ball
  drawCircle(ballPos, Ball.radius * scale, COLOR_BALL);
  // Ball outline/inner detail to distinguish it
  drawCircle(ballPos, Ball.radius * scale * BALL_DETAIL_SCALE, COLOR_BALL_DETAIL);
}

export function gameRender() {
  drawGoal();
  drawKeeper();
  drawBall();
}

export function gameRenderPost() {
  // Reserved for screen-space UI / post-processing overlays
}

// Startup LittleJS Engine only if running in a browser environment
if (typeof window !== 'undefined') {
  engineInit(gameInit, gameUpdate, gameUpdatePost, gameRender, gameRenderPost, []);
}

// Force page reload on hot reload for stability
if (import.meta.hot) import.meta.hot.accept(() => location.reload());
