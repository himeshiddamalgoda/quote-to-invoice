import { Link } from 'react-router';
export function RouteError() {
  return (
    <main>
      <h1>Unable to open this page</h1>
      <p>Please reload or return to the application.</p>
      <Link to="/">Go home</Link>
    </main>
  );
}
