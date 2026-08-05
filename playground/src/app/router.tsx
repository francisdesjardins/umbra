import { RootLayout } from '@/widgets/root-layout';
import {
  createHashHistory,
  createRootRoute,
  createRoute,
  createRouter,
  lazyRouteComponent,
  redirect,
} from '@tanstack/react-router';

const rootRoute = createRootRoute({
  component: RootLayout,
});

const indexRoute = createRoute({
  getParentRoute: () => {
    return rootRoute;
  },
  path: '/',
  beforeLoad: () => {
    // react-router's redirect uses a special object — silence ESLint rule for it
    // eslint-disable-next-line @typescript-eslint/only-throw-error
    throw redirect({ to: '/getting-started' });
  },
});

const gettingStartedRoute = createRoute({
  getParentRoute: () => {
    return rootRoute;
  },
  path: '/getting-started',
  component: lazyRouteComponent(() => {
    return import('@/pages/getting-started');
  }, 'GettingStartedPage'),
});

const apiRoute = createRoute({
  getParentRoute: () => {
    return rootRoute;
  },
  path: '/api',
  component: lazyRouteComponent(() => {
    return import('@/pages/api');
  }, 'ApiIndexPage'),
});

// One page per chapter of the reference — `/api` itself is the map, not a ninety-symbol list.
const apiCategoryRoute = createRoute({
  getParentRoute: () => {
    return rootRoute;
  },
  path: '/api/$category',
  component: lazyRouteComponent(() => {
    return import('@/pages/api');
  }, 'ApiCategoryPage'),
});

const modalActionsRoute = createRoute({
  getParentRoute: () => {
    return rootRoute;
  },
  path: '/modal-actions',
  component: lazyRouteComponent(() => {
    return import('@/pages/modal-actions');
  }, 'ModalActionsPage'),
});

const slideModalRoute = createRoute({
  getParentRoute: () => {
    return rootRoute;
  },
  path: '/slide-modal',
  component: lazyRouteComponent(() => {
    return import('@/pages/slide-modal');
  }, 'SlideModalPage'),
});

const advancedRoute = createRoute({
  getParentRoute: () => {
    return rootRoute;
  },
  path: '/advanced',
  component: lazyRouteComponent(() => {
    return import('@/pages/advanced');
  }, 'AdvancedPage'),
});

const uiIntegrationsRoute = createRoute({
  getParentRoute: () => {
    return rootRoute;
  },
  path: '/ui-integrations',
  component: lazyRouteComponent(() => {
    return import('@/pages/ui-integrations');
  }, 'UIIntegrationsPage'),
});

const uiTemplatesRoute = createRoute({
  getParentRoute: () => {
    return rootRoute;
  },
  path: '/ui-templates',
  component: lazyRouteComponent(() => {
    return import('@/pages/ui-templates');
  }, 'UITemplatesPage'),
});

const storiesRoute = createRoute({
  getParentRoute: () => {
    return rootRoute;
  },
  path: '/stories',
  component: lazyRouteComponent(() => {
    return import('@/pages/stories');
  }, 'StoriesPage'),
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  gettingStartedRoute,
  modalActionsRoute,
  apiRoute,
  apiCategoryRoute,
  slideModalRoute,
  advancedRoute,
  uiIntegrationsRoute,
  uiTemplatesRoute,
  storiesRoute,
]);

// Use hash-based history when built for file:// (VITE_HASH_ROUTER=true)
const history = import.meta.env['VITE_HASH_ROUTER'] === 'true' ? createHashHistory() : undefined;

export const router = createRouter({ routeTree, ...(history ? { history } : {}) });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
