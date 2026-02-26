import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getWarmthRing } from "@/lib/nudges";

describe("getWarmthRing", () => {
  const fakeNow = new Date("2026-02-26");

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(fakeNow);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 4 when no last_interaction_date", () => {
    expect(getWarmthRing({ id: "1", name: "A", last_interaction_date: null })).toBe(4);
  });

  it("returns 1 for contact seen today", () => {
    expect(getWarmthRing({ id: "1", name: "A", last_interaction_date: "2026-02-26" })).toBe(1);
  });

  it("returns 1 for contact seen 7 days ago", () => {
    expect(getWarmthRing({ id: "1", name: "A", last_interaction_date: "2026-02-19" })).toBe(1);
  });

  it("returns 2 for contact seen 8 days ago", () => {
    expect(getWarmthRing({ id: "1", name: "A", last_interaction_date: "2026-02-18" })).toBe(2);
  });

  it("returns 2 for contact seen 30 days ago", () => {
    expect(getWarmthRing({ id: "1", name: "A", last_interaction_date: "2026-01-27" })).toBe(2);
  });

  it("returns 3 for contact seen 31 days ago", () => {
    expect(getWarmthRing({ id: "1", name: "A", last_interaction_date: "2026-01-26" })).toBe(3);
  });

  it("returns 3 for contact seen 90 days ago", () => {
    expect(getWarmthRing({ id: "1", name: "A", last_interaction_date: "2025-11-28" })).toBe(3);
  });

  it("returns 4 for contact seen 91 days ago", () => {
    expect(getWarmthRing({ id: "1", name: "A", last_interaction_date: "2025-11-27" })).toBe(4);
  });
});
