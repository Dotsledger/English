import { describe, it, expect } from "vitest";
import {
  applyCheckResult,
  bumpCardsSeen,
  dismissCheck,
  formatLevel,
  gainForScore,
  initialLevel,
  isCheckAvailable,
  markTooltipSeen,
  nextBand,
  shouldOfferCheck,
  stretchBonus,
} from "@/lib/level";
import { parseLevel } from "@/lib/storage/docs";
import type { LevelState } from "@/lib/types";

const NOW = 1_750_000_000_000;
const base = (overrides: Partial<LevelState> = {}): LevelState => ({
  ...initialLevel(() => 0),
  ...overrides,
});

describe("initial level", () => {
  it("starts at B2.0 with a 50–60 threshold", () => {
    const lvl = initialLevel(() => 0);
    expect(formatLevel(lvl)).toBe("B2.0");
    expect(lvl.checkThreshold).toBe(50);
    expect(initialLevel(() => 0.999).checkThreshold).toBe(60);
    expect(lvl.cardsSinceCheck).toBe(0);
    expect(lvl.tooltipSeen).toBe(false);
  });
});

describe("nextBand", () => {
  it("advances B2→C1→C2 then stops", () => {
    expect(nextBand("B2")).toBe("C1");
    expect(nextBand("C1")).toBe("C2");
    expect(nextBand("C2")).toBeNull();
  });
});

describe("milestone counter", () => {
  it("bumps and becomes available at the threshold", () => {
    let lvl = base({ checkThreshold: 3 });
    expect(isCheckAvailable(lvl)).toBe(false);
    lvl = bumpCardsSeen(bumpCardsSeen(bumpCardsSeen(lvl)));
    expect(lvl.cardsSinceCheck).toBe(3);
    expect(isCheckAvailable(lvl)).toBe(true);
  });
});

describe("gainForScore", () => {
  it("maps score bands to sublevel gains", () => {
    expect(gainForScore(90)).toBe(4);
    expect(gainForScore(85)).toBe(4);
    expect(gainForScore(70)).toBe(1);
    expect(gainForScore(60)).toBe(1);
    expect(gainForScore(59)).toBe(0);
    expect(gainForScore(0)).toBe(0);
  });
});

describe("applyCheckResult", () => {
  it("advances +4 on a strong check and records history", () => {
    const lvl = applyCheckResult(base({ sub: 0 }), 90, NOW, () => 0);
    expect(formatLevel(lvl)).toBe("B2.4");
    expect(lvl.cardsSinceCheck).toBe(0);
    expect(lvl.history).toHaveLength(1);
    expect(lvl.history[0]).toMatchObject({ band: "B2", sub: 4, score: 90 });
  });

  it("advances +1 on a middling check", () => {
    expect(formatLevel(applyCheckResult(base({ sub: 3 }), 70, NOW))).toBe("B2.4");
  });

  it("holds flat on a weak check — never decreases", () => {
    const lvl = applyCheckResult(base({ band: "B2", sub: 6 }), 40, NOW);
    expect(formatLevel(lvl)).toBe("B2.6");
  });

  it("caps within a band at .10 (does not overshoot into the next band)", () => {
    expect(formatLevel(applyCheckResult(base({ sub: 8 }), 90, NOW))).toBe("B2.10");
  });

  it("crosses to the next band's .0 only from .10", () => {
    expect(formatLevel(applyCheckResult(base({ band: "B2", sub: 10 }), 70, NOW))).toBe("C1.0");
    expect(formatLevel(applyCheckResult(base({ band: "C1", sub: 10 }), 90, NOW))).toBe("C2.0");
  });

  it("caps at the C2.10 ceiling", () => {
    expect(formatLevel(applyCheckResult(base({ band: "C2", sub: 10 }), 90, NOW))).toBe("C2.10");
  });

  it("re-rolls the threshold into 50–60", () => {
    const lvl = applyCheckResult(base({ sub: 0 }), 90, NOW, () => 0.5);
    expect(lvl.checkThreshold).toBeGreaterThanOrEqual(50);
    expect(lvl.checkThreshold).toBeLessThanOrEqual(60);
  });
});

