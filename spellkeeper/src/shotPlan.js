import { SETPIECE_PHASE_LIBRARY, instantiateSetpiece, mirrorSide } from './setpieces.js';

const DEFAULT_SHOT_PLAN_TOTAL_SHOTS = 30;
export const DEFAULT_SHOT_PLAN_SEED = 'spellkeeper-default-shot-plan';

const SHOT_PLAN_REQUIRED_HEXES = ['standard', 'curve', 'fireball', 'heavy'];
const SHOT_PLAN_HEX_COUNT_RANGES = {
  standard: { min: 8, max: 10 },
  curve: { min: 7, max: 9 },
  fireball: { min: 6, max: 8 },
  heavy: { min: 4, max: 6 },
};
const SHOT_PLAN_DIFFICULTY_BANDS = {
  readable: 'readable variety',
  mixed: 'mixed pressure',
  chaos: 'chaos-but-fair',
};
const SHOT_PLAN_START_Y = -4.55;
const SHOT_PLAN_SAFE_TARGET_X_MIN = -3.05;
const SHOT_PLAN_SAFE_TARGET_X_MAX = 3.05;
const SHOT_PLAN_SAFE_TARGET_Y_MIN = -4.85;
const SHOT_PLAN_SAFE_TARGET_Y_MAX = -2.7;

const ORIGIN_LANES = {
  outerLeft: { key: 'outer-left', x: -2.75 },
  innerLeft: { key: 'inner-left', x: -1.45 },
  center: { key: 'center', x: 0 },
  innerRight: { key: 'inner-right', x: 1.45 },
  outerRight: { key: 'outer-right', x: 2.75 },
};

const TARGET_LANES = {
  outerLeft: { key: 'outer-left', x: -2.55 },
  innerLeft: { key: 'inner-left', x: -1.3 },
  center: { key: 'center', x: 0 },
  innerRight: { key: 'inner-right', x: 1.3 },
  outerRight: { key: 'outer-right', x: 2.55 },
};

const PLACEMENT_HEIGHT_ZONES = {
  low: { key: 'low', y: -3.95 },
  middle: { key: 'middle', y: -3.35 },
  high: { key: 'high', y: -2.9 },
};
const OUTER_LANES = new Set(['outer-left', 'outer-right']);
const HEAVY_PRESSURE_TAGS = ['low', 'extreme-side', 'commitment'];
const PHASE_SHOT_COUNT = 9;

export const PHASE_LAYOUTS = {
  readable: ['isolated', 'isolated', 'setpiece', 'isolated', 'setpiece', 'isolated'],
  mixed: ['isolated', 'setpiece', 'isolated', 'setpiece', 'isolated', 'isolated'],
  chaos: ['setpiece', 'isolated', 'setpiece', 'isolated', 'setpiece'],
};

const FIXED_OPENER_SHOTS = [
  {
    shot: {
      hex: 'standard',
      originLane: 'innerLeft',
      targetLane: 'innerLeft',
      placementHeight: 'low',
    },
    designer: {
      label: 'straight warmup',
      difficultyBand: 'opener',
      pressureTags: ['readable', 'warmup'],
      intendedFailureMode: 'setup',
    },
  },
  {
    shot: {
      hex: 'standard',
      originLane: 'innerRight',
      targetLane: 'innerRight',
      placementHeight: 'middle',
    },
    designer: {
      label: 'low corner read',
      difficultyBand: 'opener',
      pressureTags: ['readable', 'low-corner'],
      intendedFailureMode: 'setup',
    },
  },
  {
    shot: {
      hex: 'heavy',
      originLane: 'outerRight',
      targetLane: 'outerRight',
      placementHeight: 'low',
    },
    designer: {
      label: 'heavy slow drag',
      difficultyBand: 'opener',
      pressureTags: [...HEAVY_PRESSURE_TAGS, 'drag'],
      intendedFailureMode: 'setup',
    },
  },
];

