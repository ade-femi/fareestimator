import type { Metadata } from 'next';
import { EstimateForm } from '@/components/estimate/estimate-form';
import { getPublicSettingsSafe } from '@/lib/settings';
import { readableTextColor } from '@/lib/utils';

/**
 * Landing page.
 *
 * Rendered on the server so branding is present in the first paint. Only
 * `PublicSettings` is read here — the type makes it impossible to leak the
 * origin address into the HTML.
 */
export const metadata: Metadata = {
  title: 'Travel Fee Estimator',
  description: 'Estimate your travel fee before scheduling your service.',
};

// Settings change rarely; revalidate keeps the page fast without going stale.
export const revalidate = 60;

export default async function HomePage() {
  const settings = await getPublicSettingsSafe();
  const brandForeground = readableTextColor(settings.brandColor);

  return (
    <main
      className="bg-hero-gradient min-h-dvh"
      style={
        {
          '--brand': settings.brandColor,
          '--brand-foreground': brandForeground,
        } as React.CSSProperties
      }
    >
      <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:py-16">
        <header className="mb-8 text-center sm:mb-10">
          {settings.companyLogo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={settings.companyLogo}
              alt={settings.companyName}
              className="mx-auto mb-6 h-12 w-auto object-contain"
              loading="eager"
            />
          )}
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Travel Fee Estimator
          </h1>
          <p className="mt-3 text-base text-muted-foreground">
            Estimate your travel fee before scheduling your service.
          </p>
        </header>

        <EstimateForm />

        <footer className="mt-12 space-y-2 text-center text-sm text-muted-foreground">
          <p className="font-medium text-foreground">{settings.companyName}</p>
          {(settings.contactPhone || settings.contactEmail) && (
            <p className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
              {settings.contactPhone && (
                <a
                  href={`tel:${settings.contactPhone.replace(/[^\d+]/g, '')}`}
                  className="underline-offset-4 transition-colors hover:text-foreground hover:underline"
                >
                  {settings.contactPhone}
                </a>
              )}
              {settings.contactEmail && (
                <a
                  href={`mailto:${settings.contactEmail}`}
                  className="underline-offset-4 transition-colors hover:text-foreground hover:underline"
                >
                  {settings.contactEmail}
                </a>
              )}
            </p>
          )}
        </footer>
      </div>
    </main>
  );
}
