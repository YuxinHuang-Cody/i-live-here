import { ANONYMOUS_AUTHOR, type Pin, type PinDraft } from '../types/pin';

/**
 * Storage-agnostic pin repository. Swap the implementation here when a
 * real backend exists — UI code only touches this interface.
 */
export interface PinService {
  list(): Promise<Pin[]>;
  create(draft: PinDraft): Promise<Pin>;
  remove(id: string): Promise<void>;
  like(id: string): Promise<Pin>;
  unlike(id: string): Promise<Pin>;
}

const STORAGE_KEY = 'ilh.pins.v1';

function normalize(raw: Record<string, unknown>): Pin {
  return {
    id: String(raw.id),
    kind: raw.kind === 'wishlist' ? 'wishlist' : 'doing',
    title: typeof raw.title === 'string' ? raw.title : '',
    note: typeof raw.note === 'string' ? raw.note : '',
    lng: Number(raw.lng),
    lat: Number(raw.lat),
    createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : Date.now(),
    likes: typeof raw.likes === 'number' ? raw.likes : 0,
    author:
      typeof raw.author === 'string' && raw.author.trim() ? raw.author : ANONYMOUS_AUTHOR,
    imageDataUrl: typeof raw.imageDataUrl === 'string' ? raw.imageDataUrl : undefined,
  };
}

function readAll(): Pin[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalize);
  } catch {
    return [];
  }
}

function writeAll(pins: Pin[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(pins));
}

function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function adjustLikes(id: string, delta: number): Pin {
  const all = readAll();
  const idx = all.findIndex((p) => p.id === id);
  if (idx < 0) throw new Error(`pin ${id} not found`);
  const updated: Pin = { ...all[idx], likes: Math.max(0, all[idx].likes + delta) };
  all[idx] = updated;
  writeAll(all);
  return updated;
}

export const localPinService: PinService = {
  async list() {
    return readAll().sort((a, b) => b.createdAt - a.createdAt);
  },
  async create(draft) {
    const author = draft.author.trim() || ANONYMOUS_AUTHOR;
    const pin: Pin = {
      ...draft,
      author,
      id: uid(),
      createdAt: Date.now(),
      likes: 0,
    };
    const all = readAll();
    all.push(pin);
    writeAll(all);
    return pin;
  },
  async remove(id) {
    writeAll(readAll().filter((p) => p.id !== id));
  },
  async like(id) {
    return adjustLikes(id, +1);
  },
  async unlike(id) {
    return adjustLikes(id, -1);
  },
};

/**
 * Example future implementation — left here as documentation, not wired up.
 *
 * export const httpPinService: PinService = {
 *   list: () => fetch('/api/pins').then((r) => r.json()),
 *   create: (draft) =>
 *     fetch('/api/pins', {
 *       method: 'POST',
 *       headers: { 'content-type': 'application/json' },
 *       body: JSON.stringify(draft),
 *     }).then((r) => r.json()),
 *   remove: (id) => fetch(`/api/pins/${id}`, { method: 'DELETE' }).then(() => undefined),
 *   like: (id) => fetch(`/api/pins/${id}/like`, { method: 'POST' }).then((r) => r.json()),
 *   unlike: (id) => fetch(`/api/pins/${id}/like`, { method: 'DELETE' }).then((r) => r.json()),
 * };
 */

export const pinService: PinService = localPinService;
