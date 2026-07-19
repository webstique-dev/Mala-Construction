import { Link } from 'react-router-dom';
import PlaceholderPage from '../../components/common/PlaceholderPage';

export default function Unauthorized() {
  return (
    <PlaceholderPage title="403 - Not authorized" description="You don't have permission to view this page.">
      <Link to="/dashboard">Back to dashboard</Link>
    </PlaceholderPage>
  );
}
