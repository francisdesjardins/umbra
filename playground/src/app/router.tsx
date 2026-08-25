import { AppRoot } from '@/app/AppRoot';
import { RoutePending } from '@/app/RoutePending';
import {
  createHashHistory,
  createRootRoute,
  createRoute,
  createRouter,
  lazyRouteComponent,
} from '@tanstack/react-router';

const rootRoute = createRootRoute({
  component: AppRoot,
});

const indexRoute = createRoute({
  getParentRoute: () => {
    return rootRoute;
  },
  path: '/',
  component: lazyRouteComponent(() => {
    return import('@/pages/home');
  }, 'HomePage'),
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

// One page per chapter — `/api` itself is the map, not a ninety-symbol list.
const apiCategoryRoute = createRoute({
  getParentRoute: () => {
    return rootRoute;
  },
  path: '/api/$category',
  component: lazyRouteComponent(() => {
    return import('@/pages/api');
  }, 'ApiCategoryPage'),
});

const dialogActionsRoute = createRoute({
  getParentRoute: () => {
    return rootRoute;
  },
  path: '/dialog-actions',
  component: lazyRouteComponent(() => {
    return import('@/pages/dialog-actions');
  }, 'DialogActionsPage'),
});

const slideDialogRoute = createRoute({
  getParentRoute: () => {
    return rootRoute;
  },
  path: '/slide-dialog',
  component: lazyRouteComponent(() => {
    return import('@/pages/slide-dialog');
  }, 'SlideDialogPage'),
});

const stackingRoute = createRoute({
  getParentRoute: () => {
    return rootRoute;
  },
  path: '/stacking',
  component: lazyRouteComponent(() => {
    return import('@/pages/stacking');
  }, 'StackingPage'),
});

const imperativeRoute = createRoute({
  getParentRoute: () => {
    return rootRoute;
  },
  path: '/imperative',
  component: lazyRouteComponent(() => {
    return import('@/pages/imperative');
  }, 'ImperativePage'),
});

const interopRoute = createRoute({
  getParentRoute: () => {
    return rootRoute;
  },
  path: '/interop',
  component: lazyRouteComponent(() => {
    return import('@/pages/interop');
  }, 'InteropPage'),
});

const showcasesRoute = createRoute({
  getParentRoute: () => {
    return rootRoute;
  },
  path: '/showcases',
  component: lazyRouteComponent(() => {
    return import('@/pages/showcases');
  }, 'ShowcasesPage'),
});

const microfrontendsRoute = createRoute({
  getParentRoute: () => {
    return rootRoute;
  },
  path: '/microfrontends',
  component: lazyRouteComponent(() => {
    return import('@/pages/microfrontends');
  }, 'MicrofrontendsPage'),
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

const designSystemRoute = createRoute({
  getParentRoute: () => {
    return rootRoute;
  },
  path: '/design-system',
  component: lazyRouteComponent(() => {
    return import('@/pages/design-system');
  }, 'DesignSystemPage'),
});

const warzoneRoute = createRoute({
  getParentRoute: () => {
    return rootRoute;
  },
  path: '/warzone',
  component: lazyRouteComponent(() => {
    return import('@/pages/warzone');
  }, 'WarzonePage'),
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  gettingStartedRoute,
  dialogActionsRoute,
  apiRoute,
  apiCategoryRoute,
  slideDialogRoute,
  stackingRoute,
  imperativeRoute,
  interopRoute,
  showcasesRoute,
  microfrontendsRoute,
  uiIntegrationsRoute,
  uiTemplatesRoute,
  designSystemRoute,
  storiesRoute,
  warzoneRoute,
]);

// Use hash-based history when built for file:// (VITE_HASH_ROUTER=true)
const history = import.meta.env['VITE_HASH_ROUTER'] === 'true' ? createHashHistory() : undefined;

export const router = createRouter({
  routeTree,
  // Route components are lazy, so without `intent` the chunk's round trip sits between click and
  // first paint; the delay stops a pointer sweeping the sidebar from pulling all twelve.
  defaultPreload: 'intent',
  defaultPreloadDelay: 50,
  // For what preloading cannot cover (keyboard, touch, a cold link), the default is to hold the
  // previous page for a full second with nothing saying the click registered.
  defaultPendingComponent: RoutePending,
  defaultPendingMs: 150,
  ...(history ? { history } : {}),
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
