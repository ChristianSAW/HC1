import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getRingNodes, RING_RADII, SVG_CENTER } from "@/lib/circleLayout";
import type { Contact } from "@/lib/nudges";

const makeContact = (id: string): Contact => ({ id, name: id });

describe("getRingNodes", () => {
  const fakeNow = new Date("2026-02-26");

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(fakeNow);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns empty array for no contacts", () => {
    expect(getRingNodes([])).toEqual([]);
  });

  it("places a single contact at top of ring 4 (no interaction date)", () => {
    const contact = makeContact("a");
    const nodes = getRingNodes([contact]);
    expect(nodes).toHaveLength(1);
    const { x, y, ring } = nodes[0];
    const r = RING_RADII[4];
    expect(ring).toBe(4);
    expect(x).toBeCloseTo(SVG_CENTER + r * Math.cos(-Math.PI / 2), 1);
    expect(y).toBeCloseTo(SVG_CENTER + r * Math.sin(-Math.PI / 2), 1);
  });

  it("places a single contact at top of ring 1 (contacted today)", () => {
    const contact: Contact = { id: "a", name: "A", last_interaction_date: "2026-02-26" };
    const nodes = getRingNodes([contact]);
    expect(nodes).toHaveLength(1);
    const { x, y, ring } = nodes[0];
    const r = RING_RADII[1];
    expect(ring).toBe(1);
    expect(x).toBeCloseTo(SVG_CENTER + r * Math.cos(-Math.PI / 2), 1);
    expect(y).toBeCloseTo(SVG_CENTER + r * Math.sin(-Math.PI / 2), 1);
  });

  it("places a single contact at top of ring 3 (60 days ago)", () => {
    const contact: Contact = { id: "a", name: "A", last_interaction_date: "2025-12-28" };
    const nodes = getRingNodes([contact]);
    expect(nodes).toHaveLength(1);
    const { x, y, ring } = nodes[0];
    const r = RING_RADII[3];
    expect(ring).toBe(3);
    expect(x).toBeCloseTo(SVG_CENTER + r * Math.cos(-Math.PI / 2), 1);
    expect(y).toBeCloseTo(SVG_CENTER + r * Math.sin(-Math.PI / 2), 1);
  });

  it("distributes two contacts in the same ring 180° apart", () => {
    const contacts: Contact[] = [
      { id: "a", name: "A", last_interaction_date: "2026-02-26" },
      { id: "b", name: "B", last_interaction_date: "2026-02-26" },
    ];
    const nodes = getRingNodes(contacts);
    const ring1 = nodes.filter((n) => n.ring === 1);
    expect(ring1).toHaveLength(2);
    const dx = ring1[1].x - ring1[0].x;
    const dy = ring1[1].y - ring1[0].y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    expect(dist).toBeCloseTo(2 * RING_RADII[1], 0);
  });

  it("partitions contacts into separate rings and places each at correct radius", () => {
    const contacts: Contact[] = [
      { id: "a", name: "A", last_interaction_date: "2026-02-26" }, // 0 days → ring 1
      { id: "b", name: "B", last_interaction_date: "2025-11-28" }, // 90 days → ring 3
    ];
    const nodes = getRingNodes(contacts);
    expect(nodes).toHaveLength(2);

    const nodeA = nodes.find((n) => n.contact.id === "a")!;
    const nodeB = nodes.find((n) => n.contact.id === "b")!;

    expect(nodeA.ring).toBe(1);
    expect(nodeB.ring).toBe(3);

    // Each node should sit on its ring's radius from center
    const distA = Math.sqrt((nodeA.x - SVG_CENTER) ** 2 + (nodeA.y - SVG_CENTER) ** 2);
    const distB = Math.sqrt((nodeB.x - SVG_CENTER) ** 2 + (nodeB.y - SVG_CENTER) ** 2);
    expect(distA).toBeCloseTo(RING_RADII[1], 1);
    expect(distB).toBeCloseTo(RING_RADII[3], 1);
  });
});
