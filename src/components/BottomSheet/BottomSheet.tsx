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
      return vh * 0.82;
    case 'full':
      return vh * 0.9;
  }
}

const ORDER: SnapPoint[] = ['closed', 'peek', 'half', 'full'];

/** px/ms — above this counts as a "fling" and jumps in the swipe direction. */
const FLING_THRESHOLD = 0.55;

export function BottomSheet({
  open,
  onClose,
  initialSnap = 'half',
  children,
  hideScrim = false,
}: BottomSheetProps) {
  const [snap, setSnap] = useState<SnapPoint>(open ? initialSnap : 'closed');
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [vh, setVh] = useState(() => window.innerHeight);
  const dragStateRef = useRef<{
    startY: number;
    startHeight: number;
    lastY: number;
    lastT: number;
    velocity: number;
  } | null>(null);

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

  const settle = useCallback(
    (finalHeight: number, velocity: number) => {
      const candidates: SnapPoint[] = open ? ORDER : ['closed'];

      // Velocity-biased: a clear fling jumps one snap in that direction.
      if (Math.abs(velocity) > FLING_THRESHOLD) {
        const currentIdx = ORDER.indexOf(snap);
        const dir = velocity > 0 ? -1 : +1; // down-fling → smaller; up-fling → larger
        const nextIdx = Math.max(0, Math.min(ORDER.length - 1, currentIdx + dir));
        const target = ORDER[nextIdx];
        if (target === 'closed') onClose();
        else setSnap(target);
        return;
      }

      // Otherwise snap to nearest height.
      let best: SnapPoint = candidates[0];
      let bestDiff = Infinity;
      for (const s of candidates) {
        const diff = Math.abs(snapHeight(s, vh) - finalHeight);
        if (diff < bestDiff) {
          bestDiff = diff;
          best = s;
        }
      }
      if (best === 'closed') onClose();
      else setSnap(best);
    },
    [open, onClose, snap, vh],
  );

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    dragStateRef.current = {
      startY: e.clientY,
      startHeight: targetHeight,
      lastY: e.clientY,
      lastT: performance.now(),
      velocity: 0,
    };
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const state = dragStateRef.current;
    if (!state) return;
    const now = performance.now();
    const dt = Math.max(1, now - state.lastT);
    // Smooth velocity with an exponential-moving-average so a single jittery
    // sample doesn't trigger an unwanted fling.
    const instant = (e.clientY - state.lastY) / dt;
    state.velocity = state.velocity * 0.6 + instant * 0.4;
    state.lastY = e.clientY;
    state.lastT = now;
    const dy = e.clientY - state.startY;
    setDragOffset(-dy);
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const state = dragStateRef.current;
    if (!state) return;
    const dy = e.clientY - state.startY;
    const finalHeight = state.startHeight - dy;
    const velocity = state.velocity;
    dragStateRef.current = null;
    setIsDragging(false);
    setDragOffset(0);
    settle(finalHeight, velocity);
  };

  return (
    <>
      {open && !hideScrim && <div className="bs-scrim" onClick={onClose} />}
      <div
        className={`bs-sheet ${open ? 'is-open' : 'is-closed'}`}
        style={{
          height: open ? `${renderedHeight}px` : '0px',
          transition: isDragging ? 'none' : 'height 0.32s cubic-bezier(.22,.9,.22,1)',
        }}
        role="dialog"
        aria-modal="true"
      >
        <div
          className="bs-drag-area"
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
