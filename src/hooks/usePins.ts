import { useCallback, useEffect, useState } from 'react';
import { pinService, usingSupabase } from '../services/pinService';
import { prefs } from '../services/prefs';
import type { Pin, PinDraft } from '../types/pin';

export function usePins() {
  const [pins, setPins] = useState<Pin[]>([]);
  const [loading, setLoading] = useState(true);
  const [likedSet, setLikedSet] = useState<Set<string>>(() => prefs.getLikedSet());
  const [ownedSet, setOwnedSet] = useState<Set<string>>(() => prefs.getOwnedSet());

  const reload = useCallback(async () => {
    const next = await pinService.list();
    setPins(next);
  }, []);

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

  useEffect(() => {
    if (!pinService.subscribe) return;
    const unsub = pinService.subscribe(() => {
      void reload();
    });
    return unsub;
  }, [reload]);

  const addPin = useCallback(async (draft: PinDraft): Promise<Pin> => {
    const created = await pinService.create(draft);
    setPins((curr) => [created, ...curr.filter((p) => p.id !== created.id)]);
    setOwnedSet((curr) => {
      if (curr.has(created.id)) return curr;
      const next = new Set(curr);
      next.add(created.id);
      return next;
    });
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
    setOwnedSet((curr) => {
      if (!curr.has(id)) return curr;
      const next = new Set(curr);
      next.delete(id);
      return next;
    });
  }, []);

  const toggleLike = useCallback(
    async (id: string): Promise<Pin> => {
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
    },
    [likedSet],
  );

  // In local mode every pin on this device is "yours". In Supabase mode,
  // only pins whose owner_token we still hold count as owned.
  const isOwned = useCallback(
    (id: string): boolean => (usingSupabase ? ownedSet.has(id) : true),
    [ownedSet],
  );

  return { pins, loading, likedSet, isOwned, addPin, removePin, toggleLike };
}
