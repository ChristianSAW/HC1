import { differenceInDays } from "date-fns";
import { BAY_AREA_LOCATIONS } from "./constants";

export interface Contact {
  id: string;
  name: string;
  last_interaction_date?: string | null;
  relationship_depth?: number | null;
  location?: string | null;
  photo_url?: string | null;
  tags?: string[] | null;
  [key: string]: any;
}

export function getGoingCold(contacts: Contact[]) {
  return contacts.filter((c) => {
    if (!c.last_interaction_date) return true;
    return differenceInDays(new Date(), new Date(c.last_interaction_date)) >= 30;
  });
}

export function getCloseFriendsAtRisk(contacts: Contact[]) {
  return contacts.filter((c) => {
    if ((c.relationship_depth ?? 0) < 4) return false;
    if (!c.last_interaction_date) return true;
    return differenceInDays(new Date(), new Date(c.last_interaction_date)) >= 14;
  });
}

export function getLongDistance(contacts: Contact[]) {
  return contacts.filter((c) => {
    if (!c.location) return false;
    return !BAY_AREA_LOCATIONS.some((loc) =>
      c.location!.toLowerCase().includes(loc.toLowerCase())
    );
  });
}

export function getLocal(contacts: Contact[]) {
  return contacts.filter((c) => {
    if (!c.location) return false;
    return BAY_AREA_LOCATIONS.some((loc) =>
      c.location!.toLowerCase().includes(loc.toLowerCase())
    );
  });
}

export function getWeeklyOutreach(contacts: Contact[]): Contact[] {
  const scored = contacts.map((c) => {
    let score = 0;
    const days = c.last_interaction_date
      ? differenceInDays(new Date(), new Date(c.last_interaction_date))
      : 999;
    score += Math.min(days, 90);
    if ((c.relationship_depth ?? 0) >= 4) score += 30;
    if (days >= 21) score += 20;
    return { ...c, _score: score };
  });
  return scored.sort((a, b) => b._score - a._score).slice(0, 5);
}

export function getNudgeBadge(contact: Contact): string | null {
  if (!contact.last_interaction_date) return "🔥 Reach out";
  const days = differenceInDays(new Date(), new Date(contact.last_interaction_date));
  const depth = contact.relationship_depth ?? 3;
  const isLongDistance = contact.location
    ? !BAY_AREA_LOCATIONS.some((loc) => contact.location!.toLowerCase().includes(loc.toLowerCase()))
    : false;

  if (depth >= 4 && days >= 14) return "⭐ Priority";
  if (isLongDistance && days >= 30) return "🌎 Check in";
  if (days >= 21) return "💛 Nudge";
  return null;
}
