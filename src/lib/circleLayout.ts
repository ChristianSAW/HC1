import type { Contact } from "./nudges";
import { getWarmthRing } from "./nudges";

export const SVG_SIZE = 440;
export const SVG_CENTER = SVG_SIZE / 2; // 220

export const RING_RADII: Record<1 | 2 | 3 | 4, number> = {
  1: 65,
  2: 120,
  3: 168,
  4: 205,
};

export interface RingNode {
  contact: Contact;
  ring: 1 | 2 | 3 | 4;
  x: number;
  y: number;
}

const NODE_RADIUS = 18;

export function getRingNodes(contacts: Contact[]): RingNode[] {
  const groups: Record<number, Contact[]> = { 1: [], 2: [], 3: [], 4: [] };
  for (const c of contacts) {
    groups[getWarmthRing(c)].push(c);
  }

  const nodes: RingNode[] = [];
  for (const ring of [1, 2, 3, 4] as const) {
    const ringContacts = groups[ring];
    const r = RING_RADII[ring];
    // Max contacts before nodes overlap: floor(2π / (2 * arcsin(NODE_RADIUS / r)))
    const maxCount = Math.floor(Math.PI / Math.asin(NODE_RADIUS / r));
    const visible = ringContacts.slice(0, maxCount);
    const count = visible.length;
    visible.forEach((contact, i) => {
      const angle = (2 * Math.PI * i) / count - Math.PI / 2;
      nodes.push({
        contact,
        ring,
        x: SVG_CENTER + r * Math.cos(angle),
        y: SVG_CENTER + r * Math.sin(angle),
      });
    });
  }
  return nodes;
}
