import 'server-only';
import { getSettings } from '@/lib/settings';
import { computeDrivingRoute } from '@/lib/google/routes';
import { calculateTravelFee, formatDuration } from '@/lib/fee';
import { formatDestination, type DestinationInput } from '@/lib/validation';

/**
 * Orchestrates a single estimate.
 *
 * This is the only place the origin address is read, and it never appears in
 * the returned payload. Estimates are calculated and returned but never
 * persisted — no record of a customer's destination is kept anywhere.
 *
 * Route lookup and pricing are separate collaborators, so future features
 * (multiple offices, seasonal pricing) can swap one piece without touching the
 * others.
 */

export interface EstimateSuccess {
  outsideServiceArea: false;
  distanceMiles: number;
  distanceText: string;
  durationSeconds: number;
  durationText: string;
  travelFee: number;
  minimumFeeApplied: boolean;
  /** Present only when the admin enabled "Display price per mile". */
  pricePerMile: number | null;
  feeExplanation: string;
}

export interface EstimateOutsideArea {
  outsideServiceArea: true;
  message: string;
}

export type EstimateResult = EstimateSuccess | EstimateOutsideArea;

export async function createEstimate(
  destination: DestinationInput,
): Promise<EstimateResult> {
  const settings = await getSettings();
  const destinationAddress = formatDestination(destination);

  // The origin lives here and goes no further than the Google request.
  const route = await computeDrivingRoute(settings.originAddress, destinationAddress);

  const calculation = calculateTravelFee({
    distanceMiles: route.distanceMiles,
    pricePerMile: settings.pricePerMile,
    minimumFee: settings.minimumFee,
    maxRadiusMiles: settings.maxRadiusMiles,
  });

  if (calculation.outsideServiceArea) {
    return {
      outsideServiceArea: true,
      message: settings.outsideAreaMessage,
    };
  }

  return {
    outsideServiceArea: false,
    distanceMiles: calculation.distanceMiles,
    distanceText: `${calculation.distanceMiles.toFixed(1)} miles`,
    durationSeconds: route.durationSeconds,
    durationText: formatDuration(route.durationSeconds),
    travelFee: calculation.travelFee,
    minimumFeeApplied: calculation.minimumFeeApplied,
    pricePerMile: settings.displayPricePerMile ? settings.pricePerMile : null,
    feeExplanation: settings.feeExplanation,
  };
}
