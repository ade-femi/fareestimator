import type { NextRequest } from 'next/server';
import { destinationSchema } from '@/lib/validation';
import { createEstimate } from '@/server/services/estimate-service';
import { getClientIp, rateLimit } from '@/lib/rate-limit';
import { handleRouteError, jsonError, jsonOk } from '@/lib/api-response';

/**
 * POST /api/estimate
 *
 * Body:   { street, city, state, zip }
 * Returns: distance, drive time, travel fee and the explanation note — or the
 *          out-of-area message. Nothing about the origin is ever included.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 4_096;

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request.headers);
    const limit = rateLimit(`estimate:${ip}`);

    if (!limit.success) {
      return jsonError(
        'RATE_LIMITED',
        'Too many estimates from this connection. Please wait a moment and try again.',
        429,
        undefined,
      );
    }

    const contentLength = Number(request.headers.get('content-length') ?? 0);
    if (contentLength > MAX_BODY_BYTES) {
      return jsonError('PAYLOAD_TOO_LARGE', 'That request was too large.', 413);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonError('INVALID_JSON', 'We could not read that request.', 400);
    }

    const destination = destinationSchema.parse(body);
    const estimate = await createEstimate(destination);

    return jsonOk(estimate);
  } catch (error) {
    return handleRouteError(error, 'api/estimate');
  }
}
