// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { m } from '../paraglide/messages';
import {
  CustomFieldFacts,
  CustomFieldGallery,
  CustomFieldValue,
} from './custom-field-display';

afterEach(cleanup);

const images = Array.from({ length: 8 }, (_, index) => ({
  id: `img_${index + 1}`,
  url: `https://files.example/${index + 1}.jpg`,
  name: `photo-${index + 1}.jpg`,
}));

describe('CustomFieldValue', () => {
  it('renders rich text formatted, not as visible tags', () => {
    const { container } = render(
      <CustomFieldValue
        value={{
          kind: 'html',
          html: '<p>Hand-cut <strong>stairs</strong></p>',
        }}
      />,
    );
    expect(container.querySelector('strong')).toHaveTextContent('stairs');
    expect(container).not.toHaveTextContent('<strong>');
  });

  it('renders one chip per option label', () => {
    render(
      <CustomFieldValue
        value={{ kind: 'chips', items: ['Staircases', 'Cabinetry'] }}
      />,
    );
    expect(screen.getByText('Staircases')).toBeVisible();
    expect(screen.getByText('Cabinetry')).toBeVisible();
  });

  it('opens an external URL in a new tab without passing the referrer chain', () => {
    render(
      <CustomFieldValue
        value={{
          kind: 'link',
          href: 'https://okafor.example/',
          text: 'okafor.example',
          external: true,
        }}
      />,
    );
    const link = screen.getByRole('link', { name: 'okafor.example' });
    expect(link).toHaveAttribute('href', 'https://okafor.example/');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener nofollow');
  });
});

describe('CustomFieldFacts', () => {
  it('renders nothing without entries', () => {
    const { container } = render(<CustomFieldFacts entries={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('CustomFieldGallery', () => {
  it('shows every image of a short gallery, in stored order', () => {
    render(<CustomFieldGallery images={images.slice(0, 3).reverse()} />);
    const tiles = screen.getAllByRole('button');
    expect(tiles).toHaveLength(3);
    expect(tiles[0]!.querySelector('img')).toHaveAttribute(
      'src',
      'https://files.example/3.jpg',
    );
    expect(
      screen.queryByText(m.customFieldDisplay_galleryViewAll({ count: '3' })),
    ).toBeNull();
  });

  it('shows 6 tiles of 8, the last as View all, and the larger view steps through all 8', async () => {
    render(<CustomFieldGallery images={images} />);

    const tiles = screen.getAllByRole('button');
    expect(tiles).toHaveLength(6);
    const viewAll = screen.getByRole('button', {
      name: m.customFieldDisplay_galleryViewAll({ count: '8' }),
    });
    expect(viewAll).toBe(tiles[5]);

    fireEvent.click(
      screen.getByRole('button', {
        name: m.customFieldDisplay_galleryOpenImage({
          position: '2',
          total: '8',
        }),
      }),
    );
    const dialog = await screen.findByRole('dialog');
    const shown = () => within(dialog).getByRole('img').getAttribute('src');
    expect(shown()).toBe('https://files.example/2.jpg');

    const next = within(dialog).getByRole('button', {
      name: m.customFieldDisplay_galleryNext(),
    });
    for (let step = 0; step < 6; step += 1) fireEvent.click(next);
    expect(shown()).toBe('https://files.example/8.jpg');
    expect(dialog).toHaveTextContent(
      m.customFieldDisplay_galleryImagePosition({ position: '8', total: '8' }),
    );

    // Past the last image it wraps to the first.
    fireEvent.click(next);
    expect(shown()).toBe('https://files.example/1.jpg');
    fireEvent.keyDown(next, { key: 'ArrowLeft' });
    expect(shown()).toBe('https://files.example/8.jpg');
  });
});
