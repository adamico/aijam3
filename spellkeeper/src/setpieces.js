const RELATIVE_LANES = {
  sameOuter: 'same-outer',
  sameInner: 'same-inner',
  oppositeOuter: 'opposite-outer',
  oppositeInner: 'opposite-inner',
  center: 'center',
};

const RELATIVE_CURVE_DIRECTIONS = {
  inward: 'inward',
  outward: 'outward',
};

function mirrorSide(side) {
  if (side === 'left') return 'right';
  if (side === 'right') return 'left';

  throw new Error(`Setpiece side must be left or right: ${side}`);
}

function resolveRelativeLane(relativeLane, side) {
  const isLeft = side === 'left';

  switch (relativeLane) {
    case RELATIVE_LANES.sameOuter:
      return isLeft ? 'outerLeft' : 'outerRight';
    case RELATIVE_LANES.sameInner:
      return isLeft ? 'innerLeft' : 'innerRight';
    case RELATIVE_LANES.oppositeOuter:
      return isLeft ? 'outerRight' : 'outerLeft';
    case RELATIVE_LANES.oppositeInner:
      return isLeft ? 'innerRight' : 'innerLeft';
    case RELATIVE_LANES.center:
      return 'center';
    default:
      throw new Error(`Unknown relative lane: ${relativeLane}`);
  }
}

function resolveRelativeCurveDirection(relativeCurveDirection, side) {
  if (relativeCurveDirection === undefined) return undefined;

  const isLeft = side === 'left';

  switch (relativeCurveDirection) {
    case RELATIVE_CURVE_DIRECTIONS.inward:
      return isLeft ? 1 : -1;
    case RELATIVE_CURVE_DIRECTIONS.outward:
      return isLeft ? -1 : 1;
    default:
      throw new Error(`Unknown relative curve direction: ${relativeCurveDirection}`);
  }
}

function mergePressureTags(...groups) {
  return [...new Set(groups.flat())];
}

function createSetpieceShot(shot, shotDesigner, blueprint, side) {
  const resolvedShot = {
    hex: shot.hex,
    originLane: resolveRelativeLane(shot.originLane, side),
    targetLane: resolveRelativeLane(shot.targetLane, side),
    placementHeight: shot.placementHeight,
  };

  const curveDirection = resolveRelativeCurveDirection(shot.curveDirection, side);
  if (curveDirection !== undefined) {
    resolvedShot.curveDirection = curveDirection;
  }

  return {
    shot: resolvedShot,
    designer: {
      label: shotDesigner.label,
      difficultyBand: blueprint.difficultyBand,
      pressureTags: mergePressureTags(blueprint.pressureTags, shotDesigner.pressureTags),
      intendedFailureMode: blueprint.intendedFailureMode,
      opener: false,
    },
  };
}

function instantiateSetpiece(blueprint, side) {
  return {
    key: blueprint.key,
    label: blueprint.label,
    difficultyBand: blueprint.difficultyBand,
    pressureTags: [...blueprint.pressureTags],
    intendedFailureMode: blueprint.intendedFailureMode,
    side,
    mirrorSide: mirrorSide(side),
    shots: blueprint.shots.map((shot) => createSetpieceShot(shot.shot, shot.designer, blueprint, side)),
  };
}

function createBlueprint({
  key,
  label,
  difficultyBand,
  pressureTags,
  intendedFailureMode,
  shots,
}) {
  return {
    key,
    label,
    difficultyBand,
    pressureTags,
    intendedFailureMode,
    shots,
  };
}

const HEAVY_BAIT_OPPOSITE_PUNISH = createBlueprint({
  key: 'heavy-bait-opposite-punish',
  label: 'heavy bait into opposite punish',
  difficultyBand: 'readable variety',
  pressureTags: ['heavy-bait', 'opposite-punish', 'commitment'],
  intendedFailureMode: 'overcommit-punish',
  shots: [
    {
      shot: {
        hex: 'heavy',
        originLane: RELATIVE_LANES.sameOuter,
        targetLane: RELATIVE_LANES.sameOuter,
        placementHeight: 'low',
      },
      designer: {
        label: 'heavy bait',
        pressureTags: ['low', 'extreme-side', 'commitment'],
      },
    },
    {
      shot: {
        hex: 'standard',
        originLane: RELATIVE_LANES.oppositeInner,
        targetLane: RELATIVE_LANES.oppositeOuter,
        placementHeight: 'high',
      },
      designer: {
        label: 'opposite punish',
        pressureTags: ['opposite-side', 'punish'],
      },
    },
  ],
});

