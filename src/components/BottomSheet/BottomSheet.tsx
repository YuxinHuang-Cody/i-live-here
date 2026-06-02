import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import './BottomSheet.css';

type SnapPoint = 'closed' | 'peek' | 'half' | 'full';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  initialSnap?: Exclude<SnapPoint, 'closed'>;
  children: ReactNode;
  /** Hide the dim/scrim behind the sheet — useful when sheet is informational over the map. */
  hideScrim?: boolean;
}

function snapHeight(snap: SnapPoint, vh: number): number {
  switch (snap) {
    case 'closed':
      return 0;
    case 'peek':
      return Math.min(220, vh * 0.32);
    case 'half':
      return vh * 0.72;
    case 'full':
      return vh * 0.9;
  }
}

const ORDER: SnapPoint[] = ['closed', 'peek', 'half', 'full'];

export function BottomSheet({
  open,
  onClose,
  initialSnap = 'half',
  children,
  hideScrim = false,
}: BottomSheetProps) {
  const [snap, setSnap] = useState<SnapPoint>(open ? initialSnap : 'closed');
  const [dragOffset, setDragOffset] = useState(0);
  const [vh, setVh] = useState(() => window.innerHeight);
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<{ y: number; startHeight: number } | null>(null);

  useEffect(() => {
    setSnap(open ? initialSnap : 'closed');
  }, [open, initialSnap]);

  useEffect(() => {
    const onResize = () => setVh(window.innerHeight);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const targetHeight = snapHeight(snap, vh);
  const renderedHeight = Math.max(0, targetHeight + dragOffset);

  const settleToNearestSnap = useCallback(
    (height: number) => {
      const candidates: SnapPoint[] = open ? ORDER : ['closed'];
      let best: SnapPoint = candidates[0];
      let bestDiff = Infinity;
      for (const s of candidates) {
        const diff = Math.abs(snapHeight(s, vh) - height);
        if (diff < bestDiff) {
          bestDiff = diff;
          best = s;
        }
      }
      if (best === 'closed') {
        onClose();
      } else {
        setSnap(best);
      }
    },
    [open, onClose, vh],
  );

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    dragStateRef.current = { y: e.clientY, startHeight: targetHeight };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const state = dragStateRef.current;
    if (!state) return;
    // Drag up → height grows → negative offset of dy means dragUp increases height.
    const dy = e.clientY - state.y;
    setDragOffset(-dy);
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const state = dragStateRef.current;
    if (!state) return;
    const finalHeight = state.startHeight + (-(e.clientY - state.y));
    dragStateRef.current = null;
    setDragOffset(0);
    settleToNearestSnap(finalHeight);
  };

  return (
    <>
      {open && !hideScrim && <div className="bs-scrim" onClick={onClose} />}
      <div
        ref={sheetRef}
        className={`bs-sheet ${open ? 'is-open' : 'is-closed'}`}
        style={{
          height: open ? `${renderedHeight}px` : '0px',
          transition: dragStateRef.current ? 'none' : 'height 0.28s cubic-bezier(.2,.8,.2,1)',
        }}
        role="dialog"
        aria-modal="true"
      >
        <div
          className="bs-handle-area"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <div className="bs-handle" />
        </div>
        <div className="bs-body">{children}</div>
      </div>
    </>
  );
}
