import { useCallback, useEffect, useState } from 'react';
import { pinService } from '../services/pinService';
import { prefs } from '../services/prefs';
import type { Pin, PinDraft } from '../types/pin';

export function usePins() {
  const [pins, setPins] = useState<Pin[]>([]);
  const [loading, setLoading] = useState(true);
  const [likedSet, setLikedSet] = useState<Set<string>>(() => prefs.getLikedSet());

  useEffect(() => {
    let alive = true;
    pinService.list().then((next) => {
      if (alive) {
        setPins(next);
        setLoading(false);
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  const addPin = useCallback(async (draft: PinDraft): Promise<Pin> => {
    const created = await pinService.create(draft);
    setPins((curr) => [created, ...curr]);
    return created;
  }, []);

  const removePin = useCallback(async (id: string) => {
    await pinService.remove(id);
    setPins((curr) => curr.filter((p) => p.id !== id));
    setLikedSet((curr) => {
      if (!curr.has(id)) return curr;
      const next = new Set(curr);
      next.delete(id);
      prefs.setLikedSet(next);
      return next;
    });
  }, []);

  const toggleLike = useCallback(async (id: string): Promise<Pin> => {
    const isLiked = likedSet.has(id);
    const updated = isLiked ? await pinService.unlike(id) : await pinService.like(id);
    setPins((curr) => curr.map((p) => (p.id === id ? updated : p)));
    setLikedSet((curr) => {
      const next = new Set(curr);
      if (isLiked) next.delete(id);
      else next.add(id);
      prefs.setLikedSet(next);
      return next;
    });
    return updated;
  }, [likedSet]);

  return { pins, loading, likedSet, addPin, removePin, toggleLike };
}
