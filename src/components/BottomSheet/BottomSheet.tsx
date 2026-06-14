import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import './BottomSheet.css';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Hide the dim/scrim behind the sheet — useful when sheet is informational over the map. */
  hideScrim?: boolean;
}

/** Fraction of viewport height the sheet occupies when open. */
const OPEN_RATIO = 0.95;
/** px/ms — a down-fling faster than this dismisses regardless of distance. */
const FLING_THRESHOLD = 0.4;
/** Drag the sheet shorter than this fraction of its open height → dismiss. */
const DISMISS_AT = 0.7;

export function BottomSheet({ open, onClose, children, hideScrim = false }: BottomSheetProps) {
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [vh, setVh] = useState(() => window.innerHeight);
  const dragStateRef = useRef<{
    startY: number;
    lastY: number;
    lastT: number;
    velocity: number;
  } | null>(null);

  useEffect(() => {
    const onResize = () => setVh(window.innerHeight);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const openHeight = vh * OPEN_RATIO;
  // Only let the sheet shrink, not grow past its open height.
  const clampedOffset = Math.min(0, dragOffset);
  const renderedHeight = Math.max(0, openHeight + clampedOffset);

  const settle = useCallback(
    (finalHeight: number, velocity: number) => {
      // Down-fling: dismiss regardless of distance.
      if (velocity > FLING_THRESHOLD) {
        onClose();
        return;
      }
      // Dragged down past the threshold: dismiss. Otherwise spring back.
      if (finalHeight < openHeight * DISMISS_AT) {
        onClose();
      }
    },
    [onClose, openHeight],
  );

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    dragStateRef.current = {
      startY: e.clientY,
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
    const instant = (e.clientY - state.lastY) / dt;
    state.velocity = state.velocity * 0.6 + instant * 0.4;
    state.lastY = e.clientY;
    state.lastT = now;
    setDragOffset(-(e.clientY - state.startY));
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const state = dragStateRef.current;
    if (!state) return;
    const dy = e.clientY - state.startY;
    const finalHeight = openHeight - dy;
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
          transition: isDragging ? 'none' : 'height 0.24s cubic-bezier(.22,.9,.22,1)',
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