const CALIBRATION_SHOT_CHAIN_BLUEPRINT = [
  ['standard', 'innerLeft', 'innerLeft', 'low', 'calibration warmup', 'opener', ['readable', 'warmup'], 'setup'],
  ['standard', 'innerRight', 'innerRight', 'middle', 'calibration mirror', 'opener', ['readable', 'mirror'], 'setup'],
  ['heavy', 'outerLeft', 'outerLeft', 'low', 'heavy bait opener', 'opener', ['low', 'extreme-side', 'commitment'], 'setup'],
  ['standard', 'outerRight', 'outerRight', 'low', 'readable right squeeze', SHOT_PLAN_DIFFICULTY_BANDS.readable, ['readable', 'recovery-check'], 'read-check'],
  ['curve', 'outerLeft', 'innerLeft', 'middle', 'left curve tell', SHOT_PLAN_DIFFICULTY_BANDS.readable, ['curve', 'curve-bait', 'shape'], 'curve-misread', 1],
  ['fireball', 'center', 'center', 'low', 'central speed check', SHOT_PLAN_DIFFICULTY_BANDS.readable, ['speed', 'center', 'read'], 'read-check'],
  ['standard', 'outerLeft', 'outerLeft', 'high', 'high-low opener', SHOT_PLAN_DIFFICULTY_BANDS.readable, ['high-low', 'alternation', 'high'], 'high-low-misread'],
  ['curve', 'outerRight', 'innerRight', 'middle', 'right curve recovery', SHOT_PLAN_DIFFICULTY_BANDS.readable, ['curve', 'late-recovery', 'shape'], 'curve-misread', -1],
  ['heavy', 'outerRight', 'outerRight', 'low', 'heavy bait right', SHOT_PLAN_DIFFICULTY_BANDS.readable, ['low', 'extreme-side', 'commitment', 'heavy-bait'], 'overcommit-punish'],
  ['standard', 'innerLeft', 'innerLeft', 'middle', 'same-side squeeze', SHOT_PLAN_DIFFICULTY_BANDS.readable, ['same-side', 'recovery', 'pin'], 'same-side-pinning'],
  ['curve', 'outerRight', 'innerLeft', 'middle', 'curve bait switch', SHOT_PLAN_DIFFICULTY_BANDS.readable, ['curve', 'switch', 'curve-bait'], 'curve-bait', -1],
  ['standard', 'outerLeft', 'innerRight', 'high', 'late correction setup', SHOT_PLAN_DIFFICULTY_BANDS.readable, ['late-recovery', 'opposite-side', 'read'], 'late-recovery'],
  ['heavy', 'outerLeft', 'outerLeft', 'low', 'heavy bait left', SHOT_PLAN_DIFFICULTY_BANDS.mixed, ['low', 'extreme-side', 'commitment', 'heavy-bait'], 'heavy-bait'],
  ['fireball', 'center', 'center', 'high', 'opposite punish speed', SHOT_PLAN_DIFFICULTY_BANDS.mixed, ['speed', 'center', 'opposite-punish'], 'opposite-side-punish'],
  ['standard', 'outerRight', 'outerRight', 'high', 'high-low turn', SHOT_PLAN_DIFFICULTY_BANDS.mixed, ['high-low', 'alternation', 'high'], 'high-low-misread'],
  ['curve', 'outerLeft', 'innerRight', 'middle', 'curve bait late', SHOT_PLAN_DIFFICULTY_BANDS.mixed, ['curve', 'curve-bait', 'late-correction'], 'curve-misread', 1],
  ['standard', 'innerRight', 'innerRight', 'low', 'recovery check right', SHOT_PLAN_DIFFICULTY_BANDS.mixed, ['same-side', 'recovery', 'check'], 'recovery-check'],
  ['heavy', 'outerRight', 'outerRight', 'low', 'same-side pin right', SHOT_PLAN_DIFFICULTY_BANDS.mixed, ['same-side', 'pin', 'low', 'extreme-side'], 'same-side-pinning'],
  ['standard', 'outerLeft', 'outerLeft', 'middle', 'overcommit trap left', SHOT_PLAN_DIFFICULTY_BANDS.mixed, ['overcommit', 'recovery', 'left'], 'overcommit-punish'],
  ['curve', 'outerRight', 'outerLeft', 'middle', 'curve correction reverse', SHOT_PLAN_DIFFICULTY_BANDS.mixed, ['curve', 'switch', 'late-correction'], 'curve-misread', -1],
  ['fireball', 'center', 'center', 'high', 'vertical alternation', SHOT_PLAN_DIFFICULTY_BANDS.mixed, ['high-low', 'speed', 'center'], 'high-low-misread'],
  ['heavy', 'outerLeft', 'outerLeft', 'low', 'late heavy drag', SHOT_PLAN_DIFFICULTY_BANDS.chaos, ['low', 'extreme-side', 'commitment', 'drag'], 'late-recovery'],
  ['curve', 'outerLeft', 'innerRight', 'middle', 'chaos curve bait', SHOT_PLAN_DIFFICULTY_BANDS.chaos, ['curve', 'curve-bait', 'opposite-side'], 'curve-bait', 1],
  ['standard', 'innerLeft', 'outerLeft', 'high', 'high-low whip', SHOT_PLAN_DIFFICULTY_BANDS.chaos, ['high-low', 'late-recovery', 'opposite-side'], 'high-low-misread'],
  ['heavy', 'outerRight', 'outerRight', 'low', 'pin right again', SHOT_PLAN_DIFFICULTY_BANDS.chaos, ['same-side', 'pin', 'low', 'extreme-side'], 'same-side-pinning'],
  ['fireball', 'center', 'center', 'low', 'speed read', SHOT_PLAN_DIFFICULTY_BANDS.chaos, ['speed', 'center', 'read-check'], 'read-check'],
  ['curve', 'outerRight', 'outerLeft', 'middle', 'final switch', SHOT_PLAN_DIFFICULTY_BANDS.chaos, ['curve', 'late-correction', 'switch'], 'curve-misread', -1],
  ['standard', 'outerLeft', 'outerLeft', 'high', 'final overcommit', SHOT_PLAN_DIFFICULTY_BANDS.chaos, ['overcommit', 'same-side', 'punish'], 'overcommit-punish'],
  ['heavy', 'outerLeft', 'outerLeft', 'low', 'closing drag', SHOT_PLAN_DIFFICULTY_BANDS.chaos, ['low', 'extreme-side', 'commitment', 'finish'], 'late-recovery'],
  ['fireball', 'outerRight', 'outerRight', 'high', 'high corner finish', SHOT_PLAN_DIFFICULTY_BANDS.chaos, ['speed', 'corner', 'high-low', 'finish'], 'high-low-misread'],
].map(([hex, originLane, targetLane, placementHeight, label, difficultyBand, pressureTags, intendedFailureMode, curveDirection]) => ({
  shot: {
    hex,
    originLane,
    targetLane,
    placementHeight,
    ...(curveDirection !== undefined ? { curveDirection } : {}),
  },
  designer: {
    label,
    difficultyBand,
    pressureTags,
    intendedFailureMode,
  },
}));

