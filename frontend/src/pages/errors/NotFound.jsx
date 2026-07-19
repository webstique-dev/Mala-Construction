import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div style={{ padding: '2rem' }}>
      <h1>404 - Page not found</h1>
      <Link to="/dashboard">Back to dashboard</Link>
    </div>
  );
}
