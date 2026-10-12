import { createBrowserRouter } from 'react-router';
import { AppLayout } from '../layouts/AppLayout';
import { RouteError } from '../components/RouteError';
export const router = createBrowserRouter([
  {
    path: '/',
    Component: AppLayout,
    ErrorBoundary: RouteError,
    children: [
      {
        index: true,
        lazy: async () => ({ Component: (await import('../pages/OverviewPage')).default }),
      },
      {
        path: 'login',
        lazy: async () => ({ Component: (await import('../pages/LoginPage')).default }),
      },
      {
        path: '*',
        Component: () => (
          <>
            <h1>Page not found</h1>
            <p>Use the navigation to return to the overview.</p>
          </>
        ),
      },
    ],
  },
]);
