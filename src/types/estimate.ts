/**
 * The shape of `/api/estimate` responses, shared by the client and the server.
 *
 * Nothing here describes the origin: no address, coordinates, route or map data
 * is part of the contract, by design.
 */
export interface EstimateSuccessResponse {
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
  pricePerMile: number | null;
  feeExplanation: string;
}

export interface EstimateOutsideAreaResponse {
  outsideServiceArea: true;
  message: string;
}

export type EstimateResponse = EstimateSuccessResponse | EstimateOutsideAreaResponse;

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    fields?: Record<string, string>;
  };
}
