import {
    engineInit, drawText, drawTile, tile,
    vec2, setCameraPos, setCameraScale,
    drawRect, drawLine, drawCircle,
    rgb, Color, setCanvasClearColor
} from 'littlejsengine';

// Helper to convert hex to LittleJS Color
const c = (hex) => new Color().setHex(hex);

// --- Goal Plane Bounding Dimensions ---
const GOAL_WIDTH = 7.32;   // ~7 meters between posts
const GOAL_HEIGHT = 2.44;  // standard height proportion
const GROUND_Y = -5.0;

const GOAL_LEFT_POST = vec2(-GOAL_WIDTH / 2, GROUND_Y);
const GOAL_RIGHT_POST = vec2(GOAL_WIDTH / 2, GROUND_Y);
const GOAL_CROSSBAR_LEFT = vec2(-GOAL_WIDTH / 2, GROUND_Y + GOAL_HEIGHT);
const GOAL_CROSSBAR_RIGHT = vec2(GOAL_WIDTH / 2, GROUND_Y + GOAL_HEIGHT);

// --- Goalkeeper (Familiar) Initial Joints/Structure ---
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
    torsoRadius: 0.35,
    headRadius: 0.2,
    handRadius: 0.2,
};

// --- Ball Structure at Spawn ---
// Distance between starting position and goal line in Z axis is exactly 11m (penalty distance).
const BALL_MAX_Z = 11.0;
const Ball = {
    x: 0,                   // centered on pitch
    y: GROUND_Y + 0.35,     // rests on the ground (radius = 0.35m)
    z: BALL_MAX_Z,          // spawns at camera/penalty distance
    radius: 0.35,           // larger than real ball (0.11m) for visual clarity
};

export function gameInit() {
    // Night stadium background — dark midnight blue
    setCanvasClearColor(rgb(0.05, 0.06, 0.12));
    // Position camera view center and set camera scale (pixels per world unit)
    setCameraPos(vec2(0, -2.0));
    setCameraScale(85); // Adjusted zoom level
}

export function gameUpdate() {
    // Game update loop (currently static basic structure)
}

export function gameUpdatePost() {
    // Camera update/post process
}

// --- Shared perspective projection helper ---
// All 3D scene elements use this: goal (z=0), keeper (z=0), ball (z=variable).
const FOCUS_DISTANCE = 5.0; // Higher value reduces perspective distortion
const CAMERA_Y = 1.0;       // Eye-level camera height

function project(x3d, y3d, depthFromCamera) {
    const scale = FOCUS_DISTANCE / (FOCUS_DISTANCE + depthFromCamera);
    return {
        pos: vec2(x3d * scale, CAMERA_Y + (y3d - CAMERA_Y) * scale),
        scale,
    };
}

function drawGoal() {
    const goalDepth = BALL_MAX_Z;

    // 1. Draw ground/pitch line at goal plane depth
    const gL = project(-30, GROUND_Y, goalDepth);
    const gR = project( 30, GROUND_Y, goalDepth);
    drawLine(gL.pos, gR.pos, 0.08 * gL.scale, c('#3b5c3b'));

    // 2. Draw Goal Frame — posts and crossbar projected from 3D at z=0
    const postBotL  = project(-GOAL_WIDTH / 2, GROUND_Y,             goalDepth);
    const postTopL  = project(-GOAL_WIDTH / 2, GROUND_Y + GOAL_HEIGHT, goalDepth);
    const postBotR  = project( GOAL_WIDTH / 2, GROUND_Y,             goalDepth);
    const postTopR  = project( GOAL_WIDTH / 2, GROUND_Y + GOAL_HEIGHT, goalDepth);
    const lineW = 0.2 * postBotL.scale;
    drawLine(postBotL.pos, postTopL.pos, lineW, c('#ffffff')); // left post
    drawLine(postBotR.pos, postTopR.pos, lineW, c('#ffffff')); // right post
    drawLine(postTopL.pos, postTopR.pos, lineW, c('#ffffff')); // crossbar
}

function drawKeeper() {
    const goalDepth = BALL_MAX_Z;
    const fam = (x, y) => project(x, y, goalDepth);

    const torso = fam(Familiar.torsoPos.x, Familiar.torsoPos.y);
    drawCircle(torso.pos, Familiar.torsoRadius * torso.scale, c('#4d82cb'));

    const head = fam(Familiar.headPos.x, Familiar.headPos.y);
    drawCircle(head.pos, Familiar.headRadius * head.scale, c('#2c4d7e'));

    const lShoulder = fam(Familiar.leftShoulder.x,  Familiar.leftShoulder.y);
    const lElbow    = fam(Familiar.leftElbow.x,      Familiar.leftElbow.y);
    const lHand     = fam(Familiar.leftHand.x,       Familiar.leftHand.y);
    const rShoulder = fam(Familiar.rightShoulder.x,  Familiar.rightShoulder.y);
    const rElbow    = fam(Familiar.rightElbow.x,     Familiar.rightElbow.y);
    const rHand     = fam(Familiar.rightHand.x,      Familiar.rightHand.y);

    drawLine(lShoulder.pos, lElbow.pos, 0.18 * lShoulder.scale, c('#3d6db0'));
    drawLine(lElbow.pos,    lHand.pos,  0.15 * lElbow.scale,    c('#3d6db0'));
    drawLine(rShoulder.pos, rElbow.pos, 0.18 * rShoulder.scale, c('#3d6db0'));
    drawLine(rElbow.pos,    rHand.pos,  0.15 * rElbow.scale,    c('#3d6db0'));

    drawCircle(lHand.pos, Familiar.handRadius * lHand.scale, c('#d95763'));
    drawCircle(rHand.pos, Familiar.handRadius * rHand.scale, c('#d95763'));
}

function drawBall() {
    // Ball starts near camera (z=MAX_Z) and approaches goal (z=0).
    // depthFromCamera = how far the ball is from the camera lens.
    const depthFromCamera = BALL_MAX_Z - Ball.z; // 0 = near camera, MAX_Z = at goal
    const { pos: ballPos, scale } = project(Ball.x, Ball.y, depthFromCamera);

    // Draw Ground Shadow projected on the ground plane at GROUND_Y
    const { pos: shadowPos } = project(Ball.x, GROUND_Y, depthFromCamera);
    const shadowRadius = Ball.radius * scale * 0.9;
    // Semi-transparent white shadow — visible on the dark background
    drawCircle(shadowPos, shadowRadius, rgb(1, 1, 1, 0.18));

    // Draw projected Ball
    drawCircle(ballPos, Ball.radius * scale, c('#f1c40f'));
    // Ball outline/inner detail to distinguish it
    drawCircle(ballPos, Ball.radius * scale * 0.8, c('#f39c12'));
}

export function gameRender() {
    drawGoal();
    drawKeeper();
}

export function gameRenderPost() {
    drawBall();
}

// Startup LittleJS Engine only if running in a browser environment
if (typeof window !== 'undefined') {
    engineInit(gameInit, gameUpdate, gameUpdatePost, gameRender, gameRenderPost, []);
}

// Force page reload on hot reload for stability
if (import.meta.hot) import.meta.hot.accept(() => location.reload());

