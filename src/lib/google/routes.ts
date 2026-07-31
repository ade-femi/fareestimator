import 'server-only';
import { getEnv } from '@/lib/env';
import { createSharedCache } from '@/lib/cache';
import { GoogleApiError } from '@/lib/google/errors';
import { metersToMiles } from '@/lib/fee';

/**
 * Google Routes API client.
 *
 * Used ONLY to obtain driving distance and duration, for a route that avoids
 * tolls where one exists. The app never loads the Maps JavaScript SDK, never
 * renders a map, and never returns coordinates or route geometry to the
 * browser.
 */

const ROUTES_ENDPOINT = 'https://routes.googleapis.com/directions/v2:computeRoutes';

/** Only the two fields we need — a narrow field mask also lowers the bill. */
const FIELD_MASK = 'routes.distanceMeters,routes.duration';

const REQUEST_TIMEOUT_MS = 10_000;

/**
 * Ask Google for a toll-free route.
 *
 * This is a *preference*, not a guarantee: where no toll-free path exists (a
 * tolled bridge or tunnel is the only crossing), Google still returns the best
 * route it can rather than failing. Avoiding tolls can also make a trip longer,
 * which raises the distance-based fee and can push a borderline destination
 * outside the service radius.
 *
 * Promote this to a Settings column if the business ever needs it per-region;
 * the cache key below already accounts for the flag.
 */
const AVOID_TOLLS = true;

export interface RouteResult {
  distanceMeters: number;
  distanceMiles: number;
  durationSeconds: number;
}

interface ComputeRoutesResponse {
  routes?: Array<{ distanceMeters?: number; duration?: string }>;
  error?: { code?: number; message?: string; status?: string };
}

/**
 * Repeat lookups for the same destination are common (a customer re-submitting,
 * or several customers on the same street). One hour is short enough that road
 * network changes are picked up and long enough to cut most duplicate calls.
 */
const routeCache = createSharedCache<RouteResult>('routes', 60 * 60 * 1000, 1000);

const cacheKey = (origin: string, destination: string) =>
  // The routing preference is part of the key so a change to AVOID_TOLLS can
  // never be served a distance computed under the old preference.
  `${origin.toLowerCase().trim()}|${destination.toLowerCase().trim()}|tolls:${AVOID_TOLLS ? 'avoid' : 'allow'}`;

/** Parses the protobuf duration string ("3742s") into seconds. */
function parseDuration(duration: string | undefined): number {
  if (!duration) return 0;
  const seconds = Number.parseFloat(duration.replace(/s$/, ''));
  return Number.isFinite(seconds) ? Math.round(seconds) : 0;
}

/**
 * Computes the driving distance and duration between two addresses.
 *
 * @param origin      The private business address. Never logged, never returned.
 * @param destination The customer's destination address.
 */
export async function computeDrivingRoute(
  origin: string,
  destination: string,
): Promise<RouteResult> {
  if (!origin.trim()) {
    throw new GoogleApiError(
      'CONFIGURATION',
      'Origin address is not configured in settings',
    );
  }

  const key = cacheKey(origin, destination);
  const cached = routeCache.get(key);
  if (cached) return cached;

  const { GOOGLE_MAPS_API_KEY } = getEnv();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(ROUTES_ENDPOINT, {
      method: 'POST',
      signal: controller.signal,
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
        'X-Goog-FieldMask': FIELD_MASK,
      },
      body: JSON.stringify({
        origin: { address: origin },
        destination: { address: destination },
        travelMode: 'DRIVE',
        // TRAFFIC_UNAWARE keeps the request on the cheaper "Routes: Compute
        // Routes Basic" SKU; travel fees are distance-based, so live traffic
        // would only add cost and non-determinism.
        routingPreference: 'TRAFFIC_UNAWARE',
        routeModifiers: {
          avoidTolls: AVOID_TOLLS,
        },
        units: 'IMPERIAL',
        languageCode: 'en-US',
        regionCode: 'US',
      }),
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new GoogleApiError('TIMEOUT', 'Routes API request timed out');
    }
    throw new GoogleApiError('UPSTREAM', 'Routes API request failed');
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    if (response.status === 429) {
      throw new GoogleApiError('RATE_LIMITED', 'Routes API quota exceeded', 429);
    }
    if (response.status === 403 || response.status === 401) {
      throw new GoogleApiError(
        'CONFIGURATION',
        'Routes API rejected the API key (check key restrictions and enabled APIs)',
        response.status,
      );
    }
    if (response.status === 400) {
      // A 400 is usually an address Google could not geocode, but an invalid or
      // unauthorised key also lands here. Inspect the body so the operator sees
      // a configuration error instead of blaming the customer's address.
      const detail = await response.text().catch(() => '');
      const isKeyProblem = /API_KEY|api key|PERMISSION_DENIED|not authorized/i.test(
        detail,
      );

      throw new GoogleApiError(
        isKeyProblem ? 'CONFIGURATION' : 'ADDRESS_NOT_FOUND',
        isKeyProblem
          ? 'Routes API rejected the request (check the API key and that the Routes API is enabled)'
          : 'Routes API could not resolve one of the addresses',
        400,
      );
    }
    throw new GoogleApiError(
      'UPSTREAM',
      `Routes API returned status ${response.status}`,
      response.status,
    );
  }

  const data = (await response.json()) as ComputeRoutesResponse;
  // `computeAlternativeRoutes` is left off, so Google returns exactly one route:
  // its recommended route under the preferences above (driving, toll-avoiding).
  const route = data.routes?.[0];

  if (!route || typeof route.distanceMeters !== 'number') {
    // An empty `routes` array means no drivable path (e.g. across an ocean).
    throw new GoogleApiError('NO_ROUTE', 'Routes API returned no drivable route');
  }

  const result: RouteResult = {
    distanceMeters: route.distanceMeters,
    distanceMiles: metersToMiles(route.distanceMeters),
    durationSeconds: parseDuration(route.duration),
  };

  routeCache.set(key, result);
  return result;
}

/** Clears cached routes — call after the origin address changes. */
export function clearRouteCache(): void {
  routeCache.clear();
}
