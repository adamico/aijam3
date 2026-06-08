export const DEFAULT_MATCH_RULES = {
  totalShots: 10,
  maxConcessions: 3,
  savePoints: 100,
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
  return state.saves * activeRules.savePoints;
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
    conceded: 0,
    maxConcessions: activeRules.maxConcessions,
    score: 0,
    ongoingScore: 0,
  };
}

export function recordShotResult(state, outcome, rules = DEFAULT_MATCH_RULES) {
  const activeRules = normalizeRules(rules);
  if (state.status !== 'active') return state;
  if (outcome !== 'save' && outcome !== 'conceded') {
    throw new Error(`Unknown match shot outcome: ${outcome}`);
  }

  const next = {
    ...state,
    shotsTaken: state.shotsTaken + 1,
    saves: state.saves + (outcome === 'save' ? 1 : 0),
    conceded: state.conceded + (outcome === 'conceded' ? 1 : 0),
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
