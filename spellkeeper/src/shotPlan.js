const DEFAULT_SHOT_PLAN_TOTAL_SHOTS = 30;
export const DEFAULT_SHOT_PLAN_SEED = 'spellkeeper-default-shot-plan';

const SHOT_PLAN_REQUIRED_HEXES = ['standard', 'curve', 'fireball', 'heavy'];
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
  mid: { key: 'mid', y: -3.35 },
  high: { key: 'high', y: -2.9 },
};
const OUTER_LANES = new Set(['outer-left', 'outer-right']);

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
    },
  },
  {
    shot: {
      hex: 'standard',
      originLane: 'innerRight',
      targetLane: 'innerRight',
      placementHeight: 'mid',
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
      originLane: 'outerRight',
      targetLane: 'outerRight',
      placementHeight: 'low',
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
      shot: { hex: 'standard', originLane: 'innerLeft', targetLane: 'innerLeft', placementHeight: 'low' },
      designer: { label: 'build left lane', difficultyBand: SHOT_PLAN_DIFFICULTY_BANDS.readable, pressureTags: ['lane', 'read'] },
    },
    {
      shot: { hex: 'standard', originLane: 'innerRight', targetLane: 'innerRight', placementHeight: 'mid' },
      designer: { label: 'build right lane', difficultyBand: SHOT_PLAN_DIFFICULTY_BANDS.readable, pressureTags: ['lane', 'read'] },
    },
    {
      shot: { hex: 'curve', originLane: 'outerLeft', targetLane: 'innerLeft', placementHeight: 'mid', curveDirection: 1 },
      designer: { label: 'gentle left curve', difficultyBand: SHOT_PLAN_DIFFICULTY_BANDS.readable, pressureTags: ['curve', 'shape'] },
    },
    {
      shot: { hex: 'curve', originLane: 'outerRight', targetLane: 'innerRight', placementHeight: 'mid', curveDirection: -1 },
      designer: { label: 'gentle right curve', difficultyBand: SHOT_PLAN_DIFFICULTY_BANDS.readable, pressureTags: ['curve', 'shape'] },
    },
    {
      shot: { hex: 'fireball', originLane: 'center', targetLane: 'center', placementHeight: 'low' },
      designer: { label: 'central speed test', difficultyBand: SHOT_PLAN_DIFFICULTY_BANDS.readable, pressureTags: ['speed', 'center'] },
    },
    {
      shot: { hex: 'heavy', originLane: 'outerLeft', targetLane: 'outerLeft', placementHeight: 'low' },
      designer: { label: 'cross-body weight', difficultyBand: SHOT_PLAN_DIFFICULTY_BANDS.readable, pressureTags: ['weight', 'cross-body'] },
    },
  ],
  [
    {
      shot: { hex: 'standard', originLane: 'outerLeft', targetLane: 'innerLeft', placementHeight: 'high' },
      designer: { label: 'pressure left high', difficultyBand: SHOT_PLAN_DIFFICULTY_BANDS.mixed, pressureTags: ['wide', 'high'] },
    },
    {
      shot: { hex: 'standard', originLane: 'outerRight', targetLane: 'innerRight', placementHeight: 'high' },
      designer: { label: 'pressure right high', difficultyBand: SHOT_PLAN_DIFFICULTY_BANDS.mixed, pressureTags: ['wide', 'high'] },
    },
    {
      shot: { hex: 'curve', originLane: 'outerLeft', targetLane: 'innerRight', placementHeight: 'mid', curveDirection: 1 },
      designer: { label: 'sweeping left curve', difficultyBand: SHOT_PLAN_DIFFICULTY_BANDS.mixed, pressureTags: ['curve', 'switch'] },
    },
    {
      shot: { hex: 'curve', originLane: 'outerRight', targetLane: 'innerLeft', placementHeight: 'mid', curveDirection: -1 },
      designer: { label: 'sweeping right curve', difficultyBand: SHOT_PLAN_DIFFICULTY_BANDS.mixed, pressureTags: ['curve', 'switch'] },
    },
    {
      shot: { hex: 'fireball', originLane: 'center', targetLane: 'center', placementHeight: 'high' },
      designer: { label: 'fast central test', difficultyBand: SHOT_PLAN_DIFFICULTY_BANDS.mixed, pressureTags: ['speed', 'center', 'high'] },
    },
    {
      shot: { hex: 'heavy', originLane: 'outerRight', targetLane: 'outerRight', placementHeight: 'low' },
      designer: { label: 'heavy cross drag', difficultyBand: SHOT_PLAN_DIFFICULTY_BANDS.mixed, pressureTags: ['weight', 'cross-body'] },
    },
  ],
  [
    {
      shot: { hex: 'standard', originLane: 'outerLeft', targetLane: 'outerLeft', placementHeight: 'high' },
      designer: { label: 'clutch left squeeze', difficultyBand: SHOT_PLAN_DIFFICULTY_BANDS.chaos, pressureTags: ['corner', 'late'] },
    },
    {
      shot: { hex: 'standard', originLane: 'outerRight', targetLane: 'outerRight', placementHeight: 'high' },
      designer: { label: 'clutch right squeeze', difficultyBand: SHOT_PLAN_DIFFICULTY_BANDS.chaos, pressureTags: ['corner', 'late'] },
    },
    {
      shot: { hex: 'curve', originLane: 'outerLeft', targetLane: 'outerRight', placementHeight: 'mid', curveDirection: 1 },
      designer: { label: 'late curve switch', difficultyBand: SHOT_PLAN_DIFFICULTY_BANDS.chaos, pressureTags: ['curve', 'switch'] },
    },
    {
      shot: { hex: 'curve', originLane: 'outerRight', targetLane: 'outerLeft', placementHeight: 'mid', curveDirection: -1 },
      designer: { label: 'late curve reverse', difficultyBand: SHOT_PLAN_DIFFICULTY_BANDS.chaos, pressureTags: ['curve', 'switch'] },
    },
    {
      shot: { hex: 'fireball', originLane: 'outerRight', targetLane: 'outerRight', placementHeight: 'high' },
      designer: { label: 'late fireball corner', difficultyBand: SHOT_PLAN_DIFFICULTY_BANDS.chaos, pressureTags: ['speed', 'corner', 'high'] },
    },
    {
      shot: { hex: 'heavy', originLane: 'outerLeft', targetLane: 'outerLeft', placementHeight: 'low' },
      designer: { label: 'late heavy cross', difficultyBand: SHOT_PLAN_DIFFICULTY_BANDS.chaos, pressureTags: ['weight', 'finish'] },
    },
  ],
];

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

