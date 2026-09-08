import 'server-only';
import type { Settings } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { createSharedCache } from '@/lib/cache';

export const SETTINGS_ID = 'singleton';

/**
 * Settings safe to send to the browser.
 *
 * `originAddress` is intentionally absent from this type — that omission is the
 * mechanism that keeps the business address private. Public code paths accept
 * only `PublicSettings`, so leaking the origin would be a type error.
 */
export interface PublicSettings {
  companyName: string;
  companyLogo: string | null;
  brandColor: string;
  contactPhone: string | null;
  contactEmail: string | null;
  feeExplanation: string;
  outsideAreaMessage: string;
  /** Only present when the admin has enabled "Display price per mile". */
  pricePerMile: number | null;
}

const DEFAULT_FEE_EXPLANATION =
  'Travel fees help cover fuel, travel time, vehicle wear, and transportation expenses required to provide services at your location.';

const DEFAULT_OUTSIDE_AREA_MESSAGE =
  "We're sorry, this destination is currently outside our normal service area. Please contact us directly to discuss your project.";

/** Short TTL: admin edits appear almost immediately without hammering the DB. */
const settingsCache = createSharedCache<Settings>('settings', 30_000, 1);

/**
 * Loads the singleton settings row, creating it from environment seed values on
 * first run so a fresh deployment is never broken by a missing row.
 *
 * Server-side only. Never return this object to a client component.
 */
export async function getSettings(): Promise<Settings> {
  const cached = settingsCache.get(SETTINGS_ID);
  if (cached) return cached;

  const existing = await prisma.settings.findUnique({ where: { id: SETTINGS_ID } });
  if (existing) {
    settingsCache.set(SETTINGS_ID, existing);
    return existing;
  }

  const created = await prisma.settings.create({
    data: {
      id: SETTINGS_ID,
      originAddress: process.env.SEED_ORIGIN_ADDRESS ?? '',
      pricePerMile: Number(process.env.SEED_PRICE_PER_MILE ?? 3),
      minimumFee: Number(process.env.SEED_MINIMUM_FEE ?? 30),
      maxRadiusMiles: Number(process.env.SEED_MAX_RADIUS_MILES ?? 100),
      feeExplanation: DEFAULT_FEE_EXPLANATION,
      outsideAreaMessage: DEFAULT_OUTSIDE_AREA_MESSAGE,
    },
  });

  settingsCache.set(SETTINGS_ID, created);
  return created;
}

/** Invalidates the cache after an admin save. */
export function invalidateSettingsCache(): void {
  settingsCache.delete(SETTINGS_ID);
}

/** Projects the full settings row down to the fields the browser may see. */
export function toPublicSettings(settings: Settings): PublicSettings {
  return {
    companyName: settings.companyName,
    companyLogo: settings.companyLogo,
    brandColor: settings.brandColor,
    contactPhone: settings.contactPhone,
    contactEmail: settings.contactEmail,
    feeExplanation: settings.feeExplanation,
    outsideAreaMessage: settings.outsideAreaMessage,
    pricePerMile: settings.displayPricePerMile ? settings.pricePerMile : null,
  };
}

/** Convenience helper for server components that only need public branding. */
export async function getPublicSettings(): Promise<PublicSettings> {
  return toPublicSettings(await getSettings());
}

/** Branding shown when the database is unreachable (e.g. during a CI build). */
const FALLBACK_PUBLIC_SETTINGS: PublicSettings = {
  companyName: 'Travel Fee Estimator',
  companyLogo: null,
  brandColor: '#0f172a',
  contactPhone: null,
  contactEmail: null,
  feeExplanation: DEFAULT_FEE_EXPLANATION,
  outsideAreaMessage: DEFAULT_OUTSIDE_AREA_MESSAGE,
  pricePerMile: null,
};

/**
 * Non-throwing variant for pages that are pre-rendered at build time, where the
 * database may not be reachable. The page still renders; the estimate API —
 * which does need the database — reports the failure properly.
 */
export async function getPublicSettingsSafe(): Promise<PublicSettings> {
  try {
    return await getPublicSettings();
  } catch (error) {
    console.error('[settings] falling back to defaults:', error);
    return FALLBACK_PUBLIC_SETTINGS;
  }
}
