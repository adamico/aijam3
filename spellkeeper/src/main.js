import {
    engineInit, drawText, drawTile, tile,
    vec2, setCameraPos, setCameraScale,
    drawRect, drawLine, drawCircle,
    rgb, Color, setCanvasClearColor
} from 'littlejsengine';

// Helper to convert hex to LittleJS Color
const c = (hex) => new Color().setHex(hex);

// --- Pitch & Stadium Constants ---
const GROUND_Y = -5.0;
const GROUND_HALF_WIDTH = 30.0;
const GROUND_LINE_THICKNESS = 0.08;
const COLOR_STADIUM_NIGHT = rgb(0.05, 0.06, 0.12);
const COLOR_GROUND_LINE = c('#3b5c3b');

// --- Goal Plane Bounding Dimensions ---
const GOAL_WIDTH = 7.32;   // ~7 meters between posts
const GOAL_HEIGHT = 2.44;  // standard height proportion
const GOAL_POST_THICKNESS = 0.2;
const COLOR_GOAL_FRAME = c('#ffffff');

const GOAL_LEFT_POST = vec2(-GOAL_WIDTH / 2, GROUND_Y);
const GOAL_RIGHT_POST = vec2(GOAL_WIDTH / 2, GROUND_Y);
const GOAL_CROSSBAR_LEFT = vec2(-GOAL_WIDTH / 2, GROUND_Y + GOAL_HEIGHT);
const GOAL_CROSSBAR_RIGHT = vec2(GOAL_WIDTH / 2, GROUND_Y + GOAL_HEIGHT);

// --- Goalkeeper (Familiar) Initial Joints/Structure ---
const FAMILIAR_TORSO_RADIUS = 0.35;
const FAMILIAR_HEAD_RADIUS = 0.2;
const FAMILIAR_HAND_RADIUS = 0.2;
const FAMILIAR_UPPER_ARM_THICKNESS = 0.18;
const FAMILIAR_FOREARM_THICKNESS = 0.15;
const COLOR_FAMILIAR_TORSO = c('#4d82cb');
const COLOR_FAMILIAR_HEAD = c('#2c4d7e');
const COLOR_FAMILIAR_ARM = c('#3d6db0');
const COLOR_FAMILIAR_HAND = c('#d95763');

// All dimensions and joints are defined in physical meters relative to the ground.
const Familiar = {
    torsoPos: vec2(0, GROUND_Y + 0.8),
    headPos: vec2(0, GROUND_Y + 1.5),
    leftShoulder: vec2(-0.4, GROUND_Y + 1.1),
    rightShoulder: vec2(0.4, GROUND_Y + 1.1),
    leftElbow: vec2(-0.8, GROUND_Y + 0.9),
    rightElbow: vec2(0.8, GROUND_Y + 0.9),
    leftHand: vec2(-1.2, GROUND_Y + 1.2),
    rightHand: vec2(1.2, GROUND_Y + 1.2),
    torsoRadius: FAMILIAR_TORSO_RADIUS,
    headRadius: FAMILIAR_HEAD_RADIUS,
    handRadius: FAMILIAR_HAND_RADIUS,
};

// --- Ball Structure at Spawn ---
const BALL_RADIUS = 0.35;           // larger than real ball (0.11m) for visual clarity
const BALL_MAX_Z = 11.0;            // distance between starting position and goal line in Z axis
const BALL_SHADOW_SCALE = 0.9;
const BALL_SHADOW_OPACITY = 0.18;
const BALL_DETAIL_SCALE = 0.8;
const COLOR_BALL = c('#f1c40f');
const COLOR_BALL_DETAIL = c('#f39c12');

const Ball = {
    x: 0,                   // centered on pitch
    y: GROUND_Y + BALL_RADIUS,     // rests on the ground
    z: BALL_MAX_Z,          // spawns at camera/penalty distance
    radius: BALL_RADIUS,
};

// --- Camera & Projection Constants ---
const FOCUS_DISTANCE = 5.0; // Higher value reduces perspective distortion
const CAMERA_Y = 1.0;       // Eye-level camera height
const HEIGHT_COMPRESSION = 0.7; // Simulates camera tilt (looking down), bringing ball and shadow closer
const CAMERA_CENTER_Y = -2.0;
const CAMERA_SCALE = 85;

export function gameInit() {
    setCanvasClearColor(COLOR_STADIUM_NIGHT);
    setCameraPos(vec2(0, CAMERA_CENTER_Y));
    setCameraScale(CAMERA_SCALE);
}

export function gameUpdate() {
    // Game update loop (currently static basic structure)
}

export function gameUpdatePost() {
    // Camera update/post process
}

function project(x3d, y3d, depthFromCamera) {
    const scale = FOCUS_DISTANCE / (FOCUS_DISTANCE + depthFromCamera);
    const heightAboveGround = y3d - GROUND_Y;
    const groundProjY = CAMERA_Y + (GROUND_Y - CAMERA_Y) * scale;
    const yProj = groundProjY + heightAboveGround * scale * HEIGHT_COMPRESSION;
    return {
        pos: vec2(x3d * scale, yProj),
        scale,
    };
}

function drawGoal() {
    const goalDepth = BALL_MAX_Z;

    // 1. Draw ground/pitch line at goal plane depth
    const gL = project(-GROUND_HALF_WIDTH, GROUND_Y, goalDepth);
    const gR = project( GROUND_HALF_WIDTH, GROUND_Y, goalDepth);
    drawLine(gL.pos, gR.pos, GROUND_LINE_THICKNESS * gL.scale, COLOR_GROUND_LINE);

    // 2. Draw Goal Frame — posts and crossbar projected from 3D at z=0
    const postBotL  = project(-GOAL_WIDTH / 2, GROUND_Y,             goalDepth);
    const postTopL  = project(-GOAL_WIDTH / 2, GROUND_Y + GOAL_HEIGHT, goalDepth);
    const postBotR  = project( GOAL_WIDTH / 2, GROUND_Y,             goalDepth);
    const postTopR  = project( GOAL_WIDTH / 2, GROUND_Y + GOAL_HEIGHT, goalDepth);
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

    const lShoulder = fam(Familiar.leftShoulder.x,  Familiar.leftShoulder.y);
    const lElbow    = fam(Familiar.leftElbow.x,      Familiar.leftElbow.y);
    const lHand     = fam(Familiar.leftHand.x,       Familiar.leftHand.y);
    const rShoulder = fam(Familiar.rightShoulder.x,  Familiar.rightShoulder.y);
    const rElbow    = fam(Familiar.rightElbow.x,     Familiar.rightElbow.y);
    const rHand     = fam(Familiar.rightHand.x,      Familiar.rightHand.y);

    drawLine(lShoulder.pos, lElbow.pos, FAMILIAR_UPPER_ARM_THICKNESS * lShoulder.scale, COLOR_FAMILIAR_ARM);
    drawLine(lElbow.pos,    lHand.pos,  FAMILIAR_FOREARM_THICKNESS * lElbow.scale,    COLOR_FAMILIAR_ARM);
    drawLine(rShoulder.pos, rElbow.pos, FAMILIAR_UPPER_ARM_THICKNESS * rShoulder.scale, COLOR_FAMILIAR_ARM);
    drawLine(rElbow.pos,    rHand.pos,  FAMILIAR_FOREARM_THICKNESS * rElbow.scale,    COLOR_FAMILIAR_ARM);

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
    drawCircle(shadowPos, shadowRadius, rgb(1, 1, 1, BALL_SHADOW_OPACITY));

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

