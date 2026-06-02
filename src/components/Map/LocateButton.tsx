import './LocateButton.css';

interface Props {
  onClick: () => void;
  status: 'idle' | 'requesting' | 'granted' | 'denied' | 'unavailable';
}

export function LocateButton({ onClick, status }: Props) {
  const disabled = status === 'unavailable';
  const title =
    status === 'denied'
      ? '已拒绝定位权限——浏览器设置里重新允许才能用'
      : status === 'unavailable'
        ? '此设备不支持定位'
        : '回到我的位置';

  return (
    <button
      className={`locate-btn status-${status}`}
      onClick={onClick}
      aria-label={title}
      title={title}
      disabled={disabled}
    >
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v3M12 19v3M2 12h3M19 12h3" strokeLinecap="round" />
      </svg>
    </button>
  );
}
