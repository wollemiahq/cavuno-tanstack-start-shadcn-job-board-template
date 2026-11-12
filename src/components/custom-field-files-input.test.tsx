// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { useState } from 'react';

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  CustomFieldFilesInput,
  GALLERY_MAX_IMAGES,
  type CustomFieldUploadResult,
  type CustomFieldUploads,
} from './custom-field-files-input';

import { m } from '@/paraglide/messages';
import type { ProfileFieldMedia } from '@cavuno/board';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function media(id: string): ProfileFieldMedia {
  return {
    id,
    name: `${id}.png`,
    contentType: 'image/png',
    sizeBytes: 2048,
    url: `https://files.test/${id}`,
  };
}

/** Holds the field value the way a form does and reports every change. */
function Harness({
  type,
  initial,
  uploads,
  onChange,
}: {
  type: 'image_gallery' | 'file';
  initial: string[] | string;
  uploads: CustomFieldUploads;
  onChange: (value: string[] | string) => void;
}) {
  const [value, setValue] = useState<string[] | string>(initial);
  return (
    <CustomFieldFilesInput
      id="custom-field-portfolio"
      fieldKey="portfolio"
      label="Portfolio"
      type={type}
      value={value}
      uploads={uploads}
      onChange={(next) => {
        setValue(next);
        onChange(next);
      }}
    />
  );
}

function pick(files: File[]) {
  const input = document.querySelector<HTMLInputElement>('input[type=file]')!;
  fireEvent.change(input, { target: { files } });
}

const png = (name: string) => new File(['x'], name, { type: 'image/png' });

/**
 * jsdom lays nothing out, so a keyboard drag has no neighbour to move to.
 * Place each gallery tile 100px right of the one before it.
 */