const SHOT_PHASE_POOLS = [
  [
    {
      shot: { hex: 'standard', originLane: 'innerLeft', targetLane: 'innerLeft', placementHeight: 'low' },
      designer: { label: 'build left lane', difficultyBand: SHOT_PLAN_DIFFICULTY_BANDS.readable, pressureTags: ['lane', 'read'], intendedFailureMode: 'setup' },
    },
    {
      shot: { hex: 'standard', originLane: 'innerRight', targetLane: 'innerRight', placementHeight: 'middle' },
      designer: { label: 'build right lane', difficultyBand: SHOT_PLAN_DIFFICULTY_BANDS.readable, pressureTags: ['lane', 'read'], intendedFailureMode: 'setup' },
    },
    {
      shot: { hex: 'curve', originLane: 'outerLeft', targetLane: 'innerLeft', placementHeight: 'middle', curveDirection: 1 },
      designer: { label: 'gentle left curve', difficultyBand: SHOT_PLAN_DIFFICULTY_BANDS.readable, pressureTags: ['curve', 'shape'], intendedFailureMode: 'curve-misread' },
    },
    {
      shot: { hex: 'curve', originLane: 'outerRight', targetLane: 'innerRight', placementHeight: 'middle', curveDirection: -1 },
      designer: { label: 'gentle right curve', difficultyBand: SHOT_PLAN_DIFFICULTY_BANDS.readable, pressureTags: ['curve', 'shape'], intendedFailureMode: 'curve-misread' },
    },
    {
      shot: { hex: 'fireball', originLane: 'center', targetLane: 'center', placementHeight: 'low' },
      designer: { label: 'central speed test', difficultyBand: SHOT_PLAN_DIFFICULTY_BANDS.readable, pressureTags: ['speed', 'center'], intendedFailureMode: 'read-check' },
    },
    {
      shot: { hex: 'heavy', originLane: 'outerLeft', targetLane: 'outerLeft', placementHeight: 'low' },
      designer: { label: 'cross-body weight', difficultyBand: SHOT_PLAN_DIFFICULTY_BANDS.readable, pressureTags: [...HEAVY_PRESSURE_TAGS, 'weight', 'cross-body'], intendedFailureMode: 'heavy-bait' },
    },
  ],
  [
    {
      shot: { hex: 'standard', originLane: 'outerLeft', targetLane: 'innerLeft', placementHeight: 'high' },
      designer: { label: 'pressure left high', difficultyBand: SHOT_PLAN_DIFFICULTY_BANDS.mixed, pressureTags: ['wide', 'high'], intendedFailureMode: 'high-low-misread' },
    },
    {
      shot: { hex: 'standard', originLane: 'outerRight', targetLane: 'innerRight', placementHeight: 'high' },
      designer: { label: 'pressure right high', difficultyBand: SHOT_PLAN_DIFFICULTY_BANDS.mixed, pressureTags: ['wide', 'high'], intendedFailureMode: 'high-low-misread' },
    },
    {
      shot: { hex: 'curve', originLane: 'outerLeft', targetLane: 'innerRight', placementHeight: 'middle', curveDirection: 1 },
      designer: { label: 'sweeping left curve', difficultyBand: SHOT_PLAN_DIFFICULTY_BANDS.mixed, pressureTags: ['curve', 'switch'], intendedFailureMode: 'curve-bait' },
    },
    {
      shot: { hex: 'curve', originLane: 'outerRight', targetLane: 'innerLeft', placementHeight: 'middle', curveDirection: -1 },
      designer: { label: 'sweeping right curve', difficultyBand: SHOT_PLAN_DIFFICULTY_BANDS.mixed, pressureTags: ['curve', 'switch'], intendedFailureMode: 'curve-bait' },
    },
    {
      shot: { hex: 'fireball', originLane: 'center', targetLane: 'center', placementHeight: 'high' },
      designer: { label: 'fast central test', difficultyBand: SHOT_PLAN_DIFFICULTY_BANDS.mixed, pressureTags: ['speed', 'center', 'high'], intendedFailureMode: 'read-check' },
    },
    {
      shot: { hex: 'heavy', originLane: 'outerRight', targetLane: 'outerRight', placementHeight: 'low' },
      designer: { label: 'heavy cross drag', difficultyBand: SHOT_PLAN_DIFFICULTY_BANDS.mixed, pressureTags: [...HEAVY_PRESSURE_TAGS, 'weight', 'cross-body'], intendedFailureMode: 'heavy-bait' },
    },
  ],
  [
    {
      shot: { hex: 'standard', originLane: 'outerLeft', targetLane: 'outerLeft', placementHeight: 'high' },
      designer: { label: 'clutch left squeeze', difficultyBand: SHOT_PLAN_DIFFICULTY_BANDS.chaos, pressureTags: ['corner', 'late'], intendedFailureMode: 'same-side-pinning' },
    },
    {
      shot: { hex: 'standard', originLane: 'outerRight', targetLane: 'outerRight', placementHeight: 'high' },
      designer: { label: 'clutch right squeeze', difficultyBand: SHOT_PLAN_DIFFICULTY_BANDS.chaos, pressureTags: ['corner', 'late'], intendedFailureMode: 'same-side-pinning' },
    },
    {
      shot: { hex: 'curve', originLane: 'outerLeft', targetLane: 'outerRight', placementHeight: 'middle', curveDirection: 1 },
      designer: { label: 'late curve switch', difficultyBand: SHOT_PLAN_DIFFICULTY_BANDS.chaos, pressureTags: ['curve', 'switch'], intendedFailureMode: 'curve-misread' },
    },
    {
      shot: { hex: 'curve', originLane: 'outerRight', targetLane: 'outerLeft', placementHeight: 'middle', curveDirection: -1 },
      designer: { label: 'late curve reverse', difficultyBand: SHOT_PLAN_DIFFICULTY_BANDS.chaos, pressureTags: ['curve', 'switch'], intendedFailureMode: 'curve-misread' },
    },
    {
      shot: { hex: 'fireball', originLane: 'outerRight', targetLane: 'outerRight', placementHeight: 'high' },
      designer: { label: 'late fireball corner', difficultyBand: SHOT_PLAN_DIFFICULTY_BANDS.chaos, pressureTags: ['speed', 'corner', 'high'], intendedFailureMode: 'opposite-side-punish' },
    },
    {
      shot: { hex: 'heavy', originLane: 'outerLeft', targetLane: 'outerLeft', placementHeight: 'low' },
      designer: { label: 'late heavy cross', difficultyBand: SHOT_PLAN_DIFFICULTY_BANDS.chaos, pressureTags: [...HEAVY_PRESSURE_TAGS, 'weight', 'finish'], intendedFailureMode: 'late-recovery' },
    },
  ],
];

