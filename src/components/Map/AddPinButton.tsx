import { useState } from 'react';
import type { PinKind } from '../../types/pin';
import './AddPinButton.css';

interface Props {
  placingKind: PinKind | null;
  onStartPlacing: (kind: PinKind) => void;
  onCancelPlacing: () => void;
}

export function AddPinButton({ placingKind, onStartPlacing, onCancelPlacing }: Props) {
  const [open, setOpen] = useState(false);

  if (placingKind) {
    return (
      <button
        className="add-pin-btn is-cancel"
        onClick={() => {
          setOpen(false);
          onCancelPlacing();
        }}
        aria-label="取消打标"
      >
        ✕
      </button>
    );
  }

  return (
    <div className={`add-pin-wrap ${open ? 'is-open' : ''}`}>
      {open && (
        <div className="add-pin-menu" role="menu">
          <button
            className="add-pin-menu-item"
            onClick={() => {
              setOpen(false);
              onStartPlacing('doing');
            }}
          >
            <span className="dot dot-doing" /> 我在这里做的好玩事情
          </button>
          <button
            className="add-pin-menu-item"
            onClick={() => {
              setOpen(false);
              onStartPlacing('wishlist');
            }}
          >
            <span className="dot dot-wishlist" /> 我想去做的事情
          </button>
        </div>
      )}
      <button
        className="add-pin-btn"
        onClick={() => setOpen((v) => !v)}
        aria-label="添加位置"
        aria-expanded={open}
      >
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.4">
          <path d="M12 5v14M5 12h14" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
