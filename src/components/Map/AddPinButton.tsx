import type { PinKind } from '../../types/pin';
import './AddPinButton.css';

interface Props {
  placingKind: PinKind | null;
  onStartPlacing: (kind: PinKind) => void;
  onCancelPlacing: () => void;
}

export function AddPinButton({ placingKind, onStartPlacing, onCancelPlacing }: Props) {
  if (placingKind) {
    return (
      <button className="add-pin-btn is-cancel" onClick={onCancelPlacing} aria-label="取消打标">
        ✕
      </button>
    );
  }

  return (
    <button className="add-pin-btn" onClick={() => onStartPlacing('doing')} aria-label="新增标记">
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.4">
        <path d="M12 5v14M5 12h14" strokeLinecap="round" />
      </svg>
    </button>
  );
}
