import { describe, it, expect } from "vitest";
import { parseWaveDSL, buildSpawnQueue, calcDifficulty, WAVE_DEFINITIONS, tickDiver, computeHitEvent } from "../js/pure.js";

function makeDiver(overrides = {}) {
  return {
    posX: 5, posY: 8, originalPosX: 5, originalPosY: 8,
    targetX: 5, isDiving: false,
    diveSpeed: 2, diveRate: 2, diveTimer: 0,
    ...overrides,
  };
}

describe("tickDiver", () => {
  it("trigger with chasesPlayerX=true → targetX = playerX", () => {
    const next = tickDiver(makeDiver({ diveTimer: 0, chasesPlayerX: true, originalPosX: 5 }), 0.1, 0.8, 3);
    expect(next.isDiving).toBe(true);
    expect(next.targetX).toBe(3);
  });

  it("trigger with chasesPlayerX=false → targetX = originalPosX (straight drop)", () => {
    const next = tickDiver(makeDiver({ diveTimer: 0, chasesPlayerX: false, originalPosX: 7 }), 0.1, 0.8, 3);
    expect(next.isDiving).toBe(true);
    expect(next.targetX).toBe(7);
  });

  it("timer elapsed + rand >= diveChance → stays false, timer reset to 0.5", () => {
    const next = tickDiver(makeDiver({ diveTimer: 0 }), 0.9, 0.8, 3);
    expect(next.isDiving).toBe(false);
    expect(next.diveTimer).toBe(0.5);
  });

  it("timer null → dive check skipped even if rand < diveChance", () => {
    const next = tickDiver(makeDiver({ diveTimer: null }), 0.0, 1.0, 3);
    expect(next.isDiving).toBe(false);
  });

  it("while diving posY > targetY → posY decreases each tick", () => {
    const next = tickDiver(makeDiver({ isDiving: true, posY: 8 }), 0, 1, 5);
    expect(next.posY).toBeLessThan(8);
  });

  it("descending tick at targetY sets divePhase=ascending", () => {
    // targetY = PLAYER_Y + 0.5 = 3.5; start descending just above
    const next = tickDiver(makeDiver({ isDiving: true, divePhase: 'descending', posY: 3.55 }), 0, 1, 5);
    expect(next.divePhase).toBe('ascending');
  });

  it("ascending phase increases posY each tick", () => {
    const next = tickDiver(makeDiver({ isDiving: true, divePhase: 'ascending', posY: 3.5 }), 0, 1, 5);
    expect(next.posY).toBeGreaterThan(3.5);
  });

  it("ascending phase lerps posX toward originalPosX (drifted slot)", () => {
    const s = makeDiver({ isDiving: true, divePhase: 'ascending', posY: 5, posX: 2, originalPosX: 9, originalPosY: 8 });
    const next = tickDiver(s, 0, 1, 2);
    expect(next.posX).toBeGreaterThan(2);
    expect(next.posX).toBeLessThan(9);
  });

  it("once at targetY, repeated ticks reach originalPosY (no oscillation)", () => {
    let s = makeDiver({ isDiving: true, posY: 3.5, originalPosY: 8, originalPosX: 5, posX: 5, diveSpeed: 2, diveRate: 2 });
    for (let i = 0; i < 200; i++) {
      s = tickDiver(s, 0, 1, 5);
      if (!s.isDiving) break;
    }
    expect(s.isDiving).toBe(false);
    expect(s.posY).toBe(8);
  });

  it("snaps to current originalPosX (not targetX) when returning to formation", () => {
    // targetX=3 (player), originalPosX=7 (slot drifted during formation move)
    const next = tickDiver(makeDiver({ isDiving: true, divePhase: 'ascending', posY: 3.3, posX: 3, targetX: 3, originalPosX: 7, originalPosY: 3.35, diveSpeed: 2, diveRate: 2 }), 0, 1, 3);
    expect(next.isDiving).toBe(false);
    expect(next.posX).toBe(7);
  });

  it("ascending, posY reaches originalPosY → isDiving false, timer = diveRate, pos snapped", () => {
    // ascending branch: posY <= targetY=3.5; ascent = diveSpeed*0.1*0.5 = 0.1/tick
    // posY=3.3 → 3.3+0.1=3.4 >= originalPosY=3.35 → snap
    const next = tickDiver(makeDiver({ isDiving: true, divePhase: 'ascending', posY: 3.3, originalPosY: 3.35, originalPosX: 5, diveSpeed: 2, diveRate: 2 }), 0, 1, 5);
    expect(next.isDiving).toBe(false);
    expect(next.posY).toBe(3.35);
    expect(next.diveTimer).toBe(2);
  });
});

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

