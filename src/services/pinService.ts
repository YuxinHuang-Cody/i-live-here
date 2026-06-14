import { ANONYMOUS_AUTHOR, CATEGORIES, type Pin, type PinCategory, type PinDraft } from '../types/pin';
import { blobToDataUrl } from './imageCompress';
import { supabasePinService } from './supabasePinService';

/**
 * Storage-agnostic pin repository. The UI only touches this interface,
 * so the choice between localStorage and a real backend lives here.
 */
export interface PinService {
  list(): Promise<Pin[]>;
  create(draft: PinDraft): Promise<Pin>;
  remove(id: string): Promise<void>;
  like(id: string): Promise<Pin>;
  unlike(id: string): Promise<Pin>;
  /** Optional realtime hook — local impl returns nothing. */
  subscribe?(onChange: () => void): () => void;
}

const STORAGE_KEY = 'ilh.pins.v1';

const CATEGORY_KEYS = new Set<PinCategory>(CATEGORIES.map((c) => c.key));

function parseCategory(value: unknown): PinCategory | undefined {
  return typeof value === 'string' && CATEGORY_KEYS.has(value as PinCategory)
    ? (value as PinCategory)
    : undefined;
}

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
    imageUrl:
      typeof raw.imageUrl === 'string'
        ? raw.imageUrl
        : typeof raw.imageDataUrl === 'string' // back-compat with v0 storage
          ? raw.imageDataUrl
          : undefined,
    category: parseCategory(raw.category),
    lookingForCompany: raw.lookingForCompany === true ? true : undefined,
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
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
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
    const imageUrl = draft.imageBlob ? await blobToDataUrl(draft.imageBlob) : undefined;
    const pin: Pin = {
      kind: draft.kind,
      title: draft.title,
      note: draft.note,
      lng: draft.lng,
      lat: draft.lat,
      author,
      imageUrl,
      id: uid(),
      createdAt: Date.now(),
      likes: 0,
      category: draft.category,
      lookingForCompany: draft.kind === 'wishlist' && draft.lookingForCompany ? true : undefined,
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

export const pinService: PinService = supabasePinService ?? localPinService;
export const usingSupabase = supabasePinService !== null;
