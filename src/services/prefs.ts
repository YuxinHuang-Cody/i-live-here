/**
 * Local-user preferences kept on this device only. In a real backend world
 * the like-set could move server-side; the owner-tokens are intentionally
 * device-local — they prove "I'm the creator of this pin" without an account.
 */

const LIKES_KEY = 'ilh.likes.v1';
const AUTHOR_KEY = 'ilh.lastAuthor.v1';
const OWNED_TOKENS_KEY = 'ilh.ownedTokens.v1';

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export const prefs = {
  getLikedSet(): Set<string> {
    const arr = readJson<string[]>(LIKES_KEY, []);
    return new Set(Array.isArray(arr) ? arr : []);
  },
  setLikedSet(set: Set<string>): void {
    localStorage.setItem(LIKES_KEY, JSON.stringify([...set]));
  },
  getLastAuthor(): string {
    return localStorage.getItem(AUTHOR_KEY) || '';
  },
  setLastAuthor(name: string): void {
    if (name.trim()) localStorage.setItem(AUTHOR_KEY, name.trim());
  },

  getOwnedTokens(): Record<string, string> {
    return readJson<Record<string, string>>(OWNED_TOKENS_KEY, {});
  },
  getOwnedSet(): Set<string> {
    return new Set(Object.keys(this.getOwnedTokens()));
  },
  getOwnerToken(pinId: string): string | null {
    return this.getOwnedTokens()[pinId] ?? null;
  },
  setOwnerToken(pinId: string, token: string): void {
    const map = this.getOwnedTokens();
    map[pinId] = token;
    localStorage.setItem(OWNED_TOKENS_KEY, JSON.stringify(map));
  },
  removeOwnerToken(pinId: string): void {
    const map = this.getOwnedTokens();
    delete map[pinId];
    localStorage.setItem(OWNED_TOKENS_KEY, JSON.stringify(map));
  },
};
