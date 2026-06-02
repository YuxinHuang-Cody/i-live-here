import './UserDot.css';

export function UserDot() {
  return (
    <div className="user-dot" aria-hidden="true">
      <div className="user-dot-pulse" />
      <div className="user-dot-core" />
    </div>
  );
}
