import { Link } from 'react-router';
import { usePageTitle } from '../lib/usePageTitle';

export function NotFoundPage({ what = 'page' }: { what?: string }) {
  usePageTitle('Not found');
  return (
    <section className="empty" style={{ maxWidth: '40rem' }}>
      <p className="eyebrow">Not found</p>
      <h1 style={{ fontSize: '1.8rem', margin: '0.4rem 0 0.6rem' }}>This {what} does not exist.</h1>
      <p>The link may be mistyped or refer to content from another version of the course.</p>
      <div className="row" style={{ marginTop: '1rem' }}>
        <Link className="btn primary" to="/curriculum">
          Browse the curriculum
        </Link>
        <Link className="btn" to="/dashboard">
          Go to overview
        </Link>
      </div>
    </section>
  );
}
