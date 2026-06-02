import { useCallback, useState } from 'react';
import { BottomSheet } from './components/BottomSheet/BottomSheet';
import { MapView } from './components/Map/MapView';
import { PinDetail } from './components/Forms/PinDetail';
import { PinForm } from './components/Forms/PinForm';
import { usePins } from './hooks/usePins';
import type { Pin, PinDraft, PinKind } from './types/pin';
import './App.css';

type Sheet =
  | { kind: 'none' }
  | { kind: 'create'; pinKind: PinKind; lng: number; lat: number }
  | { kind: 'detail'; pin: Pin };

export default function App() {
  const { pins, likedSet, isOwned, addPin, removePin, toggleLike } = usePins();
  const [placingKind, setPlacingKind] = useState<PinKind | null>(null);
  const [sheet, setSheet] = useState<Sheet>({ kind: 'none' });

  const handleStartPlacing = useCallback((kind: PinKind) => {
    setSheet({ kind: 'none' });
    setPlacingKind(kind);
  }, []);

  const handleConfirmPlacing = useCallback(
    (lng: number, lat: number) => {
      if (!placingKind) return;
      setSheet({ kind: 'create', pinKind: placingKind, lng, lat });
      setPlacingKind(null);
    },
    [placingKind],
  );

  const handleSubmitForm = useCallback(
    async (draft: PinDraft) => {
      await addPin(draft);
      setSheet({ kind: 'none' });
    },
    [addPin],
  );

  const handleSelectPin = useCallback((pin: Pin) => {
    setPlacingKind(null);
    setSheet({ kind: 'detail', pin });
  }, []);

  const closeSheet = useCallback(() => setSheet({ kind: 'none' }), []);

  return (
    <div className="app-root">
      <MapView
        pins={pins}
        placingKind={placingKind}
        onStartPlacing={handleStartPlacing}
        onCancelPlacing={() => setPlacingKind(null)}
        onConfirmPlacing={handleConfirmPlacing}
        onSelectPin={handleSelectPin}
      />

      <BottomSheet
        open={sheet.kind !== 'none'}
        onClose={closeSheet}
        hideScrim={sheet.kind === 'detail'}
      >
        {sheet.kind === 'create' && (
          <PinForm
            initialKind={sheet.pinKind}
            lng={sheet.lng}
            lat={sheet.lat}
            onSubmit={handleSubmitForm}
            onCancel={closeSheet}
          />
        )}
        {sheet.kind === 'detail' && (
          <PinDetail
            pin={pins.find((p) => p.id === sheet.pin.id) ?? sheet.pin}
            liked={likedSet.has(sheet.pin.id)}
            owned={isOwned(sheet.pin.id)}
            onToggleLike={(id) => {
              void toggleLike(id);
            }}
            onDelete={async (id) => {
              await removePin(id);
              closeSheet();
            }}
            onClose={closeSheet}
          />
        )}
      </BottomSheet>
    </div>
  );
}