function cloneDesigner(designer) {
  return {
    label: designer.label,
    difficultyBand: designer.difficultyBand,
    pressureTags: [...designer.pressureTags],
    intendedFailureMode: designer.intendedFailureMode,
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

function jitter(value, spread, rng) {
  return value + (rng() * 2 - 1) * spread;
}

function clampTargetPoint(point) {
  return {
    x: Math.max(SHOT_PLAN_SAFE_TARGET_X_MIN, Math.min(SHOT_PLAN_SAFE_TARGET_X_MAX, point.x)),
    y: Math.max(SHOT_PLAN_SAFE_TARGET_Y_MIN, Math.min(SHOT_PLAN_SAFE_TARGET_Y_MAX, point.y)),
  };
}

function buildShotEntry({ index, shot, designer }) {
  return {
    index,
    shot,
    designer,
  };
}

function createPlanId(seedText) {
  return `shot-plan-${hashSeed(seedText).toString(36)}`;
}

function cloneShot(shot) {
  return {
    ...shot,
    start: { ...shot.start },
    target: { ...shot.target },
  };
}

function cloneShotDesigner(designer) {
  return {
    ...designer,
    pressureTags: [...designer.pressureTags],
  };
}

function resolveLane(laneMap, laneKey, kind) {
  const lane = laneMap[laneKey];
  if (!lane) {
    throw new Error(`Shot plan ${kind} lane is unknown: ${laneKey}`);
  }

  return lane;
}

function createShotCoordinates(template, rng, jitterAmount = 1) {
  const originLane = resolveLane(ORIGIN_LANES, template.originLane, 'origin');
  const targetLane = resolveLane(TARGET_LANES, template.targetLane, 'target');
  const placementHeight = PLACEMENT_HEIGHT_ZONES[template.placementHeight];
  if (!placementHeight) {
    throw new Error(`Shot plan placement height is unknown: ${template.placementHeight}`);
  }

  const sharedHeavyX = template.hex === 'heavy'
    ? jitter(originLane.x, 0.12 * jitterAmount, rng)
    : null;
  const start = {
    x: sharedHeavyX ?? jitter(originLane.x, 0.12 * jitterAmount, rng),
    y: jitter(SHOT_PLAN_START_Y, 0.04 * jitterAmount, rng),
  };
  const target = clampTargetPoint({
    x: sharedHeavyX ?? jitter(targetLane.x, 0.14 * jitterAmount, rng),
    y: jitter(placementHeight.y, 0.06 * jitterAmount, rng),
  });

  return {
    start,
    target,
    originLane: originLane.key,
    targetLane: targetLane.key,
    placementHeight: placementHeight.key,
  };
}

function createShotTemplateEntry(template, index, band, rng, planId, jitterAmount = 1) {
  const coordinates = createShotCoordinates(template.shot, rng, jitterAmount);
  const shot = {
    hex: template.shot.hex,
    start: coordinates.start,
    target: coordinates.target,
    originLane: coordinates.originLane,
    targetLane: coordinates.targetLane,
    placementHeight: coordinates.placementHeight,
  };

  if (template.shot.curveDirection !== undefined) {
    shot.curveDirection = template.shot.curveDirection;
  }

  return buildShotEntry({
    index,
    shot,
    designer: {
      label: template.designer.label,
      difficultyBand: band,
      pressureTags: [...template.designer.pressureTags, coordinates.originLane, coordinates.targetLane, coordinates.placementHeight],
      intendedFailureMode: template.designer.intendedFailureMode,
      planId,
      originLane: coordinates.originLane,
      targetLane: coordinates.targetLane,
      placementHeight: coordinates.placementHeight,
      opener: false,
    },
  });
}

function createFixedOpenerEntry(template, index, planId) {
  const coordinates = createShotCoordinates(template.shot, createRng(`${template.designer.label}-${index}`), 0);
  const shot = {
    hex: template.shot.hex,
    start: coordinates.start,
    target: coordinates.target,
    originLane: coordinates.originLane,
    targetLane: coordinates.targetLane,
    placementHeight: coordinates.placementHeight,
  };

  if (template.shot.curveDirection !== undefined) {
    shot.curveDirection = template.shot.curveDirection;
  }

  return buildShotEntry({
    index,
    shot,
    designer: {
      ...cloneDesigner(template.designer),
      planId,
      originLane: coordinates.originLane,
      targetLane: coordinates.targetLane,
      placementHeight: coordinates.placementHeight,
    },
  });
}

function getPhaseLayoutForBand(band) {
  if (band === SHOT_PLAN_DIFFICULTY_BANDS.readable) return PHASE_LAYOUTS.readable;
  if (band === SHOT_PLAN_DIFFICULTY_BANDS.mixed) return PHASE_LAYOUTS.mixed;
  return PHASE_LAYOUTS.chaos;
}

function shuffleWithRng(items, rng) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }

  return copy;
}

