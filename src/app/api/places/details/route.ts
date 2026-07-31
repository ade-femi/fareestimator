import type { NextRequest } from 'next/server';
import { placeDetailsSchema } from '@/lib/validation';
import { getPlaceAddress } from '@/lib/google/places';
import { getClientIp, rateLimit } from '@/lib/rate-limit';
import { handleRouteError, jsonError, jsonOk } from '@/lib/api-response';

/**
 * GET /api/places/details?placeId=...&sessionToken=...
 *
 * Expands a selected suggestion into street / city / state / ZIP so the form
 * fills itself. Returns address text only — no coordinates, no geometry.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const ip = getClientIp(request.headers);
    const limit = rateLimit(`places-details:${ip}`, { limit: 30, windowSeconds: 60 });

    if (!limit.success) {
      return jsonError('RATE_LIMITED', 'Please slow down and try again shortly.', 429);
    }

    const { searchParams } = new URL(request.url);
    const { placeId, sessionToken } = placeDetailsSchema.parse({
      placeId: searchParams.get('placeId') ?? '',
      sessionToken: searchParams.get('sessionToken') ?? undefined,
    });

    const address = await getPlaceAddress(placeId, sessionToken);
    return jsonOk({ address });
  } catch (error) {
    return handleRouteError(error, 'api/places/details');
  }
}
