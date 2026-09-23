import { describe, expect, it } from 'vitest';

import { buildJobsLocationDirectory } from './jobs-location-directory';

function place(
  id: string,
  name: string,
  jobCount: number,
  parentId: string | null = null,
) {
  return { id, name, jobCount, parentId };
}

describe('buildJobsLocationDirectory', () => {
  it('counts each job once when the API total includes a row at every ancestor', () => {
    const places = [
      place('us', 'United States', 65),
      place('az', 'Arizona', 21, 'us'),
      place('tempe', 'Tempe', 10, 'az'),
      place('va', 'Virginia', 22, 'us'),
      place('richmond', 'Richmond', 11, 'va'),
    ];

    expect(buildJobsLocationDirectory(places, 'en')).toEqual([
      {
        place: place('us', 'United States', 65),
        jobCount: 22,
        children: [
          {
            place: place('az', 'Arizona', 21, 'us'),
            jobCount: 11,
            children: [
              {
                place: place('tempe', 'Tempe', 10, 'az'),
                jobCount: 10,
                children: [],
              },
            ],
          },
          {
            place: place('va', 'Virginia', 22, 'us'),
            jobCount: 11,
            children: [
              {
                place: place('richmond', 'Richmond', 11, 'va'),
                jobCount: 11,
                children: [],
              },
            ],
          },
        ],
      },
    ]);
  });

  it('keeps jobs filed on a city that also has localities', () => {
    const places = [
      place('syd', 'Sydney', 64),
      place('eve', 'Eveleigh', 4, 'syd'),
      place('kur', 'Kurnell', 3, 'syd'),
      place('sur', 'Surry Hills', 1, 'syd'),
      place('roo', 'Rooty Hill', 1, 'syd'),
    ];

    const [sydney] = buildJobsLocationDirectory(places, 'en');
    expect(sydney?.jobCount).toBe(55);
    expect(sydney?.children.map((child) => child.place.name)).toEqual([
      'Eveleigh',
      'Kurnell',
      'Rooty Hill',
      'Surry Hills',
    ]);
    expect(sydney?.children.map((child) => child.jobCount)).toEqual([
      4, 3, 1, 1,
    ]);
  });

  it('keeps a state at its city total when the API rollup is one row short', () => {
    const places = [
      place('az', 'Arizona', 11),
      place('phx', 'Phoenix', 4, 'az'),
      place('sct', 'Scottsdale', 2, 'az'),
    ];

    const [arizona] = buildJobsLocationDirectory(places, 'en');
    expect(arizona?.jobCount).toBe(6);
    expect(arizona?.children.map((child) => child.jobCount)).toEqual([4, 2]);
  });

  it('orders a parent by distinct jobs rather than its rolled-up API total', () => {
    const places = [
      place('big', 'Bigland', 100),
      place('city', 'City', 40, 'big'),
      place('small', 'Smalland', 70),
    ];

    expect(
      buildJobsLocationDirectory(places, 'en').map((node) => [
        node.place.name,
        node.jobCount,
      ]),
    ).toEqual([
      ['Smalland', 70],
      ['Bigland', 60],
    ]);
  });

  it('orders equal counts by place name', () => {
    const places = [
      place('bos', 'Boston', 5),
      place('aus', 'Austin', 5),
      place('zeb', 'Zebra', 9),
    ];

    expect(
      buildJobsLocationDirectory(places, 'en').map((node) => node.place.name),
    ).toEqual(['Zebra', 'Austin', 'Boston']);
  });

  it('keeps a place whose parent is missing from the directory as a root', () => {
    expect(
      buildJobsLocationDirectory(
        [place('tempe', 'Tempe', 10, 'missing')],
        'en',
      ),
    ).toEqual([
      {
        place: place('tempe', 'Tempe', 10, 'missing'),
        jobCount: 10,
        children: [],
      },
    ]);
  });
});
