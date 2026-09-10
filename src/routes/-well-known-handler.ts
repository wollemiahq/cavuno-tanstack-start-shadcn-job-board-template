import {
  createWellKnownHandler,
  routeEntriesFromTanStackRouteTree,
  type TanStackRouteNode,
} from '@cavuno/board/well-known';

export function createWellKnownRouteHandler(
  getRouteTree: () => TanStackRouteNode | Promise<TanStackRouteNode>,
  impressumEnabled: () => boolean | Promise<boolean> = () => true,
) {
  return createWellKnownHandler({
    routes: async () => {
      const routes = routeEntriesFromTanStackRouteTree(await getRouteTree());
      return (await impressumEnabled())
        ? routes
        : routes.filter((route) => route.template !== '/impressum');
    },
  });
}
