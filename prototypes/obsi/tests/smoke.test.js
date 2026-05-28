import { describe, it, expect } from "vitest";
import { parseWaveDSL, WAVE_DEFINITIONS } from "../js/constants.js";

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
