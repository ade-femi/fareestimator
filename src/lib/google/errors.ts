/**
 * Typed failures from the Google integration.
 *
 * `code` drives the friendly message shown to the customer; `message` is for
 * server logs only and is never sent to the browser verbatim, because upstream
 * error text can contain the origin address or the API key.
 */
export type GoogleErrorCode =
  | 'ADDRESS_NOT_FOUND'
  | 'NO_ROUTE'
  | 'TIMEOUT'
  | 'RATE_LIMITED'
  | 'CONFIGURATION'
  | 'UPSTREAM';

export class GoogleApiError extends Error {
  constructor(
    readonly code: GoogleErrorCode,
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'GoogleApiError';
  }
}

/** Customer-safe copy for each failure mode. */
export const GOOGLE_ERROR_MESSAGES: Record<GoogleErrorCode, string> = {
  ADDRESS_NOT_FOUND:
    "We couldn't find that address. Please check the street, city, state and ZIP code and try again.",
  NO_ROUTE:
    "We couldn't find a driving route to that address. Please confirm the address is reachable by road.",
  TIMEOUT: 'The estimate took too long to calculate. Please try again in a moment.',
  RATE_LIMITED: 'Too many requests right now. Please wait a moment and try again.',
  CONFIGURATION:
    'The estimator is not fully configured yet. Please contact us and we will help you directly.',
  UPSTREAM:
    "We couldn't calculate an estimate right now. Please try again in a few minutes.",
};
