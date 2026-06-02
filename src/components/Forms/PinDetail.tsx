import type { Pin } from '../../types/pin';
import './PinForm.css';
import './PinDetail.css';

interface Props {
  pin: Pin;
  liked: boolean;
  onToggleLike: (id: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

const KIND_LABEL = {
  doing: '我在这里做的好玩事情',
  wishlist: '我想去做的事情',
} as const;

export function PinDetail({ pin, liked, onToggleLike, onDelete, onClose }: Props) {
  return (
    <div className="pin-detail">
      <div className={`pin-detail-tag kind-${pin.kind}`}>{KIND_LABEL[pin.kind]}</div>
      <h2 className="pin-detail-title">{pin.title}</h2>
      <p className="pin-detail-meta">
        <span className="pin-detail-author">@{pin.author}</span>
        <span className="pin-detail-dot">·</span>
        <span>{new Date(pin.createdAt).toLocaleString('zh-CN', { hour12: false })}</span>
      </p>
      <p className="pin-detail-coords">
        {pin.lat.toFixed(5)}, {pin.lng.toFixed(5)}
      </p>

      {pin.imageDataUrl && (
        <div className="pin-detail-image">
          <img src={pin.imageDataUrl} alt={pin.title} />
        </div>
      )}

      {pin.note && <p className="pin-detail-note">{pin.note}</p>}

      <div className="pin-detail-like-row">
        <button
          type="button"
          className={`pin-detail-like ${liked ? 'is-liked' : ''}`}
          onClick={() => onToggleLike(pin.id)}
          aria-pressed={liked}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path
              d="M12 21s-7-4.5-9.5-9C.8 8.5 2.7 4.5 6.5 4.5c2 0 3.4 1 4.5 2.5 1.1-1.5 2.5-2.5 4.5-2.5 3.8 0 5.7 4 4 7.5C19 16.5 12 21 12 21z"
              fill={liked ? 'currentColor' : 'none'}
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
            />
          </svg>
          <span>{pin.likes}</span>
        </button>
      </div>

      <div className="pin-form-actions">
        <button type="button" className="pin-form-btn pin-form-btn-secondary" onClick={onClose}>
          关闭
        </button>
        <button
          type="button"
          className="pin-form-btn pin-detail-delete"
          onClick={() => {
            if (confirm('确定删除这个标记吗？')) onDelete(pin.id);
          }}
        >
          删除
        </button>
      </div>
    </div>
  );
}
