export const HAAS_TAGS = [
  "Section A", "Section B", "Section C", "Section D", "Section E", "Section F",
  "Tech Club", "Finance Club", "Entrepreneurship", "Consortium",
  "International", "Bay Area", "East Coast", "West Coast", "Home",
  "Close Friend", "Recruiting", "Mentor", "Study Group",
] as const;

export const HAAS_CIRCLES = [
  "Section", "Tech Club", "Finance Club", "Consortium",
  "Home Friends", "Recruiting", "Mentors", "Study Group",
  "Entrepreneurship", "International",
] as const;

export const BAY_AREA_LOCATIONS = [
  "Berkeley", "San Francisco", "Oakland", "Palo Alto", "San Jose",
  "Mountain View", "Sunnyvale", "Fremont", "Walnut Creek",
] as const;

export const ENERGY_LEVELS = ["Positive", "Neutral", "Draining"] as const;

export type EnergyLevel = typeof ENERGY_LEVELS[number];
