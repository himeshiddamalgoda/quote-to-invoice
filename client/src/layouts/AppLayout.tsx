import { NavLink, Outlet } from 'react-router';
import { useAuth } from '../features/auth/hooks/use-auth';
export function AppLayout() {
  const { user, signOut } = useAuth();
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header>
        <NavLink to="/" className="brand">
          Quote Flow
        </NavLink>
        <nav aria-label="Main navigation">
          <NavLink to="/">Overview</NavLink>
          {user ? (
            <button onClick={signOut}>Sign out</button>
          ) : (
            <NavLink to="/login">Sign in</NavLink>
          )}
        </nav>
      </header>
      <main id="main">
        <Outlet />
      </main>
      <footer>Customer → Quotation → Approval → Acceptance → Proforma Invoice</footer>
    </>
  );
}
