import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Map, { Marker, type MapRef, type ViewStateChangeEvent } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { INITIAL_VIEW, MAP_STYLE, MAPBOX_TOKEN } from '../../config';
import { useUserLocation } from '../../hooks/useUserLocation';
import type { Pin, PinKind } from '../../types/pin';
import { AddPinButton } from './AddPinButton';
import { CenterCrosshair } from './CenterCrosshair';
import { LocateButton } from './LocateButton';
import { PinMarker } from './PinMarker';
import { UserDot } from './UserDot';
import './MapView.css';

interface MapViewProps {
  pins: Pin[];
  placingKind: PinKind | null;
  onStartPlacing: (kind: PinKind) => void;
  onCancelPlacing: () => void;
  onConfirmPlacing: (lng: number, lat: number) => void;
  onSelectPin: (pin: Pin) => void;
}

export function MapView({
  pins,
  placingKind,
  onStartPlacing,
  onCancelPlacing,
  onConfirmPlacing,
  onSelectPin,
}: MapViewProps) {
  const mapRef = useRef<MapRef>(null);
  const [view, setView] = useState<{
    longitude: number;
    latitude: number;
    zoom: number;
    pitch: number;
    bearing: number;
  }>({ ...INITIAL_VIEW });
  const { location, status, request } = useUserLocation();
  const hasAutoCenteredRef = useRef(false);
  const placingFlewRef = useRef(false);

  useEffect(() => {
    if (hasAutoCenteredRef.current || !location) return;
    hasAutoCenteredRef.current = true;
    mapRef.current?.flyTo({
      center: [location.lng, location.lat],
      zoom: 16,
      duration: 800,
    });
  }, [location]);

  // Each time the user enters placing mode, snap the crosshair to their
  // current GPS spot. If location is still loading we'll fly as soon as it
  // arrives. Reset the flag on exit so the next placement re-flies.
  useEffect(() => {
    if (!placingKind) {
      placingFlewRef.current = false;
      return;
    }
    if (placingFlewRef.current || !location) return;
    placingFlewRef.current = true;
    mapRef.current?.flyTo({
      center: [location.lng, location.lat],
      zoom: 17,
      duration: 500,
    });
  }, [placingKind, location]);

  const onMove = useCallback((e: ViewStateChangeEvent) => {
    setView({
      longitude: e.viewState.longitude,
      latitude: e.viewState.latitude,
      zoom: e.viewState.zoom,
      pitch: e.viewState.pitch,
      bearing: e.viewState.bearing,
    });
  }, []);

  const flyToUser = useCallback(async () => {
    const target = location ?? (await request());
    if (target) {
      mapRef.current?.flyTo({
        center: [target.lng, target.lat],
        zoom: 16,
        duration: 700,
      });
    }
  }, [location, request]);

  const confirmHere = useCallback(() => {
    onConfirmPlacing(view.longitude, view.latitude);
  }, [onConfirmPlacing, view.longitude, view.latitude]);

  const markers = useMemo(
    () =>
      pins.map((p) => (
        <Marker
          key={p.id}
          longitude={p.lng}
          latitude={p.lat}
          anchor="bottom"
          onClick={(e) => {
            e.originalEvent.stopPropagation();
            onSelectPin(p);
          }}
        >
          <PinMarker kind={p.kind} title={p.title} />
        </Marker>
      )),
    [pins, onSelectPin],
  );

  if (!MAPBOX_TOKEN || MAPBOX_TOKEN.startsWith('pk.your_token')) {
    return (
      <div className="map-missing-token">
        <h2>缺少 Mapbox token</h2>
        <p>
          复制 <code>.env.example</code> 为 <code>.env.local</code>，把 <code>VITE_MAPBOX_TOKEN</code>{' '}
          填上你在 <a href="https://account.mapbox.com/access-tokens/">Mapbox</a> 拿到的 token，然后重启
          <code>npm run dev</code>。
        </p>
      </div>
    );
  }

  return (
    <div className="map-root">
      <Map
        ref={mapRef}
        mapboxAccessToken={MAPBOX_TOKEN}
        mapStyle={MAP_STYLE}
        longitude={view.longitude}
        latitude={view.latitude}
        zoom={view.zoom}
        pitch={view.pitch}
        bearing={view.bearing}
        onMove={onMove}
        attributionControl={false}
        dragRotate={false}
        touchPitch={false}
        cooperativeGestures={false}
        reuseMaps
        style={{ width: '100%', height: '100%' }}
      >
        {markers}
        {location && (
          <Marker longitude={location.lng} latitude={location.lat} anchor="center">
            <UserDot />
          </Marker>
        )}
      </Map>

      {placingKind && <CenterCrosshair kind={placingKind} />}

      <div className="map-side-controls">
        <AddPinButton
          placingKind={placingKind}
          onStartPlacing={onStartPlacing}
          onCancelPlacing={onCancelPlacing}
        />
        <LocateButton onClick={flyToUser} status={status} />
      </div>

      {placingKind && (
        <div className="map-place-confirm">
          <button className="place-confirm-btn" onClick={confirmHere}>
            在这里打标
          </button>
        </div>
      )}
    </div>
  );
}
