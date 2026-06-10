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
      return isLeft ? 'outer-left' : 'outer-right';
    case RELATIVE_LANES.sameInner:
      return isLeft ? 'inner-left' : 'inner-right';
    case RELATIVE_LANES.oppositeOuter:
      return isLeft ? 'outer-right' : 'outer-left';
    case RELATIVE_LANES.oppositeInner:
      return isLeft ? 'inner-right' : 'inner-left';
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

function createSetpieceShot(shot, shotDesigner, template, side) {
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
      difficultyBand: template.difficultyBand,
      pressureTags: mergePressureTags(template.pressureTags, shotDesigner.pressureTags),
      intendedFailureMode: template.intendedFailureMode,
      opener: false,
    },
  };
}

function instantiateSetpiece(template, side) {
  return {
    key: template.key,
    label: template.label,
    difficultyBand: template.difficultyBand,
    pressureTags: [...template.pressureTags],
    intendedFailureMode: template.intendedFailureMode,
    side,
    mirrorSide: mirrorSide(side),
    shots: template.shots.map((shot) => createSetpieceShot(shot.shot, shot.designer, template, side)),
  };
}

const SETPIECE_LIBRARY = {
  readable: [
    {
      key: 'readable-bait-recover',
      label: 'outer bait into opposite recovery',
      difficultyBand: 'readable variety',
      pressureTags: ['bait', 'recovery', 'overcommit'],
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
            targetLane: RELATIVE_LANES.oppositeInner,
            placementHeight: 'middle',
          },
          designer: {
            label: 'opposite recovery',
            pressureTags: ['opposite-side', 'recovery'],
          },
        },
      ],
    },
    {
      key: 'readable-curve-echo',
      label: 'curve bait into inner correction',
      difficultyBand: 'readable variety',
      pressureTags: ['curve', 'shape', 'recovery'],
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
            hex: 'standard',
            originLane: RELATIVE_LANES.oppositeInner,
            targetLane: RELATIVE_LANES.oppositeInner,
            placementHeight: 'high',
          },
          designer: {
            label: 'inner recovery',
            pressureTags: ['opposite-side', 'late-recovery'],
          },
        },
      ],
    },
    {
      key: 'readable-low-high',
      label: 'low bait into higher reset',
      difficultyBand: 'readable variety',
      pressureTags: ['high-low', 'reset', 'read'],
      intendedFailureMode: 'high-low-misread',
      shots: [
        {
          shot: {
            hex: 'standard',
            originLane: RELATIVE_LANES.sameInner,
            targetLane: RELATIVE_LANES.sameInner,
            placementHeight: 'low',
          },
          designer: {
            label: 'low probe',
            pressureTags: ['low', 'probe'],
          },
        },
        {
          shot: {
            hex: 'standard',
            originLane: RELATIVE_LANES.oppositeOuter,
            targetLane: RELATIVE_LANES.oppositeOuter,
            placementHeight: 'middle',
          },
          designer: {
            label: 'higher reset',
            pressureTags: ['reset', 'opposite-side'],
          },
        },
      ],
    },
  ],
  mixed: [
    {
      key: 'mixed-weight-switch',
      label: 'heavy drag into opposite squeeze',
      difficultyBand: 'mixed pressure',
      pressureTags: ['heavy-bait', 'switch', 'recovery'],
      intendedFailureMode: 'heavy-bait',
      shots: [
        {
          shot: {
            hex: 'heavy',
            originLane: RELATIVE_LANES.sameOuter,
            targetLane: RELATIVE_LANES.sameOuter,
            placementHeight: 'low',
          },
          designer: {
            label: 'drag bait',
            pressureTags: ['low', 'extreme-side', 'commitment'],
          },
        },
        {
          shot: {
            hex: 'standard',
            originLane: RELATIVE_LANES.oppositeOuter,
            targetLane: RELATIVE_LANES.oppositeOuter,
            placementHeight: 'high',
          },
          designer: {
            label: 'opposite squeeze',
            pressureTags: ['opposite-side', 'high'],
          },
        },
      ],
    },
    {
      key: 'mixed-curve-turn',
      label: 'curve bait into late correction',
      difficultyBand: 'mixed pressure',
      pressureTags: ['curve-bait', 'late-correction', 'shape'],
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
            hex: 'standard',
            originLane: RELATIVE_LANES.oppositeInner,
            targetLane: RELATIVE_LANES.oppositeInner,
            placementHeight: 'high',
          },
          designer: {
            label: 'late correction',
            pressureTags: ['opposite-side', 'late-recovery'],
          },
        },
      ],
    },
    {
      key: 'mixed-pivot-shift',
      label: 'pivot from same-side pressure to center reset',
      difficultyBand: 'mixed pressure',
      pressureTags: ['pivot', 'center', 'recovery'],
      intendedFailureMode: 'read-check',
      shots: [
        {
          shot: {
            hex: 'standard',
            originLane: RELATIVE_LANES.sameInner,
            targetLane: RELATIVE_LANES.sameInner,
            placementHeight: 'high',
          },
          designer: {
            label: 'high probe',
            pressureTags: ['high', 'same-side'],
          },
        },
        {
          shot: {
            hex: 'curve',
            originLane: RELATIVE_LANES.center,
            targetLane: RELATIVE_LANES.oppositeOuter,
            placementHeight: 'middle',
            curveDirection: RELATIVE_CURVE_DIRECTIONS.outward,
          },
          designer: {
            label: 'center pivot',
            pressureTags: ['curve', 'switch', 'center'],
          },
        },
      ],
    },
  ],
  chaos: [
    {
      key: 'chaos-pin-lock',
      label: 'same-side pin then hard drag',
      difficultyBand: 'chaos-but-fair',
      pressureTags: ['same-side', 'pin', 'pressure'],
      intendedFailureMode: 'same-side-pinning',
      shots: [
        {
          shot: {
            hex: 'standard',
            originLane: RELATIVE_LANES.sameOuter,
            targetLane: RELATIVE_LANES.sameOuter,
            placementHeight: 'high',
          },
          designer: {
            label: 'pin high',
            pressureTags: ['corner', 'late'],
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
            pressureTags: ['low', 'extreme-side', 'finish'],
          },
        },
      ],
    },
    {
      key: 'chaos-curve-whip',
      label: 'curve whip into opposite squeeze',
      difficultyBand: 'chaos-but-fair',
      pressureTags: ['curve-bait', 'whip', 'switch'],
      intendedFailureMode: 'curve-misread',
      shots: [
        {
          shot: {
            hex: 'curve',
            originLane: RELATIVE_LANES.sameOuter,
            targetLane: RELATIVE_LANES.oppositeInner,
            placementHeight: 'middle',
            curveDirection: RELATIVE_CURVE_DIRECTIONS.outward,
          },
          designer: {
            label: 'whip curve',
            pressureTags: ['curve', 'switch'],
          },
        },
        {
          shot: {
            hex: 'standard',
            originLane: RELATIVE_LANES.oppositeOuter,
            targetLane: RELATIVE_LANES.oppositeOuter,
            placementHeight: 'high',
          },
          designer: {
            label: 'opposite squeeze',
            pressureTags: ['opposite-side', 'corner'],
          },
        },
      ],
    },
    {
      key: 'chaos-turnover',
      label: 'turnover into late recovery',
      difficultyBand: 'chaos-but-fair',
      pressureTags: ['late-recovery', 'pivot', 'pressure'],
      intendedFailureMode: 'late-recovery',
      shots: [
        {
          shot: {
            hex: 'standard',
            originLane: RELATIVE_LANES.sameInner,
            targetLane: RELATIVE_LANES.oppositeOuter,
            placementHeight: 'high',
          },
          designer: {
            label: 'turnover start',
            pressureTags: ['opposite-side', 'high'],
          },
        },
        {
          shot: {
            hex: 'curve',
            originLane: RELATIVE_LANES.oppositeOuter,
            targetLane: RELATIVE_LANES.sameInner,
            placementHeight: 'middle',
            curveDirection: RELATIVE_CURVE_DIRECTIONS.inward,
          },
          designer: {
            label: 'late recovery',
            pressureTags: ['curve', 'late-recovery'],
          },
        },
      ],
    },
  ],
};

export {
  RELATIVE_LANES,
  RELATIVE_CURVE_DIRECTIONS,
  SETPIECE_LIBRARY,
  instantiateSetpiece,
  mirrorSide,
  resolveRelativeCurveDirection,
  resolveRelativeLane,
};