describe("check offer gating (Fix 1)", () => {
  const day = 24 * 60 * 60 * 1000;
  const avail = base({ cardsSinceCheck: 60, checkThreshold: 55 });

  it("offers when available and never dismissed", () => {
    expect(shouldOfferCheck(avail, NOW)).toBe(true);
  });

  it("does not offer when the check isn't available yet", () => {
    expect(shouldOfferCheck(base({ cardsSinceCheck: 3, checkThreshold: 55 }), NOW)).toBe(false);
  });

  it("suppresses the offer for the rest of the same calendar day after 'Ahora no'", () => {
    const dismissed = dismissCheck(avail, NOW);
    expect(dismissed.lastDismissedAt).toBe(NOW);
    expect(shouldOfferCheck(dismissed, NOW + 6 * 60 * 60 * 1000)).toBe(false); // same day
  });

  it("re-offers on a later calendar day", () => {
    const dismissed = dismissCheck(avail, NOW);
    expect(shouldOfferCheck(dismissed, NOW + day)).toBe(true);
  });

  it("completing a check clears the dismissal", () => {
    const dismissed = dismissCheck(avail, NOW);
    const after = applyCheckResult(dismissed, 90, NOW);
    expect(after.lastDismissedAt).toBeNull();
  });
});

describe("stretch bonus (Fix 2)", () => {
  it("adds +1 per correct stretch item, capped at +2", () => {
    expect(stretchBonus(0)).toBe(0);
    expect(stretchBonus(1)).toBe(1);
    expect(stretchBonus(2)).toBe(2);
    expect(stretchBonus(5)).toBe(2);
  });

  it("a correct stretch item accelerates gain beyond the core tier", () => {
    // core 70 → +1; +1 stretch → +2 total: B2.0 → B2.2
    expect(formatLevel(applyCheckResult(base({ sub: 0 }), 70, NOW, () => 0, 1))).toBe("B2.2");
    // core 90 → +4; +2 stretch → +6, capped at .10: B2.0 → B2.6
    expect(formatLevel(applyCheckResult(base({ sub: 0 }), 90, NOW, () => 0, 2))).toBe("B2.6");
  });

  it("stretch bonus alone (weak core) never crosses a band", () => {
    // core 40 → base 0; +2 stretch bonus at B2.10 must NOT jump to C1
    expect(formatLevel(applyCheckResult(base({ band: "B2", sub: 10 }), 40, NOW, () => 0, 2))).toBe(
      "B2.10"
    );
  });

  it("stretch bonus with a weak core still can't decrease the level", () => {
    const lvl = applyCheckResult(base({ band: "B2", sub: 6 }), 40, NOW, () => 0, 2);
    expect(formatLevel(lvl)).toBe("B2.8"); // +0 core, +2 bonus, capped within band
  });
});

describe("markTooltipSeen", () => {
  it("sets the flag once", () => {
    const lvl = markTooltipSeen(base());
    expect(lvl.tooltipSeen).toBe(true);
    expect(markTooltipSeen(lvl)).toBe(lvl);
  });
});

describe("parseLevel (corruption safety)", () => {
  it("falls back to B2.0 for null or garbage", () => {
    expect(formatLevel(parseLevel(null))).toBe("B2.0");
    expect(formatLevel(parseLevel("{{{"))).toBe("B2.0");
    expect(formatLevel(parseLevel(JSON.stringify({ band: "Z9", sub: 99 })))).toBe("B2.0");
  });

  it("round-trips a valid state and drops malformed history", () => {
    const raw = JSON.stringify({
      band: "C1",
      sub: 3,
      cardsSinceCheck: 12,
      checkThreshold: 55,
      tooltipSeen: true,
      history: [
        { at: NOW, band: "B2", sub: 10, score: 88 },
        { nonsense: true },
      ],
    });
    const lvl = parseLevel(raw);
    expect(formatLevel(lvl)).toBe("C1.3");
    expect(lvl.cardsSinceCheck).toBe(12);
    expect(lvl.tooltipSeen).toBe(true);
    expect(lvl.history).toHaveLength(1);
  });
});