function getSetpieceTemplatesForBand(band) {
  if (band === SHOT_PLAN_DIFFICULTY_BANDS.readable) return SETPIECE_PHASE_LIBRARY.readable;
  if (band === SHOT_PLAN_DIFFICULTY_BANDS.mixed) return SETPIECE_PHASE_LIBRARY.mixed;
  return SETPIECE_PHASE_LIBRARY.chaos;
}

function setpieceFitsDistribution(template, hexCounts, hexCountTarget) {
  if (!hexCountTarget) return true;

  const requiredCounts = new Map();
  for (const shot of template.shots) {
    requiredCounts.set(shot.shot.hex, (requiredCounts.get(shot.shot.hex) ?? 0) + 1);
  }

  for (const [hex, requiredCount] of requiredCounts.entries()) {
    const remainingForHex = hexCountTarget[hex] - (hexCounts.get(hex) ?? 0);
    if (remainingForHex < requiredCount) {
      return false;
    }
  }

  return true;
}

function buildIsolatedEntry(index, band, plan, rng, planId, hexCounts, hexCountTarget, forcedHex = null) {
  const pool = SHOT_PHASE_POOLS[phaseIndexForBand(band)];
  const candidates = (forcedHex ? pool.filter((template) => template.shot.hex === forcedHex) : pool)
    .filter((template) => candidateFitsDistribution(template, hexCounts, hexCountTarget));

  if (candidates.length === 0) {
    return null;
  }

  const retries = Math.max(6, candidates.length);
  for (let attempt = 0; attempt < retries; attempt += 1) {
    const candidate = pickWeightedCandidate(candidates, plan, band, rng, hexCounts, hexCountTarget);
    const generated = createShotTemplateEntry(candidate, index, band, rng, planId);
    if (isCandidateValid(generated, plan, band)) {
      return generated;
    }
  }

  const shuffled = shuffleWithRng(candidates, rng);
  for (const candidate of shuffled) {
    const generated = createShotTemplateEntry(candidate, index, band, rng, planId);
    if (isCandidateValid(generated, plan, band)) {
      return generated;
    }
  }

  return null;
}

