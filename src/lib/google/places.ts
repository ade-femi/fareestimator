import 'server-only';
import { getEnv } from '@/lib/env';
import { createSharedCache } from '@/lib/cache';
import { GoogleApiError } from '@/lib/google/errors';

/**
 * Google Places API (New) client.
 *
 * Autocomplete runs through our own backend rather than the Maps JavaScript SDK
 * so the API key is never delivered to the browser. The browser only ever sees
 * a suggestion string and an opaque place id.
 */

const AUTOCOMPLETE_ENDPOINT = 'https://places.googleapis.com/v1/places:autocomplete';
const PLACE_DETAILS_ENDPOINT = 'https://places.googleapis.com/v1/places';
const REQUEST_TIMEOUT_MS = 8_000;

export interface PlaceSuggestion {
  placeId: string;
  /** Full human-readable suggestion, e.g. "12 Main St, Austin, TX 78701, USA". */
  description: string;
  /** The bold part in Google's UI, e.g. "12 Main St". */
  mainText: string;
  /** The remainder, e.g. "Austin, TX 78701, USA". */
  secondaryText: string;
}

export interface PlaceAddress {
  street: string;
  city: string;
  state: string;
  zip: string;
  formattedAddress: string;
}

interface AutocompleteResponse {
  suggestions?: Array<{
    placePrediction?: {
      placeId?: string;
      text?: { text?: string };
      structuredFormat?: {
        mainText?: { text?: string };
        secondaryText?: { text?: string };
      };
    };
  }>;
}

interface AddressComponent {
  longText?: string;
  shortText?: string;
  types?: string[];
}

interface PlaceDetailsResponse {
  formattedAddress?: string;
  addressComponents?: AddressComponent[];
}

/** Identical prefixes are typed constantly; a short TTL cuts most of the cost. */
const suggestionCache = createSharedCache<PlaceSuggestion[]>(
  'places-autocomplete',
  5 * 60 * 1000,
  500,
);
const detailsCache = createSharedCache<PlaceAddress>(
  'places-details',
  60 * 60 * 1000,
  500,
);

async function googleFetch<T>(
  url: string,
  init: RequestInit,
  fieldMask: string,
): Promise<T> {
  const { GOOGLE_MAPS_API_KEY } = getEnv();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
        'X-Goog-FieldMask': fieldMask,
        ...init.headers,
      },
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new GoogleApiError('RATE_LIMITED', 'Places API quota exceeded', 429);
      }
      if (response.status === 401 || response.status === 403) {
        throw new GoogleApiError(
          'CONFIGURATION',
          'Places API rejected the API key',
          response.status,
        );
      }
      if (response.status === 404) {
        throw new GoogleApiError('ADDRESS_NOT_FOUND', 'Place not found', 404);
      }
      throw new GoogleApiError(
        'UPSTREAM',
        `Places API returned status ${response.status}`,
        response.status,
      );
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof GoogleApiError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new GoogleApiError('TIMEOUT', 'Places API request timed out');
    }
    throw new GoogleApiError('UPSTREAM', 'Places API request failed');
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Returns US street-address suggestions for a partial input.
 *
 * `sessionToken` groups keystrokes with the follow-up details call so Google
 * bills the pair once instead of per request.
 */
export async function getPlaceSuggestions(
  input: string,
  sessionToken?: string,
): Promise<PlaceSuggestion[]> {
  const key = input.toLowerCase().trim();
  const cached = suggestionCache.get(key);
  if (cached) return cached;

  const data = await googleFetch<AutocompleteResponse>(
    AUTOCOMPLETE_ENDPOINT,
    {
      method: 'POST',
      body: JSON.stringify({
        input,
        // Street addresses within the United States only.
        includedPrimaryTypes: ['street_address', 'premise', 'subpremise'],
        includedRegionCodes: ['us'],
        languageCode: 'en-US',
        ...(sessionToken ? { sessionToken } : {}),
      }),
    },
    'suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat',
  );

  const suggestions: PlaceSuggestion[] = (data.suggestions ?? [])
    .map((suggestion) => suggestion.placePrediction)
    .filter((prediction): prediction is NonNullable<typeof prediction> =>
      Boolean(prediction?.placeId),
    )
    .map((prediction) => ({
      placeId: prediction.placeId as string,
      description: prediction.text?.text ?? '',
      mainText:
        prediction.structuredFormat?.mainText?.text ?? prediction.text?.text ?? '',
      secondaryText: prediction.structuredFormat?.secondaryText?.text ?? '',
    }));

  suggestionCache.set(key, suggestions);
  return suggestions;
}

function findComponent(
  components: AddressComponent[],
  type: string,
  variant: 'long' | 'short' = 'long',
): string {
  const match = components.find((component) => component.types?.includes(type));
  if (!match) return '';
  return (variant === 'short' ? match.shortText : match.longText) ?? '';
}

/** Expands a place id into the four structured address fields. */
export async function getPlaceAddress(
  placeId: string,
  sessionToken?: string,
): Promise<PlaceAddress> {
  const cached = detailsCache.get(placeId);
  if (cached) return cached;

  const query = sessionToken ? `?sessionToken=${encodeURIComponent(sessionToken)}` : '';

  const data = await googleFetch<PlaceDetailsResponse>(
    `${PLACE_DETAILS_ENDPOINT}/${encodeURIComponent(placeId)}${query}`,
    { method: 'GET' },
    'formattedAddress,addressComponents',
  );

  const components = data.addressComponents ?? [];
  const streetNumber = findComponent(components, 'street_number');
  const route = findComponent(components, 'route');
  const subpremise = findComponent(components, 'subpremise');

  const street = [streetNumber, route].filter(Boolean).join(' ').trim();
  const city =
    findComponent(components, 'locality') ||
    findComponent(components, 'sublocality') ||
    findComponent(components, 'postal_town') ||
    findComponent(components, 'administrative_area_level_3');

  const address: PlaceAddress = {
    street: subpremise ? `${street} #${subpremise}` : street,
    city,
    state: findComponent(components, 'administrative_area_level_1', 'short'),
    zip: findComponent(components, 'postal_code'),
    formattedAddress: data.formattedAddress ?? '',
  };

  detailsCache.set(placeId, address);
  return address;
}
