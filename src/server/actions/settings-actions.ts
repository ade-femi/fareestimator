'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/auth';
import { prisma } from '@/lib/prisma';
import { settingsSchema } from '@/lib/validation';
import { SETTINGS_ID, invalidateSettingsCache } from '@/lib/settings';
import { clearRouteCache } from '@/lib/google/routes';
import type { ActionState } from '@/server/actions/auth-actions';

/**
 * Persists the business settings.
 *
 * Authorisation is re-checked here rather than relying on middleware alone:
 * a server action is a public HTTP endpoint and must defend itself.
 */
export async function updateSettingsAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, message: 'Your session expired. Please sign in again.' };
  }

  const parsed = settingsSchema.safeParse({
    originAddress: formData.get('originAddress'),
    pricePerMile: formData.get('pricePerMile'),
    minimumFee: formData.get('minimumFee'),
    maxRadiusMiles: formData.get('maxRadiusMiles'),
    feeExplanation: formData.get('feeExplanation'),
    outsideAreaMessage: formData.get('outsideAreaMessage'),
    displayPricePerMile: formData.get('displayPricePerMile') ?? 'false',
    companyName: formData.get('companyName'),
    companyLogo: formData.get('companyLogo') ?? '',
    brandColor: formData.get('brandColor'),
    contactPhone: formData.get('contactPhone') ?? '',
    contactEmail: formData.get('contactEmail') ?? '',
  });

  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join('.');
      if (key && !fields[key]) fields[key] = issue.message;
    }
    return { ok: false, message: 'Please correct the highlighted fields.', fields };
  }

  const previous = await prisma.settings.findUnique({
    where: { id: SETTINGS_ID },
    select: { originAddress: true },
  });

  try {
    await prisma.settings.upsert({
      where: { id: SETTINGS_ID },
      create: { id: SETTINGS_ID, ...parsed.data },
      update: parsed.data,
    });
  } catch (error) {
    console.error('[settings] save failed', error);
    return { ok: false, message: 'We could not save your settings. Please try again.' };
  }

  invalidateSettingsCache();

  // Cached routes were computed from the old origin, so they are now wrong.
  if (previous && previous.originAddress !== parsed.data.originAddress) {
    clearRouteCache();
  }

  revalidatePath('/');
  revalidatePath('/admin/settings');

  return { ok: true, message: 'Settings saved.' };
}
