import './PlaceholderPage.css';

export default function PlaceholderPage({ title, description, children }) {
  return (
    <div className="placeholder-page">
      <h1>{title}</h1>
      <p>{description || 'This module will be implemented in a later build phase.'}</p>
      {children}
    </div>
  );
}