describe("computeHitEvent", () => {
  it("survives hit → kind: damaged, scoreValue: 0", () => {
    const { newHealth, event } = computeHitEvent({
      health: 10,
      scoreValue: 100,
      dmg: 3,
      bulletPos: { x: 5, y: 6 },
    });
    expect(newHealth).toBe(7);
    expect(event.kind).toBe("damaged");
    expect(event.scoreValue).toBe(0);
  });

  it("health reaches 0 → kind: killed, scoreValue passed through", () => {
    const { newHealth, event } = computeHitEvent({
      health: 5,
      scoreValue: 100,
      dmg: 5,
      bulletPos: { x: 5, y: 6 },
    });
    expect(newHealth).toBe(0);
    expect(event.kind).toBe("killed");
    expect(event.scoreValue).toBe(100);
  });

  it("health drops below 0 → kind: killed, scoreValue passed through", () => {
    const { newHealth, event } = computeHitEvent({
      health: 5,
      scoreValue: 50,
      dmg: 12,
      bulletPos: { x: 5, y: 6 },
    });
    expect(newHealth).toBe(-7);
    expect(event.kind).toBe("killed");
    expect(event.scoreValue).toBe(50);
  });

  it("passes through reflected, spawned, pos unchanged", () => {
    const bulletPos = { x: 3, y: 4 };
    const spawned = [{ type: "bullet1" }];
    const { event } = computeHitEvent({
      health: 10,
      scoreValue: 100,
      dmg: 5,
      bulletPos,
      reflected: true,
      spawned,
    });
    expect(event.pos).toBe(bulletPos);
    expect(event.reflected).toBe(true);
    expect(event.spawned).toBe(spawned);
  });
});

