const DEFAULT_SHOT_PLAN_TOTAL_SHOTS = 30;
export const DEFAULT_SHOT_PLAN_SEED = 'spellkeeper-default-shot-plan';

const FIXED_OPENER_SHOTS = [
  {
    shot: {
      hex: 'standard',
      start: { x: -1.2, y: -4.55 },
      target: { x: -0.8, y: -3.85 },
    },
    designer: {
      label: 'straight warmup',
      difficultyBand: 'opener',
      pressureTags: ['readable', 'warmup'],
    },
  },
  {
    shot: {
      hex: 'standard',
      start: { x: 1.2, y: -4.55 },
      target: { x: 0.9, y: -3.55 },
    },
    designer: {
      label: 'low corner read',
      difficultyBand: 'opener',
      pressureTags: ['readable', 'low-corner'],
    },
  },
  {
    shot: {
      hex: 'heavy',
      start: { x: -1.8, y: -4.55 },
      target: { x: 1.0, y: -3.85 },
    },
    designer: {
      label: 'heavy slow drag',
      difficultyBand: 'opener',
      pressureTags: ['commitment', 'drag'],
    },
  },
];

const SHOT_PHASE_POOLS = [
  [
    {
      shot: { hex: 'standard', start: { x: -2.1, y: -4.55 }, target: { x: -1.2, y: -3.7 } },
      designer: { label: 'build left lane', difficultyBand: 'build', pressureTags: ['lane', 'read'] },
    },
    {
      shot: { hex: 'standard', start: { x: 2.1, y: -4.55 }, target: { x: 1.3, y: -3.55 } },
      designer: { label: 'build right lane', difficultyBand: 'build', pressureTags: ['lane', 'read'] },
    },
    {
      shot: { hex: 'curve', start: { x: -2.4, y: -4.55 }, target: { x: -1.3, y: -3.6 }, curveDirection: 1 },
      designer: { label: 'gentle left curve', difficultyBand: 'build', pressureTags: ['curve', 'shape'] },
    },
    {
      shot: { hex: 'curve', start: { x: 2.4, y: -4.55 }, target: { x: 1.4, y: -3.5 }, curveDirection: -1 },
      designer: { label: 'gentle right curve', difficultyBand: 'build', pressureTags: ['curve', 'shape'] },
    },
    {
      shot: { hex: 'fireball', start: { x: -0.3, y: -4.55 }, target: { x: 0.2, y: -3.25 } },
      designer: { label: 'central speed test', difficultyBand: 'build', pressureTags: ['speed', 'center'] },
    },
    {
      shot: { hex: 'heavy', start: { x: 1.9, y: -4.55 }, target: { x: -1.8, y: -3.9 } },
      designer: { label: 'cross-body weight', difficultyBand: 'build', pressureTags: ['weight', 'cross-body'] },
    },
  ],
  [
    {
      shot: { hex: 'standard', start: { x: -2.7, y: -4.55 }, target: { x: -2.0, y: -3.35 } },
      designer: { label: 'pressure left high', difficultyBand: 'pressure', pressureTags: ['wide', 'high'] },
    },
    {
      shot: { hex: 'standard', start: { x: 2.7, y: -4.55 }, target: { x: 2.0, y: -3.15 } },
      designer: { label: 'pressure right high', difficultyBand: 'pressure', pressureTags: ['wide', 'high'] },
    },
    {
      shot: { hex: 'curve', start: { x: -2.9, y: -4.55 }, target: { x: 1.6, y: -3.4 }, curveDirection: 1 },
      designer: { label: 'sweeping left curve', difficultyBand: 'pressure', pressureTags: ['curve', 'switch'] },
    },
    {
      shot: { hex: 'curve', start: { x: 2.9, y: -4.55 }, target: { x: -1.6, y: -3.45 }, curveDirection: -1 },
      designer: { label: 'sweeping right curve', difficultyBand: 'pressure', pressureTags: ['curve', 'switch'] },
    },
    {
      shot: { hex: 'fireball', start: { x: 0.0, y: -4.55 }, target: { x: 0.0, y: -3.08 } },
      designer: { label: 'fast central test', difficultyBand: 'pressure', pressureTags: ['speed', 'center'] },
    },
    {
      shot: { hex: 'heavy', start: { x: -2.5, y: -4.55 }, target: { x: 2.4, y: -3.92 } },
      designer: { label: 'heavy cross drag', difficultyBand: 'pressure', pressureTags: ['weight', 'cross-body'] },
    },
  ],
  [
    {
      shot: { hex: 'standard', start: { x: -2.85, y: -4.55 }, target: { x: -2.55, y: -3.0 } },
      designer: { label: 'clutch left squeeze', difficultyBand: 'clutch', pressureTags: ['corner', 'late'] },
    },
    {
      shot: { hex: 'standard', start: { x: 2.85, y: -4.55 }, target: { x: 2.55, y: -3.0 } },
      designer: { label: 'clutch right squeeze', difficultyBand: 'clutch', pressureTags: ['corner', 'late'] },
    },
    {
      shot: { hex: 'curve', start: { x: -2.6, y: -4.55 }, target: { x: 2.2, y: -3.18 }, curveDirection: 1 },
      designer: { label: 'late curve switch', difficultyBand: 'clutch', pressureTags: ['curve', 'switch'] },
    },
    {
      shot: { hex: 'curve', start: { x: 2.6, y: -4.55 }, target: { x: -2.2, y: -3.18 }, curveDirection: -1 },
      designer: { label: 'late curve reverse', difficultyBand: 'clutch', pressureTags: ['curve', 'switch'] },
    },
    {
      shot: { hex: 'fireball', start: { x: -0.7, y: -4.55 }, target: { x: 0.7, y: -3.0 } },
      designer: { label: 'late fireball center', difficultyBand: 'clutch', pressureTags: ['speed', 'center'] },
    },
    {
      shot: { hex: 'heavy', start: { x: 2.9, y: -4.55 }, target: { x: -2.85, y: -3.95 } },
      designer: { label: 'late heavy cross', difficultyBand: 'clutch', pressureTags: ['weight', 'finish'] },
    },
  ],
];

