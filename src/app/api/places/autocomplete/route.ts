import type { NextRequest } from 'next/server';
import { placesAutocompleteSchema } from '@/lib/validation';
import { getPlaceSuggestions } from '@/lib/google/places';
import { getClientIp, rateLimit } from '@/lib/rate-limit';
import { handleRouteError, jsonError, jsonOk } from '@/lib/api-response';

/**
 * GET /api/places/autocomplete?input=...&sessionToken=...
 *
 * Server-side proxy for Google Places Autocomplete. Exists so the browser never
 * needs — and never receives — the Google API key.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const ip = getClientIp(request.headers);
    // Typing produces many more requests than estimating, so this endpoint gets
    // its own, larger budget.
    const limit = rateLimit(`places:${ip}`, { limit: 60, windowSeconds: 60 });

    if (!limit.success) {
      return jsonError('RATE_LIMITED', 'Please slow down and try again shortly.', 429);
    }

    const { searchParams } = new URL(request.url);
    const parsed = placesAutocompleteSchema.safeParse({
      input: searchParams.get('input') ?? '',
      sessionToken: searchParams.get('sessionToken') ?? undefined,
    });

    // A too-short query is normal while typing, not an error worth surfacing.
    if (!parsed.success) {
      return jsonOk({ suggestions: [] });
    }

    const suggestions = await getPlaceSuggestions(
      parsed.data.input,
      parsed.data.sessionToken,
    );

    return jsonOk({ suggestions });
  } catch (error) {
    return handleRouteError(error, 'api/places/autocomplete');
  }
}
