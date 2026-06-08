import { describe, expect, it } from 'vitest';
import {
  computeMatchScore,
  computeOngoingScore,
  createMatchState,
  isMatchComplete,
  recordShotResult,
} from './matchState.js';

describe('MatchState', () => {
  it('starts a 10-shot active match with no saves or concessions', () => {
    const match = createMatchState();

    expect(match.status).toBe('active');
    expect(match.shotsTaken).toBe(0);
    expect(match.totalShots).toBe(10);
    expect(match.maxConcessions).toBe(3);
    expect(match.score).toBe(0);
    expect(match.ongoingScore).toBe(0);
  });

  it('advances shots and counts saves without computing score before match end', () => {
    const match = recordShotResult(createMatchState(), 'save');

    expect(match.status).toBe('active');
    expect(match.shotsTaken).toBe(1);
    expect(match.saves).toBe(1);
    expect(match.conceded).toBe(0);
    expect(match.score).toBe(0);
    expect(match.ongoingScore).toBe(100);
    expect(computeOngoingScore(match)).toBe(100);
  });

  it('loses immediately on the third concession', () => {
    const start = createMatchState();
    const first = recordShotResult(start, 'conceded');
    const second = recordShotResult(first, 'save');
    const third = recordShotResult(second, 'conceded');
    const loss = recordShotResult(third, 'conceded');

    expect(loss.status).toBe('lost');
    expect(loss.shotsTaken).toBe(4);
    expect(loss.conceded).toBe(3);
    expect(isMatchComplete(loss)).toBe(true);
  });

  it('wins by surviving all 10 shots with fewer than 3 concessions', () => {
    const outcomes = ['save', 'save', 'conceded', 'save', 'save', 'save', 'save', 'conceded', 'save', 'save'];
    const match = outcomes.reduce(
      (state, outcome) => recordShotResult(state, outcome),
      createMatchState(),
    );

    expect(match.status).toBe('won');
    expect(match.shotsTaken).toBe(10);
    expect(match.saves).toBe(8);
    expect(match.conceded).toBe(2);
  });

  it('computes final score as save points plus clean-sheet bonus at match end', () => {
    const cleanSheet = Array.from({ length: 10 }, () => 'save').reduce(
      (state, outcome) => recordShotResult(state, outcome),
      createMatchState(),
    );
    const dirtyWin = ['save', 'save', 'conceded', 'save', 'save', 'save', 'save', 'conceded', 'save', 'save'].reduce(
      (state, outcome) => recordShotResult(state, outcome),
      createMatchState(),
    );

    expect(cleanSheet.status).toBe('won');
    expect(cleanSheet.score).toBe(computeMatchScore(cleanSheet));
    expect(cleanSheet.score).toBe(1500);
    expect(dirtyWin.score).toBe(800);
    expect(cleanSheet.score).toBeGreaterThan(dirtyWin.score);
  });

  it('ignores additional shot results after the match ends cleanly', () => {
    const loss = ['conceded', 'conceded', 'conceded'].reduce(
      (state, outcome) => recordShotResult(state, outcome),
      createMatchState(),
    );

    expect(recordShotResult(loss, 'save')).toBe(loss);
  });
});
