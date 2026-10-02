// PREVIEW ONLY: inlines the distance helpers from the next @cavuno/board
// release so this branch runs on the published SDK. Not for merge.
export type DistanceUnit = 'mi' | 'km';
export const MILES_COUNTRIES = ['US', 'GB', 'LR', 'MM'] as const;
export const COMMUTE_RADIUS_MIN_KM = 1;
export const COMMUTE_RADIUS_MAX_KM = 250;
const KM_PER_MILE = 1.609344;
const isMiles = (cc: string | null | undefined) =>
  typeof cc === 'string' &&
  (MILES_COUNTRIES as readonly string[]).includes(cc.trim().toUpperCase());
export const distanceUnitForCountry = (cc: string | null | undefined): DistanceUnit =>
  isMiles(cc) ? 'mi' : 'km';
export const defaultCommuteRadiusKm = (cc: string | null | undefined): number =>
  isMiles(cc) ? 40 : 50;
export const milesToKm = (mi: number) => mi * KM_PER_MILE;
export const kmToMiles = (km: number) => km / KM_PER_MILE;
export const kmToDistanceUnit = (km: number, unit: DistanceUnit) =>
  unit === 'mi' ? kmToMiles(km) : km;
export const distanceUnitToKm = (v: number, unit: DistanceUnit) =>
  unit === 'mi' ? milesToKm(v) : v;
