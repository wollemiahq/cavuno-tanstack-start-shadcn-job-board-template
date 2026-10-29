// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { ProductCarousel } from './product-carousel';

import { m } from '@/paraglide/messages';

afterEach(cleanup);

const IMAGES = [
  'https://cdn.example/1.png',
  'https://cdn.example/2.png',
  'https://cdn.example/3.png',
];

function thumb(index: number) {
  return screen.getByRole('button', {
    name: m.product_showImageLabel({ index }),
  });
}

describe('ProductCarousel', () => {
  it('moves with the arrow keys while focused, wrapping at the ends', () => {
    render(<ProductCarousel images={IMAGES} />);
    const region = screen.getByRole('region', {
      name: m.product_galleryLabel(),
    });
    expect(thumb(1)).toHaveAttribute('aria-current', 'true');

    region.focus();
    fireEvent.keyDown(region, { key: 'ArrowRight' });
    expect(thumb(2)).toHaveAttribute('aria-current', 'true');
    expect(thumb(1)).not.toHaveAttribute('aria-current');

    fireEvent.keyDown(region, { key: 'ArrowLeft' });
    fireEvent.keyDown(region, { key: 'ArrowLeft' });
    expect(thumb(3)).toHaveAttribute('aria-current', 'true');
    expect(
      screen.getByText(m.product_imagePositionText({ index: 3, count: 3 })),
    ).toBeInTheDocument();
  });

  it('shows the image whose thumbnail is pressed, and steps with the buttons', () => {
    const { container } = render(<ProductCarousel images={IMAGES} />);

    fireEvent.click(thumb(3));
    expect(thumb(3)).toHaveAttribute('aria-current', 'true');
    expect(container.querySelector('img')).toHaveAttribute('src', IMAGES[2]);

    fireEvent.click(
      screen.getByRole('button', { name: m.product_nextImageLabel() }),
    );
    expect(thumb(1)).toHaveAttribute('aria-current', 'true');
    fireEvent.click(
      screen.getByRole('button', { name: m.product_previousImageLabel() }),
    );
    expect(thumb(3)).toHaveAttribute('aria-current', 'true');
  });

  it('keeps the arrows off phones, where the dots are named buttons', () => {
    const { container } = render(<ProductCarousel images={IMAGES} />);

    // Phones (below md) swipe; tablets and desktops get the arrows.
    for (const name of [
      m.product_previousImageLabel(),
      m.product_nextImageLabel(),
    ]) {
      const arrow = screen.getByRole('button', { name });
      expect(arrow).toHaveClass('hidden', 'md:inline-flex');
    }

    const dot = (index: number) =>
      screen.getByRole('button', {
        name: m.product_imagePositionText({ index, count: IMAGES.length }),
      });
    expect(dot(1)).toHaveAttribute('aria-current', 'true');
    expect(dot(1)).not.toHaveClass('hidden');

    fireEvent.click(dot(2));
    expect(dot(2)).toHaveAttribute('aria-current', 'true');
    expect(dot(1)).not.toHaveAttribute('aria-current');
    expect(thumb(2)).toHaveAttribute('aria-current', 'true');
    expect(container.querySelector('img')).toHaveAttribute('src', IMAGES[1]);
  });

  it('renders one image without controls, and nothing without images', () => {
    const { container } = render(<ProductCarousel images={[IMAGES[0]!]} />);
    expect(container.querySelector('img')).toHaveAttribute('src', IMAGES[0]);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    cleanup();

    const empty = render(<ProductCarousel images={[]} />);
    expect(empty.container).toBeEmptyDOMElement();
  });
});
