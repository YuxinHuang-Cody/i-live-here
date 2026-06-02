import type { PinKind } from '../../types/pin';
import './CenterCrosshair.css';

interface Props {
  kind: PinKind;
}

export function CenterCrosshair({ kind }: Props) {
  return (
    <div className="crosshair-wrap" aria-hidden="true">
      <div className={`crosshair-pin crosshair-${kind}`}>
        <svg viewBox="0 0 24 32" width="36" height="48">
          <path
            d="M12 0C5.4 0 0 5.2 0 11.6 0 21 12 32 12 32S24 21 24 11.6C24 5.2 18.6 0 12 0z"
            fill="currentColor"
          />
          <circle cx="12" cy="11.5" r="4.5" fill="white" />
        </svg>
      </div>
      <div className="crosshair-shadow" />
    </div>
  );
}
