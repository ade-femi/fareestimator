import { describe, expect, it } from 'vitest';
import {
  calculateTravelFee,
  formatCurrency,
  formatDistance,
  formatDuration,
  metersToMiles,
  roundCurrency,
} from '@/lib/fee';

const rules = {
  pricePerMile: 0.8,
  minimumFee: 0,
  maxRadiusMiles: 100,
};

describe('roundCurrency', () => {
  it('rounds to two decimal places', () => {
    expect(roundCurrency(38.8845)).toBe(38.88);
    expect(roundCurrency(38.885)).toBe(38.89);
    expect(roundCurrency(10)).toBe(10);
  });

  it('handles the classic floating point midpoint case', () => {
    // 1.005 is stored as 1.00499999999999989, which naive rounding sends to 1.00.
    expect(roundCurrency(1.005)).toBe(1.01);
  });

  it('rejects non-finite input', () => {
    expect(() => roundCurrency(Number.NaN)).toThrow(RangeError);
    expect(() => roundCurrency(Number.POSITIVE_INFINITY)).toThrow(RangeError);
  });
});

describe('metersToMiles', () => {
  it('converts using the international mile', () => {
    expect(metersToMiles(1609.344)).toBe(1);
    expect(metersToMiles(78_218)).toBe(48.6);
    expect(metersToMiles(0)).toBe(0);
  });

  it('rejects negative distances', () => {
    expect(() => metersToMiles(-1)).toThrow(RangeError);
  });
});

describe('calculateTravelFee', () => {
  it('multiplies distance by the per-mile rate', () => {
    const result = calculateTravelFee({ ...rules, distanceMiles: 48.6 });

    expect(result.outsideServiceArea).toBe(false);
    expect(result.travelFee).toBe(38.88);
    expect(result.minimumFeeApplied).toBe(false);
  });

  it('rounds the fee to two decimal places', () => {
    const result = calculateTravelFee({
      ...rules,
      distanceMiles: 33.3,
      pricePerMile: 0.775,
    });

    // 33.3 × 0.775 = 25.8075
    expect(result.travelFee).toBe(25.81);
  });

  it('charges the $30 base minimum when the distance-based fee is lower', () => {
    // 12 miles × $0.80 = $9.60, which is below the $30 floor.
    const result = calculateTravelFee({
      ...rules,
      distanceMiles: 12,
      minimumFee: 30,
    });

    expect(result.travelFee).toBe(30);
    expect(result.minimumFeeApplied).toBe(true);
  });

  it('applies the minimum fee when the calculated fee is lower', () => {
    const result = calculateTravelFee({
      ...rules,
      distanceMiles: 5,
      minimumFee: 25,
    });

    expect(result.travelFee).toBe(25);
    expect(result.minimumFeeApplied).toBe(true);
  });

  it('does not apply the minimum fee when the calculated fee is higher', () => {
    const result = calculateTravelFee({
      ...rules,
      distanceMiles: 60,
      minimumFee: 25,
    });

    expect(result.travelFee).toBe(48);
    expect(result.minimumFeeApplied).toBe(false);
  });

  it('treats a fee exactly equal to the minimum as not floored', () => {
    const result = calculateTravelFee({
      ...rules,
      distanceMiles: 25,
      pricePerMile: 1,
      minimumFee: 25,
    });

    expect(result.travelFee).toBe(25);
    expect(result.minimumFeeApplied).toBe(false);
  });

  it('flags destinations beyond the maximum radius and returns no fee', () => {
    const result = calculateTravelFee({ ...rules, distanceMiles: 140 });

    expect(result.outsideServiceArea).toBe(true);
    expect(result.travelFee).toBeNull();
  });

  it('includes a destination exactly at the radius boundary', () => {
    const result = calculateTravelFee({ ...rules, distanceMiles: 100 });

    expect(result.outsideServiceArea).toBe(false);
    expect(result.travelFee).toBe(80);
  });

  it('treats a maximum radius of 0 as no limit', () => {
    const result = calculateTravelFee({
      ...rules,
      distanceMiles: 5_000,
      maxRadiusMiles: 0,
    });

    expect(result.outsideServiceArea).toBe(false);
    expect(result.travelFee).toBe(4_000);
  });

  it('returns zero for a zero-distance trip', () => {
    const result = calculateTravelFee({ ...rules, distanceMiles: 0 });

    expect(result.travelFee).toBe(0);
  });

  it('supports a free-travel configuration', () => {
    const result = calculateTravelFee({
      ...rules,
      distanceMiles: 42,
      pricePerMile: 0,
    });

    expect(result.travelFee).toBe(0);
  });

  it('rejects invalid inputs rather than producing a wrong price', () => {
    expect(() => calculateTravelFee({ ...rules, distanceMiles: -1 })).toThrow(RangeError);
    expect(() =>
      calculateTravelFee({ ...rules, distanceMiles: 10, pricePerMile: -1 }),
    ).toThrow(RangeError);
    expect(() =>
      calculateTravelFee({ ...rules, distanceMiles: 10, minimumFee: -5 }),
    ).toThrow(RangeError);
    expect(() => calculateTravelFee({ ...rules, distanceMiles: Number.NaN })).toThrow(
      RangeError,
    );
  });
});

describe('formatDuration', () => {
  it('formats hours and minutes', () => {
    expect(formatDuration(3_720)).toBe('1 hour 2 minutes');
    expect(formatDuration(7_500)).toBe('2 hours 5 minutes');
  });

  it('omits an empty component', () => {
    expect(formatDuration(2_700)).toBe('45 minutes');
    expect(formatDuration(3_600)).toBe('1 hour');
    expect(formatDuration(60)).toBe('1 minute');
  });

  it('handles very short trips', () => {
    expect(formatDuration(0)).toBe('Less than a minute');
    expect(formatDuration(20)).toBe('Less than a minute');
  });

  it('rejects negative durations', () => {
    expect(() => formatDuration(-1)).toThrow(RangeError);
  });
});

describe('display formatting', () => {
  it('formats currency in USD', () => {
    expect(formatCurrency(38.88)).toBe('$38.88');
    expect(formatCurrency(0)).toBe('$0.00');
  });

  it('formats distance with correct pluralisation', () => {
    expect(formatDistance(48.6)).toBe('48.6 miles');
    expect(formatDistance(1)).toBe('1.0 mile');
  });
});