/** One key press, then let dnd-kit measure and re-render before the next. */
async function press(element: HTMLElement, code: string) {
  await act(async () => {
    fireEvent.keyDown(element, { code });
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

function layOutTilesInARow() {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
    function (this: HTMLElement) {
      const tile = this.closest('li');
      const index = tile
        ? Array.from(tile.parentElement!.children).indexOf(tile)
        : 0;
      const left = index * 100;
      return DOMRect.fromRect({ x: left, y: 0, width: 96, height: 96 });
    },
  );
}

describe('CustomFieldFilesInput — gallery', () => {
  it('uploads picked images in order and appends their IDs to the saved ones', async () => {
    let next = 0;
    const upload = vi.fn(
      async (
        _fieldKey: string,
        _file: File,
      ): Promise<CustomFieldUploadResult> => ({
        ok: true,
        data: media(`draft${++next}`),
      }),
    );
    const onChange = vi.fn();
    render(
      <Harness
        type="image_gallery"
        initial={['saved']}
        uploads={{ upload, media: { portfolio: [media('saved')] } }}
        onChange={onChange}
      />,
    );

    pick([png('a.png'), png('b.png')]);

    await waitFor(() =>
      expect(onChange).toHaveBeenLastCalledWith(['saved', 'draft1', 'draft2']),
    );
    expect(upload).toHaveBeenCalledTimes(2);
    expect(upload.mock.calls[0]?.[0]).toBe('portfolio');
    expect(screen.getAllByRole('img')).toHaveLength(3);
  });

  it('reorders an image by keyboard drag and removes one with its button', async () => {
    layOutTilesInARow();
    const onChange = vi.fn();
    render(
      <Harness
        type="image_gallery"
        initial={['one', 'two', 'three']}
        uploads={{
          upload: vi.fn(),
          media: { portfolio: [media('one'), media('two'), media('three')] },
        }}
        onChange={onChange}
      />,
    );

    // Pick up the first image, move it one place right, drop it.
    const first = screen.getByRole('button', {
      name: m.customFieldDisplay_galleryImagePosition({
        position: 1,
        total: 3,
      }),
    });
    first.focus();
    await press(first, 'Space');
    await press(first, 'ArrowRight');
    await press(first, 'Space');
    await waitFor(() =>
      expect(onChange).toHaveBeenLastCalledWith(['two', 'one', 'three']),
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: m.customFieldUpload_removeImageLabel({ position: 3, total: 3 }),
      }),
    );
    expect(onChange).toHaveBeenLastCalledWith(['two', 'one']);
  });

  it('keeps the order when a keyboard drag is cancelled', async () => {
    layOutTilesInARow();
    const onChange = vi.fn();
    render(
      <Harness
        type="image_gallery"
        initial={['one', 'two']}
        uploads={{
          upload: vi.fn(),
          media: { portfolio: [media('one'), media('two')] },
        }}
        onChange={onChange}
      />,
    );

    const first = screen.getByRole('button', {
      name: m.customFieldDisplay_galleryImagePosition({
        position: 1,
        total: 2,
      }),
    });
    first.focus();
    await press(first, 'Space');
    await press(first, 'ArrowRight');
    await press(first, 'Escape');
    await waitFor(() =>
      expect(
        screen.getAllByRole('img').map((img) => img.getAttribute('src')),
      ).toEqual(['https://files.test/one', 'https://files.test/two']),
    );
    expect(onChange).not.toHaveBeenCalled();
  });

  it(`uploads only up to ${GALLERY_MAX_IMAGES} images and says why`, async () => {
    const saved = Array.from({ length: GALLERY_MAX_IMAGES - 1 }, (_, i) =>
      media(`s${i}`),
    );
    const upload = vi.fn(async (): Promise<CustomFieldUploadResult> => ({
      ok: true,
      data: media('last'),
    }));
    const onChange = vi.fn();
    render(
      <Harness
        type="image_gallery"
        initial={saved.map((file) => file.id)}
        uploads={{ upload, media: { portfolio: saved } }}
        onChange={onChange}
      />,
    );

    pick([png('a.png'), png('b.png')]);

    await waitFor(() => expect(onChange).toHaveBeenCalled());
    expect(upload).toHaveBeenCalledTimes(1);
    expect(onChange.mock.lastCall?.[0]).toHaveLength(GALLERY_MAX_IMAGES);
    expect(
      screen.getByText(
        m.customFieldUpload_galleryLimitError({ max: GALLERY_MAX_IMAGES }),
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: m.customFieldUpload_galleryAddLabel(),
      }),
    ).toBeDisabled();
  });

  it('shows a refused upload inline and keeps the value', async () => {
    const onChange = vi.fn();
    render(
      <Harness
        type="image_gallery"
        initial={[]}
        uploads={{
          upload: async () => ({
            ok: false,
            code: 'media_payload_too_large',
            message: 'too large',
          }),
          media: {},
        }}
        onChange={onChange}
      />,
    );

    pick([png('big.png')]);

    expect(
      await screen.findByText(m.customFieldUpload_tooLargeError()),
    ).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });
  it('recovers from an upload that throws instead of staying stuck', async () => {
    const onChange = vi.fn();
    render(
      <Harness
        type="image_gallery"
        initial={[]}
        uploads={{
          upload: vi.fn(async () => {
            throw new Error('network down');
          }),
          media: {},
        }}
        onChange={onChange}
      />,
    );

    pick([png('a.png')]);

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: m.customFieldUpload_galleryAddLabel(),
      }),
    ).toBeEnabled();
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('CustomFieldFilesInput — file', () => {
  it('stores one ID and clears it on remove', async () => {
    const onChange = vi.fn();
    render(
      <Harness
        type="file"
        initial=""
        uploads={{
          upload: async () => ({ ok: true, data: media('cert') }),
          media: {},
        }}
        onChange={onChange}
      />,
    );

    pick([new File(['x'], 'cert.pdf', { type: 'application/pdf' })]);
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith('cert'));
    expect(screen.getByRole('link', { name: 'cert.png' })).toHaveAttribute(
      'href',
      'https://files.test/cert',
    );

    fireEvent.click(
      screen.getByRole('button', { name: m.customFieldUpload_removeLabel() }),
    );
    expect(onChange).toHaveBeenLastCalledWith('');
    expect(
      screen.getByRole('button', { name: m.customFieldUpload_fileAddLabel() }),
    ).toBeInTheDocument();
  });
});
