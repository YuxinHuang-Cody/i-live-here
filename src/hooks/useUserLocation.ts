import { useCallback, useEffect, useRef, useState } from 'react';

export interface UserLocation {
  lng: number;
  lat: number;
  accuracy: number;
}

type Status = 'idle' | 'requesting' | 'granted' | 'denied' | 'unavailable';

export function useUserLocation() {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const hasAutoRequestedRef = useRef(false);

  const request = useCallback((): Promise<UserLocation | null> => {
    return new Promise((resolve) => {
      if (!('geolocation' in navigator)) {
        setStatus('unavailable');
        resolve(null);
        return;
      }
      setStatus('requesting');
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc: UserLocation = {
            lng: pos.coords.longitude,
            lat: pos.coords.latitude,
            accuracy: pos.coords.accuracy,
          };
          setLocation(loc);
          setStatus('granted');
          resolve(loc);
        },
        (err) => {
          setStatus(err.code === err.PERMISSION_DENIED ? 'denied' : 'unavailable');
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
      );
    });
  }, []);

  useEffect(() => {
    if (hasAutoRequestedRef.current) return;
    hasAutoRequestedRef.current = true;
    request();
  }, [request]);

  return { location, status, request };
}
