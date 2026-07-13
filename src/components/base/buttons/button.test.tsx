// @vitest-environment jsdom
/**
 * Pilot Button (CAV-480): the Untitled UI Button, verbatim from the free
 * set, must work as a button AND as a link that navigates through
 * TanStack Router — proving the react-aria RouterProvider wiring, not
 * the component. If the wiring seam breaks, every Untitled UI href in
 * the coming conversion degrades to a full-page load.
 */
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { UntitledUiRouterProvider } from '@/components/untitled-ui/router-provider'
import { Button } from './button'

afterEach(cleanup)

describe('Button (plain button behavior)', () => {
  it('fires onClick and respects isDisabled', () => {
    const onClick = vi.fn()
    render(
      <Button color="primary" size="md" onClick={onClick}>
        Subscribe
      </Button>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Subscribe' }))
    expect(onClick).toHaveBeenCalledTimes(1)

    cleanup()
    const onDisabledClick = vi.fn()
    render(
      <Button color="primary" size="md" isDisabled onClick={onDisabledClick}>
        Subscribe
      </Button>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Subscribe' }))
    expect(onDisabledClick).not.toHaveBeenCalled()
  })
})

describe('Button as link through the router seam', () => {
  function makeRouter() {
    const rootRoute = createRootRoute()
    const indexRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/',
      component: () => (
        <UntitledUiRouterProvider>
          <Button href="/jobs" color="secondary" size="lg">
            Browse jobs
          </Button>
        </UntitledUiRouterProvider>
      ),
    })
    const jobsRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/jobs',
      component: () => <h1>Jobs page</h1>,
    })
    return createRouter({
      routeTree: rootRoute.addChildren([indexRoute, jobsRoute]),
      history: createMemoryHistory({ initialEntries: ['/'] }),
    })
  }

  it('renders href buttons as real anchors (SEO/middle-click semantics)', async () => {
    const router = makeRouter()
    render(<RouterProvider router={router} />)
    const link = await screen.findByRole('link', { name: 'Browse jobs' })
    expect(link.tagName).toBe('A')
    expect(link.getAttribute('href')).toBe('/jobs')
  })

  it('navigates client-side via TanStack Router on click', async () => {
    const router = makeRouter()
    render(<RouterProvider router={router} />)
    fireEvent.click(await screen.findByRole('link', { name: 'Browse jobs' }))
    expect(await screen.findByText('Jobs page')).toBeTruthy()
    expect(router.state.location.pathname).toBe('/jobs')
  })
})
