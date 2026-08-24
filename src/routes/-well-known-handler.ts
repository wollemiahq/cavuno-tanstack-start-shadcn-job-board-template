import {
  createWellKnownHandler,
  routeEntriesFromTanStackRouteTree,
  type TanStackRouteNode,
} from '@cavuno/board/well-known';

export function createWellKnownRouteHandler(
  getRouteTree: () => TanStackRouteNode,
) {
  return createWellKnownHandler({
    routes: async () => routeEntriesFromTanStackRouteTree(getRouteTree()),
  });
}