function validateSetpieceEntries(entries, plan, band, validator = isCandidateValid) {
  const firstValid = validator(entries[0], plan, band);
  const secondValid = validator(entries[1], [...plan, entries[0]], band);

  return firstValid && secondValid;
}

export function pickSetpieceEntries({
  index,
  band,
  plan,
  rng,
  planId,
  hexCounts,
  hexCountTarget,
  validator = isCandidateValid,
  instantiate = instantiateSetpiece,
  templates = getSetpieceTemplatesForBand(band),
  shuffle = shuffleWithRng,
} = {}) {
  const availableTemplates = shuffle(
    templates.filter((template) => setpieceFitsDistribution(template, hexCounts, hexCountTarget)),
    rng,
  );

  if (availableTemplates.length === 0) {
    return null;
  }

  for (const template of availableTemplates) {
    const primarySide = rng() < 0.5 ? 'left' : 'right';
    for (const side of [primarySide, mirrorSide(primarySide)]) {
      const resolved = instantiate(template, side);
      const generatedEntries = resolved.shots.map((shotTemplate, offset) => createShotTemplateEntry(shotTemplate, index + offset, band, rng, planId));

      if (validateSetpieceEntries(generatedEntries, plan, band, validator)) {
        return generatedEntries;
      }
    }
  }

  return null;
}

function candidateSignature(candidate) {
  return [
    candidate.shot.hex,
    candidate.shot.originLane,
    candidate.shot.targetLane,
    candidate.shot.placementHeight,
  ].join('|');
}

function isOuterLane(laneKey) {
  return OUTER_LANES.has(laneKey);
}

function laneSide(laneKey) {
  if (laneKey.includes('left')) return 'left';
  if (laneKey.includes('right')) return 'right';
  return 'center';
}

function isOppositeSideLane(candidateLane, referenceLane) {
  return laneSide(candidateLane) === (laneSide(referenceLane) === 'left' ? 'right' : 'left');
}

function isHighCornerFireball(candidate) {
  return candidate.shot.hex === 'fireball'
    && candidate.shot.placementHeight === 'high'
    && (isOuterLane(candidate.shot.originLane) || isOuterLane(candidate.shot.targetLane));
}

function isCandidateFairForBand(candidate, band) {
  if (candidate.shot.hex !== 'fireball') return true;

  if (band === SHOT_PLAN_DIFFICULTY_BANDS.readable) {
    return !isHighCornerFireball(candidate);
  }

  if (band === SHOT_PLAN_DIFFICULTY_BANDS.mixed) {
    return !(candidate.shot.placementHeight === 'high' && (isOuterLane(candidate.shot.originLane) || isOuterLane(candidate.shot.targetLane)));
  }

  return true;
}

export function getCandidateSelectionWeight(candidate, plan, band) {
  const last = plan[plan.length - 1];
  if (
    !last
    || last.shot.hex !== 'heavy'
    || (band !== SHOT_PLAN_DIFFICULTY_BANDS.mixed && band !== SHOT_PLAN_DIFFICULTY_BANDS.chaos)
  ) {
    return 1;
  }

  if (candidate.shot.hex === 'heavy') {
    return 1;
  }

  if (isOppositeSideLane(candidate.shot.targetLane, last.shot.targetLane)) {
    return 2;
  }

  if (laneSide(candidate.shot.targetLane) === 'center') {
    return 1.15;
  }

  return 0.9;
}

function getDistributionWeight(candidate, hexCounts, hexCountTarget) {
  if (!hexCountTarget) return 1;

  const remainingForHex = hexCountTarget[candidate.shot.hex] - (hexCounts.get(candidate.shot.hex) ?? 0);
  return Math.max(0.1, remainingForHex);
}

function pickWeightedCandidate(candidates, plan, band, rng, hexCounts, hexCountTarget) {
  const weights = candidates.map((candidate) => (
    getCandidateSelectionWeight(candidate, plan, band) * getDistributionWeight(candidate, hexCounts, hexCountTarget)
  ));
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  let roll = rng() * totalWeight;

  for (let index = 0; index < candidates.length; index += 1) {
    roll -= weights[index];
    if (roll <= 0) return candidates[index];
  }

  return candidates[candidates.length - 1];
}

function isCandidateValid(candidate, plan, band) {
  const last = plan[plan.length - 1];
  const previous = plan[plan.length - 2];

  if (!isCandidateFairForBand(candidate, band)) {
    return false;
  }

  if (last && last.shot.hex === candidate.shot.hex && previous?.shot.hex === candidate.shot.hex) {
    return false;
  }

  if (last && last.shot.targetLane === candidate.shot.targetLane && previous?.shot.targetLane === candidate.shot.targetLane) {
    return false;
  }

  if (last && candidateSignature(last) === candidateSignature(candidate)) {
    return false;
  }

  return true;
}