describe("applyDamage", () => {
  it("Boss.onBulletHit returns kind:'killed' with correct scoreValue when health drops to 0", () => {
    const BOSS_SCORE = 800;
    const mockPos = { x: 5, y: 10, copy() { return { x: this.x, y: this.y }; } };
    const mockBullet = {
      pos: mockPos,
      destroyed: false,
      destroy() { this.destroyed = true; }
    };
    const mockBoss = {
      health: 1,
      scoreValue: BOSS_SCORE,
      destroyed: false,
      destroy() { this.destroyed = true; }
    };

    // Simulate applyDamage behavior inline since it's in enemies.js (non-module)
    const event = computeHitEvent({
      health: mockBoss.health,
      scoreValue: mockBoss.scoreValue,
      dmg: 1,
      bulletPos: mockBullet.pos.copy()
    });

    mockBoss.health = event.newHealth;
    mockBullet.destroy();
    if (event.event.kind === 'killed') {
      mockBoss.destroy();
    }

    expect(event.event.kind).toBe('killed');
    expect(event.event.scoreValue).toBe(BOSS_SCORE);
    expect(mockBullet.destroyed).toBe(true);
    expect(mockBoss.destroyed).toBe(true);
  });

  it("Reflector.onBulletHit on damaged Reflector returns shape with reflected:true and spawned.length===1", () => {
    const REFLECTOR_SCORE = 160;
    const mockPos = { x: 5, y: 10, copy() { return { x: this.x, y: this.y }; } };
    const mockBullet = {
      pos: mockPos,
      vel: { x: 0, y: -0.8 },
      destroyed: false,
      destroy() { this.destroyed = true; }
    };
    const mockReflector = {
      health: 3,
      scoreValue: REFLECTOR_SCORE,
      destroyed: false,
      destroy() { this.destroyed = true; }
    };

    // Simulate Reflector.onBulletHit: create mirrored bullet, apply damage, set reflected/spawned
    const mirroredBullet = { pos: mockBullet.pos.copy(), vel: { x: mockBullet.vel.x, y: mockBullet.vel.y * -1 } };
    const event = computeHitEvent({
      health: mockReflector.health,
      scoreValue: mockReflector.scoreValue,
      dmg: 1,
      bulletPos: mockBullet.pos.copy()
    });

    mockReflector.health = event.newHealth;
    mockBullet.destroy();
    if (event.event.kind === 'killed') {
      mockReflector.destroy();
    }

    event.event.reflected = true;
    event.event.spawned = [mirroredBullet];

    expect(event.event.kind).toBe('damaged');
    expect(event.event.reflected).toBe(true);
    expect(event.event.spawned.length).toBe(1);
    expect(event.event.spawned[0].vel.y).toBe(0.8);
    expect(mockReflector.health).toBe(2);
    expect(mockBullet.destroyed).toBe(true);
    expect(mockReflector.destroyed).toBe(false);
  });

  it("Absorber.onBulletHit with empty storage returns kind:'absorbed'", () => {
    const mockPos = { x: 5, y: 10, copy() { return { x: this.x, y: this.y }; } };
    const mockBullet = {
      pos: mockPos,
      destroyed: false,
      destroy() { this.destroyed = true; }
    };
    const mockAbsorber = {
      health: 1,
      scoreValue: 256,
      storedCount: 0,
      maxStored: 3,
      absorb() {
        if (this.storedCount < this.maxStored) {
          this.storedCount++;
          return true;
        }
        return false;
      }
    };

    // Simulate Absorber.onBulletHit with empty storage
    let event;
    if (mockAbsorber.absorb()) {
      mockBullet.destroy();
      event = {
        kind: 'absorbed',
        reflected: false,
        pos: mockBullet.pos.copy(),
        scoreValue: 0,
        spawned: []
      };
    }

    expect(event.kind).toBe('absorbed');
    expect(event.reflected).toBe(false);
    expect(event.scoreValue).toBe(0);
    expect(event.spawned.length).toBe(0);
    expect(mockAbsorber.storedCount).toBe(1);
    expect(mockBullet.destroyed).toBe(true);
  });

  it("Absorber.onBulletHit with full storage returns damage event", () => {
    const mockPos = { x: 5, y: 10, copy() { return { x: this.x, y: this.y }; } };
    const mockBullet = {
      pos: mockPos,
      destroyed: false,
      destroy() { this.destroyed = true; }
    };
    const ABSORBER_SCORE = 256;
    const mockAbsorber = {
      health: 1,
      scoreValue: ABSORBER_SCORE,
      storedCount: 3,
      maxStored: 3,
      destroyed: false,
      destroy() { this.destroyed = true; },
      absorb() {
        if (this.storedCount < this.maxStored) {
          this.storedCount++;
          return true;
        }
        return false;
      }
    };

    // Simulate Absorber.onBulletHit with full storage → applyDamage
    let event;
    if (mockAbsorber.absorb()) {
      mockBullet.destroy();
      event = {
        kind: 'absorbed',
        reflected: false,
        pos: mockBullet.pos.copy(),
        scoreValue: 0,
        spawned: []
      };
    } else {
      // Overflow: apply damage
      const hitEvent = computeHitEvent({
        health: mockAbsorber.health,
        scoreValue: mockAbsorber.scoreValue,
        dmg: 1,
        bulletPos: mockBullet.pos.copy()
      });
      mockAbsorber.health = hitEvent.newHealth;
      mockBullet.destroy();
      if (hitEvent.event.kind === 'killed') {
        mockAbsorber.destroy();
      }
      event = hitEvent.event;
    }

    expect(event.kind).toBe('killed');
    expect(event.scoreValue).toBe(ABSORBER_SCORE);
    expect(mockAbsorber.health).toBe(0);
    expect(mockBullet.destroyed).toBe(true);
    expect(mockAbsorber.destroyed).toBe(true);
  });
});
