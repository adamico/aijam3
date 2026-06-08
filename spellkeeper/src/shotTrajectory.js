const DEFAULT_EPSILON = 1e-6;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

const BASE_SHOT_DURATION = 1.3;
const BASE_SHOT_ARC_HEIGHT = 2.6;
const BASE_SHOT_CURVE_AMPLITUDE = 1.1;
const BASE_SHOT_RADIUS_SCALE = 1;

const SHOT_DURATION_MODIFIERS = {
  standard: 1,
  fireball: 0.7,
  curve: 1,
  heavy: 2.15,
};

const SHOT_ARC_HEIGHT_MODIFIERS = {
  standard: 1,
  fireball: 0.69,
  curve: 0.92,
  heavy: 0.46,
};

const SHOT_CURVE_AMPLITUDE_MODIFIERS = {
  standard: 0,
  fireball: 0,
  curve: 2,
  heavy: 0,
};

const SHOT_RADIUS_SCALE_MODIFIERS = {
  standard: 1,
  fireball: 0.9,
  curve: 1,
  heavy: 1.35,
};

export const SHOT_HEXES = {
  standard: {
    key: 'standard',
    label: 'Straight',
    duration: BASE_SHOT_DURATION * SHOT_DURATION_MODIFIERS.standard,
    arcHeight: BASE_SHOT_ARC_HEIGHT * SHOT_ARC_HEIGHT_MODIFIERS.standard,
    curveAmplitude: BASE_SHOT_CURVE_AMPLITUDE * SHOT_CURVE_AMPLITUDE_MODIFIERS.standard,
    radiusScale: BASE_SHOT_RADIUS_SCALE * SHOT_RADIUS_SCALE_MODIFIERS.standard,
    color: '#ffffff',
  },
  fireball: {
    key: 'fireball',
    label: 'Fireball',
    duration: BASE_SHOT_DURATION * SHOT_DURATION_MODIFIERS.fireball,
    arcHeight: BASE_SHOT_ARC_HEIGHT * SHOT_ARC_HEIGHT_MODIFIERS.fireball,
    curveAmplitude: BASE_SHOT_CURVE_AMPLITUDE * SHOT_CURVE_AMPLITUDE_MODIFIERS.fireball,
    radiusScale: BASE_SHOT_RADIUS_SCALE * SHOT_RADIUS_SCALE_MODIFIERS.fireball,
    color: '#ff6a2a',
  },
  curve: {
    key: 'curve',
    label: 'Curve',
    duration: BASE_SHOT_DURATION * SHOT_DURATION_MODIFIERS.curve,
    arcHeight: BASE_SHOT_ARC_HEIGHT * SHOT_ARC_HEIGHT_MODIFIERS.curve,
    curveAmplitude: BASE_SHOT_CURVE_AMPLITUDE * SHOT_CURVE_AMPLITUDE_MODIFIERS.curve,
    radiusScale: BASE_SHOT_RADIUS_SCALE * SHOT_RADIUS_SCALE_MODIFIERS.curve,
    color: '#00d8ff',
  },
  heavy: {
    key: 'heavy',
    label: 'Heavy',
    duration: BASE_SHOT_DURATION * SHOT_DURATION_MODIFIERS.heavy,
    arcHeight: BASE_SHOT_ARC_HEIGHT * SHOT_ARC_HEIGHT_MODIFIERS.heavy,
    curveAmplitude: BASE_SHOT_CURVE_AMPLITUDE * SHOT_CURVE_AMPLITUDE_MODIFIERS.heavy,
    radiusScale: BASE_SHOT_RADIUS_SCALE * SHOT_RADIUS_SCALE_MODIFIERS.heavy,
    color: '#c792ea',
  },
};

export function createShot({
  hex = 'standard',
  start,
  target,
  maxZ,
  groundY,
  radius,
  curveDirection = 1,
}) {
  const hexSpec = SHOT_HEXES[hex];
  if (!hexSpec) throw new Error(`Unknown shot hex: ${hex}`);
  if (maxZ <= 0) throw new Error('Shot maxZ must be positive');
  if (radius <= 0) throw new Error('Shot radius must be positive');

  return {
    hex,
    spec: hexSpec,
    start: { ...start, z: maxZ },
    target: { ...target, z: 0 },
    maxZ,
    groundY,
    radius: radius * hexSpec.radiusScale,
    curveDirection: Math.sign(curveDirection || 1),
    elapsed: 0,
  };
}

export function sampleShot(shot, elapsed) {
  const progress = clamp(elapsed / Math.max(shot.spec.duration, DEFAULT_EPSILON), 0, 1);
  const baseX = lerp(shot.start.x, shot.target.x, progress);
  const baseY = lerp(shot.start.y, shot.target.y, progress);
  const arc = Math.sin(progress * Math.PI) * shot.spec.arcHeight;
  const curve = Math.sin(progress * Math.PI) * shot.spec.curveAmplitude * shot.curveDirection;
  const heightAboveGround = Math.max(0, baseY + arc - shot.groundY);
  const scale = 1;

  return {
    hex: shot.hex,
    progress,
    isComplete: progress >= 1,
    x: baseX + curve,
    y: baseY + arc,
    z: lerp(shot.maxZ, 0, progress),
    radius: shot.radius,
    scale,
    color: shot.spec.color,
    shadow: {
      x: baseX + curve,
      y: shot.groundY,
      scale: scale * clamp(1.2 - heightAboveGround * 0.12, 0.55, 1.1),
      opacity: clamp(0.28 - heightAboveGround * 0.035, 0.08, 0.28),
    },
  };
}

export function advanceShot(shot, dt) {
  const elapsed = shot.elapsed + Math.max(0, dt);
  return {
    ...shot,
    elapsed,
    sample: sampleShot(shot, elapsed),
  };
}