function bandForIndex(index, totalShots) {
  const openerCount = FIXED_OPENER_SHOTS.length;
  if (index < openerCount) return 'opener';

  const remainingShots = totalShots - openerCount;
  const phaseProgress = (index - openerCount) / remainingShots;
  if (phaseProgress < 1 / 3) return SHOT_PLAN_DIFFICULTY_BANDS.readable;
  if (phaseProgress < 2 / 3) return SHOT_PLAN_DIFFICULTY_BANDS.mixed;
  return SHOT_PLAN_DIFFICULTY_BANDS.chaos;
}

function phaseIndexForBand(band) {
  if (band === SHOT_PLAN_DIFFICULTY_BANDS.readable) return 0;
  if (band === SHOT_PLAN_DIFFICULTY_BANDS.mixed) return 1;
  return 2;
}

function buildCalibrationEntry(template, index, planId) {
  const coordinates = createShotCoordinates(template.shot, createRng(`${planId}:${index}`), 0);
  const shot = {
    hex: template.shot.hex,
    start: coordinates.start,
    target: coordinates.target,
    originLane: coordinates.originLane,
    targetLane: coordinates.targetLane,
    placementHeight: coordinates.placementHeight,
  };

  if (template.shot.curveDirection !== undefined) {
    shot.curveDirection = template.shot.curveDirection;
  }

  return buildShotEntry({
    index,
    shot,
    designer: {
      label: template.designer.label,
      difficultyBand: template.designer.difficultyBand,
      pressureTags: [...template.designer.pressureTags, coordinates.originLane, coordinates.targetLane, coordinates.placementHeight],
      intendedFailureMode: template.designer.intendedFailureMode,
      planId,
      originLane: coordinates.originLane,
      targetLane: coordinates.targetLane,
      placementHeight: coordinates.placementHeight,
      opener: template.designer.difficultyBand === 'opener',
    },
  });
}

function createHexCountTarget(totalShots, rng) {
  if (totalShots !== DEFAULT_SHOT_PLAN_TOTAL_SHOTS) return null;

  const validTargets = [];
  for (let standard = SHOT_PLAN_HEX_COUNT_RANGES.standard.min; standard <= SHOT_PLAN_HEX_COUNT_RANGES.standard.max; standard += 1) {
    for (let curve = SHOT_PLAN_HEX_COUNT_RANGES.curve.min; curve <= SHOT_PLAN_HEX_COUNT_RANGES.curve.max; curve += 1) {
      for (let fireball = SHOT_PLAN_HEX_COUNT_RANGES.fireball.min; fireball <= SHOT_PLAN_HEX_COUNT_RANGES.fireball.max; fireball += 1) {
        for (let heavy = SHOT_PLAN_HEX_COUNT_RANGES.heavy.min; heavy <= SHOT_PLAN_HEX_COUNT_RANGES.heavy.max; heavy += 1) {
          if (standard + curve + fireball + heavy !== totalShots) continue;
          if (heavy >= standard || heavy >= curve || heavy >= fireball) continue;
          validTargets.push({ standard, curve, fireball, heavy });
        }
      }
    }
  }

  if (validTargets.length === 0) {
    throw new Error(`Shot plan distribution has no valid target for ${totalShots} shots`);
  }

  return validTargets[Math.floor(rng() * validTargets.length)];
}

function candidateFitsDistribution(candidate, hexCounts, hexCountTarget) {
  if (!hexCountTarget) return true;

  return (hexCounts.get(candidate.shot.hex) ?? 0) < hexCountTarget[candidate.shot.hex];
}

