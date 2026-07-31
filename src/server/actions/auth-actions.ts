'use server';

import { AuthError } from 'next-auth';
import { signIn, signOut } from '@/auth';
import { loginSchema } from '@/lib/validation';
import { getClientIp, rateLimit } from '@/lib/rate-limit';
import { headers } from 'next/headers';

export interface ActionState {
  ok: boolean;
  message?: string;
  fields?: Record<string, string>;
}

/**
 * Signs an administrator in.
 *
 * Failures return the same generic message whether the email is unknown or the
 * password is wrong, so the form cannot be used to enumerate accounts.
 */
export async function loginAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const requestHeaders = await headers();
  const ip = getClientIp(requestHeaders);

  // Brute-force protection: far stricter than the public endpoints.
  const limit = rateLimit(`login:${ip}`, { limit: 5, windowSeconds: 300 });
  if (!limit.success) {
    return {
      ok: false,
      message: `Too many sign-in attempts. Please try again in ${Math.ceil(limit.retryAfter / 60)} minute(s).`,
    };
  }

  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join('.');
      if (key && !fields[key]) fields[key] = issue.message;
    }
    return { ok: false, message: 'Please check your details.', fields };
  }

  try {
    await signIn('credentials', {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: '/admin',
    });
    return { ok: true };
  } catch (error) {
    // next/navigation signals a successful redirect by throwing; re-throw it.
    if (error instanceof AuthError) {
      return { ok: false, message: 'Invalid email or password.' };
    }
    throw error;
  }
}

export async function logoutAction(): Promise<void> {
  await signOut({ redirectTo: '/admin/login' });
}