function createShotTemplateEntry(template, index, band, rng, jitterAmount = 1) {
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
      originLane: coordinates.originLane,
      targetLane: coordinates.targetLane,
      placementHeight: coordinates.placementHeight,
      opener: false,
    },
  });
}

function createFixedOpenerEntry(template, index) {
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
      originLane: coordinates.originLane,
      targetLane: coordinates.targetLane,
      placementHeight: coordinates.placementHeight,
    },
  });
}

function candidateSignature(candidate) {
  return [
    candidate.shot.hex,
    candidate.shot.originLane,
    candidate.shot.targetLane,
    candidate.shot.placementHeight,
    candidate.shot.curveDirection ?? 0,
  ].join('|');
}

function isOuterLane(laneKey) {
  return OUTER_LANES.has(laneKey);
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

export function createShotPlan(seed, rules = {}) {
  const normalizedSeed = normalizeSeed(seed);
  const { totalShots } = normalizeRules(rules);
  const rng = createRng(normalizedSeed);
  const plan = [];
  const hexCounts = new Map(SHOT_PLAN_REQUIRED_HEXES.map((hex) => [hex, 0]));

  for (let index = 0; index < totalShots; index += 1) {
    if (index < FIXED_OPENER_SHOTS.length) {
      const opener = FIXED_OPENER_SHOTS[index];
      const openerEntry = createFixedOpenerEntry(opener, index);
      openerEntry.designer.opener = true;
      plan.push(openerEntry);
      hexCounts.set(openerEntry.shot.hex, (hexCounts.get(openerEntry.shot.hex) ?? 0) + 1);
      continue;
    }

    const band = bandForIndex(index, totalShots);
    const pool = SHOT_PHASE_POOLS[phaseIndexForBand(band)];
    const remainingSlots = totalShots - index;
    const missingHexes = SHOT_PLAN_REQUIRED_HEXES.filter((hex) => (hexCounts.get(hex) ?? 0) === 0);
    const forcedHex = missingHexes.length > 0 && remainingSlots <= missingHexes.length
      ? missingHexes[0]
      : null;
    const candidates = forcedHex ? pool.filter((template) => template.shot.hex === forcedHex) : pool;

    let template = null;
    const retries = Math.max(6, candidates.length);
    for (let attempt = 0; attempt < retries && !template; attempt += 1) {
      const candidate = candidates[Math.floor(rng() * candidates.length)];
      const generated = createShotTemplateEntry(candidate, index, band, rng);
      if (isCandidateValid(generated, plan, band)) {
        template = candidate;
        plan.push(generated);
        hexCounts.set(generated.shot.hex, (hexCounts.get(generated.shot.hex) ?? 0) + 1);
      }
    }

    if (!template) {
      for (const fallbackCandidate of candidates) {
        const generated = createShotTemplateEntry(fallbackCandidate, index, band, rng);
        if (isCandidateValid(generated, plan, band)) {
          plan.push(generated);
          hexCounts.set(generated.shot.hex, (hexCounts.get(generated.shot.hex) ?? 0) + 1);
          template = fallbackCandidate;
          break;
        }
      }
    }

    if (!template) {
      throw new Error(`Shot plan generation failed at index ${index} for band ${band}`);
    }
  }

  return plan;
}
