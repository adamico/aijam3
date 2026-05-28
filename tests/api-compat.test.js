import { readFileSync } from "fs";
import { describe, it, expect } from "vitest";
import { resolve } from "path";

const src = readFileSync(resolve(import.meta.dirname, "../obsi.html"), "utf8");

// LittleJS Timer API: valid methods are isSet(), elapsed(), set(), unset(), get()
// isActive() does not exist on Timer — it belongs to ParticleEmitter.
describe("LittleJS Timer API compatibility", () => {
  it("does not call isActive() on any Timer", () => {
    const matches = [...src.matchAll(/\w+Timer\.isActive\(\)/g)].map(m => m[0]);
    expect(matches).toEqual([]);
  });
});
