// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from './card'

afterEach(cleanup)

describe('official Rhea Card source', () => {
  it('owns the complete public API and small spacing variant', () => {
    const { container } = render(
      <Card size="sm">
        <CardHeader>
          <CardTitle>Starter title</CardTitle>
          <CardDescription>Starter description</CardDescription>
          <CardAction>Action</CardAction>
        </CardHeader>
        <CardContent>Content</CardContent>
        <CardFooter>Footer</CardFooter>
      </Card>,
    )

    expect(container.querySelector('[data-slot="card"]')).toHaveAttribute(
      'data-size',
      'sm',
    )
    for (const slot of [
      'card-header',
      'card-title',
      'card-description',
      'card-action',
      'card-content',
      'card-footer',
    ]) {
      expect(container.querySelector(`[data-slot="${slot}"]`)).not.toBeNull()
    }
    expect(screen.getByText('Starter title')).toBeInTheDocument()
  })

  it('carries the official Rhea spacing and media contracts', () => {
    const source = readFileSync(join(import.meta.dirname, 'card.tsx'), 'utf8')
    expect(source).toContain('gap-(--card-spacing)')
    expect(source).toContain('[--card-spacing:--spacing(5)]')
    expect(source).toContain('data-[size=sm]:[--card-spacing:--spacing(4)]')
    expect(source).toContain('has-[>img:first-child]:pt-0')
    expect(source).toContain('has-data-[slot=card-action]')
  })
})
