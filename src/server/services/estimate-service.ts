import 'server-only';
import { getSettings } from '@/lib/settings';
import { computeDrivingRoute } from '@/lib/google/routes';
import { calculateTravelFee, formatDistance, formatDuration } from '@/lib/fee';
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
  oneWayDistanceMiles: number;
  oneWayDistanceText: string;
  roundTripDistanceMiles: number;
  roundTripDistanceText: string;
  durationSeconds: number;
  durationText: string;
  travelFee: number;
  minimumFee: number;
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

  // Service-area eligibility is based on the one-way distance to the customer,
  // matching how the admin sets the service radius.
  const areaCheck = calculateTravelFee({
    distanceMiles: route.distanceMiles,
    pricePerMile: settings.pricePerMile,
    minimumFee: settings.minimumFee,
    maxRadiusMiles: settings.maxRadiusMiles,
  });

  if (areaCheck.outsideServiceArea) {
    return {
      outsideServiceArea: true,
      message: settings.outsideAreaMessage,
    };
  }

  // The fee is charged on the round trip the technician actually drives
  // (there and back), not just the one-way distance used above.
  const roundTripMiles = Math.round(route.distanceMiles * 2 * 10) / 10;
  const calculation = calculateTravelFee({
    distanceMiles: roundTripMiles,
    pricePerMile: settings.pricePerMile,
    minimumFee: settings.minimumFee,
    // Eligibility was already decided above using the one-way distance.
    maxRadiusMiles: 0,
  });

  if (calculation.outsideServiceArea) {
    // Unreachable: maxRadiusMiles: 0 above disables the radius check. This
    // narrows the type so `travelFee` below is a `number`, not `number | null`.
    throw new Error('Unexpected outsideServiceArea while calculating the fee');
  }

  return {
    outsideServiceArea: false,
    oneWayDistanceMiles: route.distanceMiles,
    oneWayDistanceText: formatDistance(route.distanceMiles),
    roundTripDistanceMiles: calculation.distanceMiles,
    roundTripDistanceText: formatDistance(calculation.distanceMiles),
    durationSeconds: route.durationSeconds,
    durationText: formatDuration(route.durationSeconds),
    travelFee: calculation.travelFee,
    minimumFee: settings.minimumFee,
    minimumFeeApplied: calculation.minimumFeeApplied,
    pricePerMile: settings.displayPricePerMile ? settings.pricePerMile : null,
    feeExplanation: settings.feeExplanation,
  };
}