const CURVE_BAIT_SWITCH = createBlueprint({
  key: 'curve-bait-switch',
  label: 'curve bait into switchback',
  difficultyBand: 'mixed pressure',
  pressureTags: ['curve-bait', 'switch', 'shape'],
  intendedFailureMode: 'curve-misread',
  shots: [
    {
      shot: {
        hex: 'curve',
        originLane: RELATIVE_LANES.sameOuter,
        targetLane: RELATIVE_LANES.sameInner,
        placementHeight: 'middle',
        curveDirection: RELATIVE_CURVE_DIRECTIONS.inward,
      },
      designer: {
        label: 'curve bait',
        pressureTags: ['curve', 'bait'],
      },
    },
    {
      shot: {
        hex: 'curve',
        originLane: RELATIVE_LANES.oppositeOuter,
        targetLane: RELATIVE_LANES.oppositeInner,
        placementHeight: 'middle',
        curveDirection: RELATIVE_CURVE_DIRECTIONS.outward,
      },
      designer: {
        label: 'switchback',
        pressureTags: ['curve', 'switch'],
      },
    },
  ],
});

const SAME_SIDE_PIN = createBlueprint({
  key: 'same-side-pin',
  label: 'same-side pin into drag',
  difficultyBand: 'chaos-but-fair',
  pressureTags: ['same-side', 'pin', 'pressure'],
  intendedFailureMode: 'same-side-pinning',
  shots: [
    {
      shot: {
        hex: 'standard',
        originLane: RELATIVE_LANES.sameInner,
        targetLane: RELATIVE_LANES.sameInner,
        placementHeight: 'high',
      },
      designer: {
        label: 'pin high',
        pressureTags: ['same-side', 'high'],
      },
    },
    {
      shot: {
        hex: 'heavy',
        originLane: RELATIVE_LANES.sameOuter,
        targetLane: RELATIVE_LANES.sameOuter,
        placementHeight: 'low',
      },
      designer: {
        label: 'pin low',
        pressureTags: ['low', 'extreme-side', 'commitment'],
      },
    },
  ],
});

const HIGH_LOW_ALTERNATION = createBlueprint({
  key: 'high-low-alternation',
  label: 'high-low alternation',
  difficultyBand: 'readable variety',
  pressureTags: ['high-low', 'alternation', 'read'],
  intendedFailureMode: 'high-low-misread',
  shots: [
    {
      shot: {
        hex: 'standard',
        originLane: RELATIVE_LANES.center,
        targetLane: RELATIVE_LANES.center,
        placementHeight: 'high',
      },
      designer: {
        label: 'high center read',
        pressureTags: ['center', 'high'],
      },
    },
    {
      shot: {
        hex: 'fireball',
        originLane: RELATIVE_LANES.oppositeInner,
        targetLane: RELATIVE_LANES.oppositeInner,
        placementHeight: 'low',
      },
      designer: {
        label: 'low opposite snap',
        pressureTags: ['low', 'opposite-side'],
      },
    },
  ],
});

const SETPIECE_LIBRARY = {
  'heavy-bait-opposite-punish': HEAVY_BAIT_OPPOSITE_PUNISH,
  'curve-bait-switch': CURVE_BAIT_SWITCH,
  'same-side-pin': SAME_SIDE_PIN,
  'high-low-alternation': HIGH_LOW_ALTERNATION,
};

const SETPIECE_PHASE_LIBRARY = {
  readable: [CURVE_BAIT_SWITCH, HIGH_LOW_ALTERNATION],
  mixed: [HEAVY_BAIT_OPPOSITE_PUNISH, CURVE_BAIT_SWITCH, HIGH_LOW_ALTERNATION],
  chaos: [HEAVY_BAIT_OPPOSITE_PUNISH, CURVE_BAIT_SWITCH, SAME_SIDE_PIN, HIGH_LOW_ALTERNATION],
};

export {
  CURVE_BAIT_SWITCH,
  HEAVY_BAIT_OPPOSITE_PUNISH,
  HIGH_LOW_ALTERNATION,
  RELATIVE_CURVE_DIRECTIONS,
  RELATIVE_LANES,
  SAME_SIDE_PIN,
  SETPIECE_LIBRARY,
  SETPIECE_PHASE_LIBRARY,
  instantiateSetpiece,
  mirrorSide,
  resolveRelativeCurveDirection,
  resolveRelativeLane,
};
