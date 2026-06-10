export const DEFAULT_MATCH_RULES = {
  totalShots: 30,
  maxConcessions: 5,
  savePoints: 100,
  deflectionPoints: 25,
  cleanSheetBonus: 500,
};

function normalizeRules(rules = {}) {
  return {
    ...DEFAULT_MATCH_RULES,
    ...rules,
  };
}

export function computeOngoingScore(state, rules = DEFAULT_MATCH_RULES) {
  const activeRules = normalizeRules(rules);
  return ((state.saves ?? 0) * activeRules.savePoints) + ((state.deflections ?? 0) * activeRules.deflectionPoints);
}

export function computeMatchScore(state, rules = DEFAULT_MATCH_RULES) {
  const activeRules = normalizeRules(rules);
  const cleanSheetBonus = state.status === 'won' && state.conceded === 0
    ? activeRules.cleanSheetBonus
    : 0;

  return computeOngoingScore(state, activeRules) + cleanSheetBonus;
}

export function createMatchState(rules = DEFAULT_MATCH_RULES) {
  const activeRules = normalizeRules(rules);
  return {
    status: 'active',
    shotsTaken: 0,
    totalShots: activeRules.totalShots,
    saves: 0,
    deflections: 0,
    conceded: 0,
    maxConcessions: activeRules.maxConcessions,
    score: 0,
    ongoingScore: 0,
  };
}

export function recordShotResult(state, outcome, rules = DEFAULT_MATCH_RULES) {
  const activeRules = normalizeRules(rules);
  if (state.status !== 'active') return state;

  const canonicalOutcome = outcome === 'save' ? 'saved' : outcome;
  if (canonicalOutcome !== 'saved' && canonicalOutcome !== 'deflected' && canonicalOutcome !== 'conceded') {
    throw new Error(`Unknown match shot outcome: ${outcome}`);
  }

  const next = {
    ...state,
    shotsTaken: state.shotsTaken + 1,
    saves: (state.saves ?? 0) + (canonicalOutcome === 'saved' ? 1 : 0),
    deflections: (state.deflections ?? 0) + (canonicalOutcome === 'deflected' ? 1 : 0),
    conceded: (state.conceded ?? 0) + (canonicalOutcome === 'conceded' ? 1 : 0),
  };

  if (next.conceded >= activeRules.maxConcessions) {
    next.status = 'lost';
  } else if (next.shotsTaken >= activeRules.totalShots) {
    next.status = 'won';
  }

  next.ongoingScore = computeOngoingScore(next, activeRules);
  next.score = isMatchComplete(next) ? computeMatchScore(next, activeRules) : 0;
  return next;
}

export function isMatchComplete(state) {
  return state.status === 'won' || state.status === 'lost';
}
