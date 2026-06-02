/**
 * Local-user preferences kept on this device only. In a real backend world
 * these would be part of the user's session/profile, not the pin record.
 */

const LIKES_KEY = 'ilh.likes.v1';
const AUTHOR_KEY = 'ilh.lastAuthor.v1';

export const prefs = {
  getLikedSet(): Set<string> {
    try {
      const raw = localStorage.getItem(LIKES_KEY);
      if (!raw) return new Set();
      const arr = JSON.parse(raw);
      return new Set(Array.isArray(arr) ? arr : []);
    } catch {
      return new Set();
    }
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
};
