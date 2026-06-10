import { describe, expect, it } from 'vitest';
import {
  computeMatchScore,
  computeOngoingScore,
  createMatchState,
  isMatchComplete,
  recordShotResult,
} from './matchState.js';

describe('MatchState', () => {
  it('starts a 30-shot active match with no saves, deflections, or concessions', () => {
    const match = createMatchState();

    expect(match.status).toBe('active');
    expect(match.shotsTaken).toBe(0);
    expect(match.totalShots).toBe(30);
    expect(match.maxConcessions).toBe(5);
    expect(match.score).toBe(0);
    expect(match.ongoingScore).toBe(0);
    expect(match.deflections).toBe(0);
  });

  it('advances shots and counts saves and deflections without computing score before match end', () => {
    const match = recordShotResult(recordShotResult(createMatchState(), 'saved'), 'deflected');

    expect(match.status).toBe('active');
    expect(match.shotsTaken).toBe(2);
    expect(match.saves).toBe(1);
    expect(match.deflections).toBe(1);
    expect(match.conceded).toBe(0);
    expect(match.score).toBe(0);
    expect(match.ongoingScore).toBe(125);
    expect(computeOngoingScore(match)).toBe(125);
  });

  it('loses immediately on the fifth concession', () => {
    const matchBeforeLoss = ['conceded', 'saved', 'conceded', 'saved', 'conceded', 'saved', 'conceded'].reduce(
      (state, outcome) => recordShotResult(state, outcome),
      createMatchState(),
    );
    const loss = recordShotResult(matchBeforeLoss, 'conceded');

    expect(loss.status).toBe('lost');
    expect(loss.shotsTaken).toBe(8);
    expect(loss.conceded).toBe(5);
    expect(isMatchComplete(loss)).toBe(true);
  });

  it('wins by surviving all 30 shots with fewer than 5 concessions', () => {
    const outcomes = [
      'saved', 'saved', 'conceded', 'saved', 'saved',
      'saved', 'saved', 'conceded', 'saved', 'saved',
      'saved', 'saved', 'saved', 'saved', 'saved',
      'saved', 'saved', 'saved', 'saved', 'saved',
      'saved', 'saved', 'saved', 'saved', 'saved',
      'saved', 'saved', 'saved', 'saved', 'saved',
    ];
    const match = outcomes.reduce(
      (state, outcome) => recordShotResult(state, outcome),
      createMatchState(),
    );

    expect(match.status).toBe('won');
    expect(match.shotsTaken).toBe(30);
    expect(match.saves).toBe(28);
    expect(match.conceded).toBe(2);
  });

  it('computes final score as save and deflection points plus clean-sheet bonus at match end', () => {
    const cleanSheet = Array.from({ length: 30 }, () => 'saved').reduce(
      (state, outcome) => recordShotResult(state, outcome),
      createMatchState(),
    );
    const dirtyWin = [
      'saved', 'saved', 'conceded', 'saved', 'saved',
      'saved', 'saved', 'conceded', 'saved', 'saved',
      'saved', 'saved', 'saved', 'saved', 'saved',
      'saved', 'saved', 'saved', 'saved', 'saved',
      'saved', 'saved', 'saved', 'saved', 'saved',
      'saved', 'saved', 'saved', 'saved', 'saved',
    ].reduce(
      (state, outcome) => recordShotResult(state, outcome),
      createMatchState(),
    );

    expect(cleanSheet.status).toBe('won');
    expect(cleanSheet.score).toBe(computeMatchScore(cleanSheet));
    expect(cleanSheet.score).toBe(3500);
    expect(dirtyWin.score).toBe(2800);
    expect(cleanSheet.score).toBeGreaterThan(dirtyWin.score);
  });

  it('scores deflections below saves while preserving the clean-sheet bonus', () => {
    const outcomeChain = [
      'saved', 'saved', 'deflected', 'saved', 'saved',
      'saved', 'saved', 'saved', 'saved', 'saved',
      'saved', 'saved', 'saved', 'saved', 'saved',
      'saved', 'saved', 'saved', 'saved', 'saved',
      'saved', 'saved', 'saved', 'saved', 'saved',
      'saved', 'saved', 'saved', 'saved', 'saved',
    ];

    const match = outcomeChain.reduce(
      (state, outcome) => recordShotResult(state, outcome),
      createMatchState(),
    );

    expect(match.status).toBe('won');
    expect(match.saves).toBe(29);
    expect(match.deflections).toBe(1);
    expect(match.conceded).toBe(0);
    expect(match.ongoingScore).toBe(2925);
    expect(match.score).toBe(3425);
    expect(match.score).toBe(computeMatchScore(match));
  });

  it('counts a concession as zero points while still advancing the loss counter', () => {
    const match = recordShotResult(createMatchState(), 'conceded');

    expect(match.status).toBe('active');
    expect(match.shotsTaken).toBe(1);
    expect(match.saves).toBe(0);
    expect(match.deflections).toBe(0);
    expect(match.conceded).toBe(1);
    expect(match.ongoingScore).toBe(0);
    expect(match.score).toBe(0);
    expect(computeOngoingScore(match)).toBe(0);
  });

  it('ignores additional shot results after the match ends cleanly', () => {
    const loss = ['conceded', 'conceded', 'conceded', 'conceded', 'conceded'].reduce(
      (state, outcome) => recordShotResult(state, outcome),
      createMatchState(),
    );

    expect(recordShotResult(loss, 'saved')).toBe(loss);
  });
});
