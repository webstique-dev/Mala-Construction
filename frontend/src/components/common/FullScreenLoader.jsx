import './FullScreenLoader.css';

export default function FullScreenLoader() {
  return (
    <div className="full-screen-loader" role="status" aria-live="polite">
      <div className="full-screen-loader__spinner" />
      <span className="full-screen-loader__label">Loading...</span>
    </div>
  );
}
