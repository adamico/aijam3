import { describe, it, expect } from "vitest";
import { parseWaveDSL, buildSpawnQueue, calcDifficulty, WAVE_DEFINITIONS } from "../js/constants.js";

describe("parseWaveDSL", () => {
  it("parses valid DSL string from WAVE_DEFINITIONS", () => {
    const validDSL = WAVE_DEFINITIONS[0];
    const result = parseWaveDSL(validDSL);

    expect(result).toHaveProperty("entities");
    expect(result).toHaveProperty("pattern");
    expect(result).toHaveProperty("cleared");
    expect(result).toHaveProperty("prepare");

    expect(result.entities).toHaveLength(5);
    expect(result.entities[0]).toHaveLength(11);
    expect(result.pattern).toHaveProperty("order");
    expect(result.pattern).toHaveProperty("entry");
    expect(result.cleared).toBe("Wave 1 cleared!");
    expect(result.prepare).toBe("Prepare for wave 2");
  });

  it("returns without throwing for empty or blank input", () => {
    expect(() => parseWaveDSL("")).not.toThrow();
    expect(() => parseWaveDSL("   ")).not.toThrow();

    const emptyResult = parseWaveDSL("");
    expect(emptyResult).toHaveProperty("entities");
    expect(emptyResult).toHaveProperty("pattern");
    expect(emptyResult.entities).toEqual([]);
    expect(emptyResult.pattern).toBeNull();
  });
});

describe("buildSpawnQueue", () => {
  it("returns non-empty queue for valid wave definition", () => {
    const waveDef = parseWaveDSL(WAVE_DEFINITIONS[0]);
    const queue = buildSpawnQueue(waveDef);

    expect(queue).toBeInstanceOf(Array);
    expect(queue.length).toBeGreaterThan(0);
  });

  it("each queue entry has col, row, and eType fields", () => {
    const waveDef = parseWaveDSL(WAVE_DEFINITIONS[0]);
    const queue = buildSpawnQueue(waveDef);

    for (const entry of queue) {
      expect(entry).toHaveProperty("col");
      expect(entry).toHaveProperty("row");
      expect(entry).toHaveProperty("eType");
      expect(typeof entry.col).toBe("number");
      expect(typeof entry.row).toBe("number");
      expect(typeof entry.eType).toBe("string");
    }
  });

  it("respects row_major ordering for pattern c", () => {
    const waveDef = parseWaveDSL(WAVE_DEFINITIONS[0]);
    const queue = buildSpawnQueue(waveDef);

    expect(queue.length).toBeGreaterThan(0);
    const firstEntry = queue[0];
    // First row with enemies is row 0, first col is col 1 (pattern: .p...p...p)
    expect(firstEntry.row).toBe(0);
    expect(firstEntry.col).toBe(1);
  });
});

describe("calcDifficulty", () => {
  it("returns baseline multiplier for wave 1", () => {
    const difficulty = calcDifficulty(1);

    expect(difficulty).toHaveProperty("shootRate");
    expect(difficulty).toHaveProperty("formationSpeed");
    expect(difficulty).toHaveProperty("diveChance");

    // Wave 1: baseFactor = 0.8, formationSpeedMult = 0.8 * 0.2 = 0.16
    // formationSpeed = 0.08 * 0.16 = 0.0128
    expect(difficulty.formationSpeed).toBeCloseTo(0.0128, 3);
  });

  it("returns larger multipliers for higher waves", () => {
    const diff1 = calcDifficulty(1);
    const diff10 = calcDifficulty(10);
    const diff20 = calcDifficulty(20);

    expect(diff10.formationSpeed).toBeGreaterThan(diff1.formationSpeed);
    expect(diff20.formationSpeed).toBeGreaterThan(diff10.formationSpeed);
    expect(diff10.diveChance).toBeGreaterThan(diff1.diveChance);
  });

  it("returns no NaN or Infinity for waves 1-20", () => {
    for (let wave = 1; wave <= 20; wave++) {
      const difficulty = calcDifficulty(wave);

      expect(Number.isNaN(difficulty.shootRate)).toBe(false);
      expect(Number.isNaN(difficulty.formationSpeed)).toBe(false);
      expect(Number.isNaN(difficulty.diveChance)).toBe(false);

      expect(Number.isFinite(difficulty.shootRate)).toBe(true);
      expect(Number.isFinite(difficulty.formationSpeed)).toBe(true);
      expect(Number.isFinite(difficulty.diveChance)).toBe(true);
    }
  });
});
