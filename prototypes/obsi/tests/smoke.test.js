import { describe, it, expect } from "vitest";
import { parseWaveDSL, buildSpawnQueue, WAVE_DEFINITIONS } from "../js/constants.js";

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
