/**
 * Travel fee calculation.
 *
 * This module is deliberately pure — no database, no network, no framework
 * imports — so it can be unit tested in isolation and reused by future features
 * (dynamic pricing, seasonal pricing, multiple office locations).
 */

export const METERS_PER_MILE = 1609.344;

export interface PricingRules {
  /** Dollars charged per mile of driving distance. */
  pricePerMile: number;
  /** Floor applied to the calculated fee. Use 0 to disable. */
  minimumFee: number;
  /** Destinations beyond this driving distance are out of the service area. */
  maxRadiusMiles: number;
}

export interface FeeCalculationInput extends PricingRules {
  /** One-way driving distance in miles. */
  distanceMiles: number;
}

export type FeeCalculationResult =
  | {
      outsideServiceArea: true;
      distanceMiles: number;
      travelFee: null;
      minimumFeeApplied: false;
    }
  | {
      outsideServiceArea: false;
      distanceMiles: number;
      travelFee: number;
      minimumFeeApplied: boolean;
    };

/** Rounds to two decimal places, correcting for binary floating point drift. */
export function roundCurrency(value: number): number {
  if (!Number.isFinite(value)) {
    throw new RangeError('Cannot round a non-finite value');
  }
  // Number.EPSILON nudges values such as 1.005 that are stored just below the
  // midpoint, so they round the way a human expects.
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Converts a driving distance in meters to miles, rounded to one decimal. */
export function metersToMiles(meters: number): number {
  if (!Number.isFinite(meters) || meters < 0) {
    throw new RangeError('Distance in meters must be a non-negative number');
  }
  return Math.round((meters / METERS_PER_MILE) * 10) / 10;
}

/**
 * Applies the pricing rules to a driving distance.
 *
 *   fee = distance × pricePerMile, floored at the minimum fee
 *
 * Returns `outsideServiceArea` instead of a fee when the destination is beyond
 * the maximum radius — the caller must not price those requests.
 */
export function calculateTravelFee(input: FeeCalculationInput): FeeCalculationResult {
  const { distanceMiles, pricePerMile, minimumFee, maxRadiusMiles } = input;

  if (!Number.isFinite(distanceMiles) || distanceMiles < 0) {
    throw new RangeError('distanceMiles must be a non-negative number');
  }
  if (!Number.isFinite(pricePerMile) || pricePerMile < 0) {
    throw new RangeError('pricePerMile must be a non-negative number');
  }
  if (!Number.isFinite(minimumFee) || minimumFee < 0) {
    throw new RangeError('minimumFee must be a non-negative number');
  }

  // A max radius of 0 (or a non-finite value) means "no limit".
  const hasRadiusLimit = Number.isFinite(maxRadiusMiles) && maxRadiusMiles > 0;
  if (hasRadiusLimit && distanceMiles > maxRadiusMiles) {
    return {
      outsideServiceArea: true,
      distanceMiles,
      travelFee: null,
      minimumFeeApplied: false,
    };
  }

  const rawFee = roundCurrency(distanceMiles * pricePerMile);
  const minimumFeeApplied = rawFee < minimumFee;
  const travelFee = minimumFeeApplied ? roundCurrency(minimumFee) : rawFee;

  return {
    outsideServiceArea: false,
    distanceMiles,
    travelFee,
    minimumFeeApplied,
  };
}

/** Formats a number of seconds as e.g. "1 hour 2 minutes" or "45 minutes". */
export function formatDuration(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) {
    throw new RangeError('totalSeconds must be a non-negative number');
  }

  const roundedMinutes = Math.round(totalSeconds / 60);
  if (roundedMinutes < 1) return 'Less than a minute';

  const hours = Math.floor(roundedMinutes / 60);
  const minutes = roundedMinutes % 60;

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours} ${hours === 1 ? 'hour' : 'hours'}`);
  if (minutes > 0) parts.push(`${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`);

  return parts.join(' ');
}

/** Formats a dollar amount for display, e.g. 38.88 -> "$38.88". */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

/** Formats a distance for display, e.g. 48.6 -> "48.6 miles". */
export function formatDistance(miles: number): string {
  const rounded = Math.round(miles * 10) / 10;
  return `${rounded.toFixed(1)} ${rounded === 1 ? 'mile' : 'miles'}`;
}
