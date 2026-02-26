import { describe, it, expect } from "vitest";
import { getRingNodes, RING_RADII, SVG_CENTER } from "@/lib/circleLayout";
import type { Contact } from "@/lib/nudges";

const makeContact = (id: string): Contact => ({ id, name: id });

describe("getRingNodes", () => {
  it("returns empty array for no contacts", () => {
    expect(getRingNodes([])).toEqual([]);
  });

  it("places a single contact at top of its ring (angle = -π/2)", () => {
    const contact = makeContact("a");
    // ring 4 (no interaction date)
    const nodes = getRingNodes([contact]);
    expect(nodes).toHaveLength(1);
    const { x, y, ring } = nodes[0];
    const r = RING_RADII[4];
    expect(ring).toBe(4);
    expect(x).toBeCloseTo(SVG_CENTER + r * Math.cos(-Math.PI / 2), 1);
    expect(y).toBeCloseTo(SVG_CENTER + r * Math.sin(-Math.PI / 2), 1);
  });

  it("distributes two contacts in the same ring 180° apart", () => {
    const contacts: Contact[] = [
      { id: "a", name: "A", last_interaction_date: "2026-02-26" },
      { id: "b", name: "B", last_interaction_date: "2026-02-26" },
    ];
    const nodes = getRingNodes(contacts);
    // Both in ring 1 (same day = 0 days, ≤7)
    const ring1 = nodes.filter((n) => n.ring === 1);
    expect(ring1).toHaveLength(2);
    const dx = ring1[1].x - ring1[0].x;
    const dy = ring1[1].y - ring1[0].y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    // 180° apart on ring 1 → distance = 2 * r
    expect(dist).toBeCloseTo(2 * RING_RADII[1], 0);
  });
});
