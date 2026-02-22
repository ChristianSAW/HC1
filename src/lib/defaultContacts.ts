import { Contact } from "./nudges";

export const STORAGE_KEY = "warmth_default_contacts";

const DEFAULT_CONTACTS: Contact[] = [
  { id: "default_priya",  name: "Priya Nair",      photo_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Priya",  location: "Berkeley",      relationship_depth: 5, tags: ["Section A", "Close Friend", "Study Group"], last_interaction_date: "2026-02-05" },
  { id: "default_marcus", name: "Marcus Chen",      photo_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Marcus", location: "San Francisco", relationship_depth: 4, tags: ["Tech Club", "Bay Area"],                      last_interaction_date: "2026-01-22" },
  { id: "default_sophie", name: "Sophie Laurent",   photo_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sophie", location: "New York",      relationship_depth: 3, tags: ["Finance Club", "Recruiting"],                 last_interaction_date: "2026-01-10" },
  { id: "default_tomas",  name: "Tomas Reyes",      photo_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Tomas",  location: "Berkeley",      relationship_depth: 3, tags: ["Section B", "Entrepreneurship"],              last_interaction_date: "2026-02-10" },
  { id: "default_aisha",  name: "Aisha Okonkwo",    photo_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Aisha",  location: "Oakland",       relationship_depth: 4, tags: ["Consortium", "Close Friend"],                 last_interaction_date: "2026-01-28" },
  { id: "default_james",  name: "James Whitfield",  photo_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=James",  location: "Palo Alto",     relationship_depth: 2, tags: ["Mentor", "Bay Area"],                         last_interaction_date: "2025-12-15" },
  { id: "default_elena",  name: "Elena Vasquez",    photo_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Elena",  location: "Chicago",       relationship_depth: 3, tags: ["Home"],                                       last_interaction_date: "2026-01-05" },
  { id: "default_kai",    name: "Kai Nakamura",     photo_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Kai",    location: "Mountain View", relationship_depth: 4, tags: ["Tech Club", "Section C"],                    last_interaction_date: "2026-02-01" },
  { id: "default_zara",   name: "Zara Ahmed",       photo_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Zara",   location: "Berkeley",      relationship_depth: 5, tags: ["Section A", "Close Friend", "International"], last_interaction_date: "2026-02-07" },
];

export function saveDefaultContacts(): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_CONTACTS));
}

export function loadDefaultContacts(): Contact[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Contact[];
  } catch {}
  return DEFAULT_CONTACTS;
}

export function clearDefaultContacts(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function isDefaultContact(id: string): boolean {
  return id.startsWith("default_");
}
