import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { GoogleApiError, GOOGLE_ERROR_MESSAGES } from '@/lib/google/errors';

/**
 * Uniform JSON envelope for every API route, plus a single place where server
 * errors are translated into customer-safe copy.
 */

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    /** Field-level messages for form validation failures. */
    fields?: Record<string, string>;
  };
}

export function jsonOk<T>(data: T, init?: ResponseInit): NextResponse<T> {
  return NextResponse.json(data, {
    ...init,
    headers: { 'Cache-Control': 'no-store', ...init?.headers },
  });
}

export function jsonError(
  code: string,
  message: string,
  status: number,
  fields?: Record<string, string>,
): NextResponse<ApiErrorBody> {
  return NextResponse.json(
    { error: { code, message, ...(fields ? { fields } : {}) } },
    { status, headers: { 'Cache-Control': 'no-store' } },
  );
}

/** Flattens a ZodError into `{ fieldName: firstMessage }`. */
export function zodFieldErrors(error: ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || 'form';
    if (!fields[key]) fields[key] = issue.message;
  }
  return fields;
}

/**
 * Converts any thrown value into a safe response.
 *
 * Internal messages are logged, never returned: upstream errors can echo the
 * origin address or the API key.
 */
export function handleRouteError(error: unknown, context: string): NextResponse {
  if (error instanceof ZodError) {
    return jsonError(
      'VALIDATION_ERROR',
      'Please correct the highlighted fields and try again.',
      400,
      zodFieldErrors(error),
    );
  }

  if (error instanceof GoogleApiError) {
    console.error(`[${context}] Google error (${error.code}):`, error.message);
    const status =
      error.code === 'ADDRESS_NOT_FOUND'
        ? 422
        : error.code === 'RATE_LIMITED'
          ? 429
          : error.code === 'TIMEOUT'
            ? 504
            : 502;
    return jsonError(error.code, GOOGLE_ERROR_MESSAGES[error.code], status);
  }

  if (error instanceof Error && error.message === 'UNAUTHORIZED') {
    return jsonError('UNAUTHORIZED', 'You must be signed in to do that.', 401);
  }

  console.error(`[${context}] unexpected error:`, error);
  return jsonError(
    'INTERNAL_ERROR',
    'Something went wrong on our end. Please try again in a few minutes.',
    500,
  );
}
