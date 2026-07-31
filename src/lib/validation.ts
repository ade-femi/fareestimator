import { z } from 'zod';

/**
 * Shared Zod schemas. The same schema validates on the client (React Hook Form)
 * and on the server, so a tampered request is rejected identically.
 */

/** Strips control characters and collapses whitespace. */
const sanitizedString = (max: number) =>
  z
    .string()
    .transform((value) =>
      value
        // Strip ASCII control characters and DEL, then collapse whitespace.
        .replace(/[\u0000-\u001F\u007F]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim(),
    )
    .pipe(z.string().max(max));

export const US_STATES = [
  'AL',
  'AK',
  'AZ',
  'AR',
  'CA',
  'CO',
  'CT',
  'DE',
  'FL',
  'GA',
  'HI',
  'ID',
  'IL',
  'IN',
  'IA',
  'KS',
  'KY',
  'LA',
  'ME',
  'MD',
  'MA',
  'MI',
  'MN',
  'MS',
  'MO',
  'MT',
  'NE',
  'NV',
  'NH',
  'NJ',
  'NM',
  'NY',
  'NC',
  'ND',
  'OH',
  'OK',
  'OR',
  'PA',
  'RI',
  'SC',
  'SD',
  'TN',
  'TX',
  'UT',
  'VT',
  'VA',
  'WA',
  'WV',
  'WI',
  'WY',
  'DC',
] as const;

/** The destination a customer submits. Address components are required. */
export const destinationSchema = z.object({
  street: sanitizedString(200).pipe(z.string().min(3, 'Street address is required')),
  city: sanitizedString(100).pipe(z.string().min(2, 'City is required')),
  state: z
    .string()
    .trim()
    .toUpperCase()
    .refine((value) => (US_STATES as readonly string[]).includes(value), {
      message: 'Enter a valid two-letter US state',
    }),
  zip: z
    .string()
    .trim()
    .regex(/^\d{5}(-\d{4})?$/, 'Enter a valid 5-digit ZIP code'),
});

export type DestinationInput = z.infer<typeof destinationSchema>;

/** Builds the single-line address string sent to Google. */
export function formatDestination(destination: DestinationInput): string {
  return `${destination.street}, ${destination.city}, ${destination.state} ${destination.zip}, USA`;
}

/** Autocomplete queries proxied to Google Places. */
export const placesAutocompleteSchema = z.object({
  input: sanitizedString(200).pipe(z.string().min(3, 'Enter at least 3 characters')),
  sessionToken: z.string().uuid().optional(),
});

/** Place details lookup, used to fill the address fields after a selection. */
export const placeDetailsSchema = z.object({
  placeId: z
    .string()
    .trim()
    .min(1)
    .max(300)
    .regex(/^[A-Za-z0-9_\-]+$/, 'Invalid place identifier'),
  sessionToken: z.string().uuid().optional(),
});

/**
 * Accepts a real boolean (JSON body) or the string a form control submits.
 * `z.coerce.boolean()` is unusable here because it turns "false" into `true`.
 */
const booleanish = z
  .union([z.boolean(), z.enum(['true', 'false', 'on', 'off', '1', '0', ''])])
  .transform((value) =>
    typeof value === 'boolean'
      ? value
      : value === 'true' || value === 'on' || value === '1',
  );

const optionalTrimmed = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value === '' ? null : value))
    .nullable();

/** Admin settings form. Every field is validated server-side before saving. */
export const settingsSchema = z.object({
  originAddress: sanitizedString(300).pipe(
    z.string().min(8, 'Enter the full business origin address'),
  ),
  pricePerMile: z.coerce
    .number()
    .min(0, 'Price per mile cannot be negative')
    .max(1000, 'Price per mile looks too high'),
  minimumFee: z.coerce
    .number()
    .min(0, 'Minimum fee cannot be negative')
    .max(100000, 'Minimum fee looks too high'),
  maxRadiusMiles: z.coerce
    .number()
    .min(0, 'Maximum radius cannot be negative')
    .max(5000, 'Maximum radius looks too high'),
  feeExplanation: sanitizedString(1500).pipe(
    z.string().min(10, 'Explanation is required'),
  ),
  outsideAreaMessage: sanitizedString(1000).pipe(
    z.string().min(10, 'Out-of-area message is required'),
  ),
  displayPricePerMile: booleanish,
  companyName: sanitizedString(120).pipe(z.string().min(1, 'Company name is required')),
  companyLogo: optionalTrimmed(500),
  brandColor: z
    .string()
    .trim()
    .regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Enter a hex colour, e.g. #0F172A'),
  contactPhone: optionalTrimmed(40),
  contactEmail: z
    .string()
    .trim()
    .max(160)
    .transform((value) => (value === '' ? null : value))
    .nullable()
    .refine((value) => value === null || z.string().email().safeParse(value).success, {
      message: 'Enter a valid email address',
    }),
});

export type SettingsInput = z.infer<typeof settingsSchema>;

/** Admin credentials. */
export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(200),
});

export type LoginInput = z.infer<typeof loginSchema>;