function generateShotPlanAttempt(normalizedSeed, totalShots, attempt) {
  const generationSeed = attempt === 0 ? normalizedSeed : `${normalizedSeed}:fallback-${attempt}`;
  const rng = createRng(generationSeed);
  const planId = createPlanId(normalizedSeed);
  const hexCountTarget = createHexCountTarget(totalShots, rng);
  const plan = [];
  const hexCounts = new Map(SHOT_PLAN_REQUIRED_HEXES.map((hex) => [hex, 0]));

  for (let index = 0; index < FIXED_OPENER_SHOTS.length; index += 1) {
    const opener = FIXED_OPENER_SHOTS[index];
    const openerEntry = createFixedOpenerEntry(opener, index, planId);
    openerEntry.designer.opener = true;
    plan.push(openerEntry);
    hexCounts.set(openerEntry.shot.hex, (hexCounts.get(openerEntry.shot.hex) ?? 0) + 1);
  }

  if (totalShots !== DEFAULT_SHOT_PLAN_TOTAL_SHOTS) {
    for (let index = FIXED_OPENER_SHOTS.length; index < totalShots; index += 1) {
      const band = bandForIndex(index, totalShots);
      const remainingShots = totalShots - index;
      const missingHexes = SHOT_PLAN_REQUIRED_HEXES.filter((hex) => (hexCounts.get(hex) ?? 0) === 0);
      const forcedHex = !hexCountTarget && missingHexes.length > 0 && remainingShots <= missingHexes.length
        ? missingHexes[0]
        : null;
      const generated = buildIsolatedEntry(index, band, plan, rng, planId, hexCounts, hexCountTarget, forcedHex);
      if (!generated) {
        return null;
      }

      plan.push(generated);
      hexCounts.set(generated.shot.hex, (hexCounts.get(generated.shot.hex) ?? 0) + 1);
    }

    return plan.length === totalShots ? plan : null;
  }

  const phaseBands = [
    SHOT_PLAN_DIFFICULTY_BANDS.readable,
    SHOT_PLAN_DIFFICULTY_BANDS.mixed,
    SHOT_PLAN_DIFFICULTY_BANDS.chaos,
  ];

  for (const band of phaseBands) {
    const layout = getPhaseLayoutForBand(band);
    let bandShotCount = 0;

    for (const slot of layout) {
      if (slot === 'isolated') {
        const remainingShots = totalShots - plan.length;
        const missingHexes = SHOT_PLAN_REQUIRED_HEXES.filter((hex) => (hexCounts.get(hex) ?? 0) === 0);
        const forcedHex = !hexCountTarget && missingHexes.length > 0 && remainingShots <= missingHexes.length
          ? missingHexes[0]
          : null;
        const generated = buildIsolatedEntry(plan.length, band, plan, rng, planId, hexCounts, hexCountTarget, forcedHex);
        if (!generated) {
          return null;
        }

        plan.push(generated);
        hexCounts.set(generated.shot.hex, (hexCounts.get(generated.shot.hex) ?? 0) + 1);
        bandShotCount += 1;
        continue;
      }

      const setpieceEntries = pickSetpieceEntries({
        index: plan.length,
        band,
        plan,
        rng,
        planId,
        hexCounts,
        hexCountTarget,
      });
      if (setpieceEntries) {
        for (const entry of setpieceEntries) {
          plan.push(entry);
          hexCounts.set(entry.shot.hex, (hexCounts.get(entry.shot.hex) ?? 0) + 1);
        }
        bandShotCount += 2;
        continue;
      }

      const firstFallback = buildIsolatedEntry(plan.length, band, plan, rng, planId, hexCounts, hexCountTarget);
      if (!firstFallback) {
        return null;
      }

      plan.push(firstFallback);
      hexCounts.set(firstFallback.shot.hex, (hexCounts.get(firstFallback.shot.hex) ?? 0) + 1);

      const secondFallback = buildIsolatedEntry(plan.length, band, plan, rng, planId, hexCounts, hexCountTarget);
      if (!secondFallback) {
        return null;
      }

      plan.push(secondFallback);
      hexCounts.set(secondFallback.shot.hex, (hexCounts.get(secondFallback.shot.hex) ?? 0) + 1);
      bandShotCount += 2;
    }

    while (bandShotCount < PHASE_SHOT_COUNT) {
      const remainingShots = totalShots - plan.length;
      const missingHexes = SHOT_PLAN_REQUIRED_HEXES.filter((hex) => (hexCounts.get(hex) ?? 0) === 0);
      const forcedHex = band === SHOT_PLAN_DIFFICULTY_BANDS.chaos && bandShotCount === PHASE_SHOT_COUNT - 1
        ? 'fireball'
        : (!hexCountTarget && missingHexes.length > 0 && remainingShots <= missingHexes.length
          ? missingHexes[0]
          : null);
      const generated = buildIsolatedEntry(plan.length, band, plan, rng, planId, hexCounts, hexCountTarget, forcedHex);
      if (!generated) {
        return null;
      }

      plan.push(generated);
      hexCounts.set(generated.shot.hex, (hexCounts.get(generated.shot.hex) ?? 0) + 1);
      bandShotCount += 1;
    }

    if (bandShotCount !== PHASE_SHOT_COUNT) {
      return null;
    }
  }

  if (plan.length !== totalShots) {
    return null;
  }

  return plan;
}

export function createShotPlan(seed, rules = {}) {
  const normalizedSeed = normalizeSeed(seed);
  const { totalShots } = normalizeRules(rules);
  const attempts = 24;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const plan = generateShotPlanAttempt(normalizedSeed, totalShots, attempt);
    if (plan) return plan;
  }

  throw new Error(`Shot plan generation failed after ${attempts} attempts`);
}

export function createCalibrationShotChain(rules = {}) {
  const { totalShots = CALIBRATION_SHOT_CHAIN_BLUEPRINT.length } = rules;

  if (!Number.isInteger(totalShots) || totalShots !== CALIBRATION_SHOT_CHAIN_BLUEPRINT.length) {
    throw new Error(`Calibration Shot Chain must be exactly ${CALIBRATION_SHOT_CHAIN_BLUEPRINT.length} shots: ${totalShots}`);
  }

  const planId = createPlanId('calibration-shot-chain');

  return CALIBRATION_SHOT_CHAIN_BLUEPRINT.map((template, index) => buildCalibrationEntry(template, index, planId));
}

export function describeShotPlan(plan) {
  return plan.map((entry) => ({
    index: entry.index,
    shot: cloneShot(entry.shot),
    designer: cloneShotDesigner(entry.designer),
  }));
}