function clonePoint(point) {
  return { x: point.x, y: point.y };
}

function cloneShot(shot) {
  const cloned = {
    hex: shot.hex,
    start: clonePoint(shot.start),
    target: clonePoint(shot.target),
  };

  if (shot.curveDirection !== undefined) {
    cloned.curveDirection = shot.curveDirection;
  }

  return cloned;
}

function cloneDesigner(designer) {
  return {
    label: designer.label,
    difficultyBand: designer.difficultyBand,
    pressureTags: [...designer.pressureTags],
    opener: designer.difficultyBand === 'opener',
  };
}

function normalizeSeed(seed) {
  if (typeof seed === 'string' && seed.length > 0) return seed;
  if (Number.isFinite(seed)) return String(seed);

  throw new Error(`Shot plan seed must be a non-empty string or finite number: ${seed}`);
}

function normalizeRules(rules = {}) {
  const totalShots = rules.totalShots ?? DEFAULT_SHOT_PLAN_TOTAL_SHOTS;

  if (!Number.isInteger(totalShots) || totalShots < FIXED_OPENER_SHOTS.length) {
    throw new Error(`Shot plan totalShots must be an integer of at least ${FIXED_OPENER_SHOTS.length}: ${totalShots}`);
  }

  return { totalShots };
}

function hashSeed(seedText) {
  let hash = 2166136261;
  for (let index = 0; index < seedText.length; index += 1) {
    hash ^= seedText.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function createRng(seedText) {
  let state = hashSeed(seedText) || 0x6d2b79f5;

  return () => {
    state += 0x6d2b79f5;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function mirrorPoint(point) {
  return { x: -point.x, y: point.y };
}

function jitter(value, spread, rng) {
  return value + (rng() * 2 - 1) * spread;
}

function clampTargetX(x) {
  return Math.max(-3.05, Math.min(3.05, x));
}

function buildShotEntry({ index, shot, designer }) {
  return {
    index,
    shot,
    designer,
  };
}

function createSeededShot(template, index, band, rng) {
  const mirrored = rng() < 0.5;
  const start = mirrored ? mirrorPoint(template.shot.start) : clonePoint(template.shot.start);
  const target = mirrored ? mirrorPoint(template.shot.target) : clonePoint(template.shot.target);
  const shot = {
    hex: template.shot.hex,
    start: {
      x: jitter(start.x, 0.14, rng),
      y: jitter(start.y, 0.06, rng),
    },
    target: {
      x: clampTargetX(jitter(target.x, 0.16, rng)),
      y: jitter(target.y, 0.08, rng),
    },
  };

  if (template.shot.curveDirection !== undefined) {
    shot.curveDirection = mirrored ? -template.shot.curveDirection : template.shot.curveDirection;
  }

  return buildShotEntry({
    index,
    shot,
    designer: {
      label: template.designer.label,
      difficultyBand: band,
      pressureTags: [...template.designer.pressureTags],
      opener: false,
    },
  });
}

function pickTemplate(pool, rng) {
  return pool[Math.floor(rng() * pool.length)];
}

function bandForIndex(index, totalShots) {
  const openerCount = FIXED_OPENER_SHOTS.length;
  if (index < openerCount) return 'opener';

  const remainingShots = totalShots - openerCount;
  const phaseProgress = (index - openerCount) / remainingShots;
  if (phaseProgress < 1 / 3) return 'build';
  if (phaseProgress < 2 / 3) return 'pressure';
  return 'clutch';
}

function phaseIndexForBand(band) {
  if (band === 'build') return 0;
  if (band === 'pressure') return 1;
  return 2;
}

export function createShotPlan(seed, rules = {}) {
  const normalizedSeed = normalizeSeed(seed);
  const { totalShots } = normalizeRules(rules);
  const rng = createRng(normalizedSeed);
  const plan = [];

  for (let index = 0; index < totalShots; index += 1) {
    if (index < FIXED_OPENER_SHOTS.length) {
      const opener = FIXED_OPENER_SHOTS[index];
      plan.push(buildShotEntry({
        index,
        shot: cloneShot(opener.shot),
        designer: {
          ...cloneDesigner(opener.designer),
          opener: true,
        },
      }));
      continue;
    }

    const band = bandForIndex(index, totalShots);
    const pool = SHOT_PHASE_POOLS[phaseIndexForBand(band)];
    plan.push(createSeededShot(pickTemplate(pool, rng), index, band, rng));
  }

  return plan;
}

