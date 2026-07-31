import type { Metadata } from 'next';
import { requireAdmin } from '@/auth';
import { getSettings } from '@/lib/settings';
import { SettingsForm } from '@/components/admin/settings-form';

export const metadata: Metadata = {
  title: 'Settings',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  await requireAdmin();
  const settings = await getSettings();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pricing, service area, customer-facing copy and branding.
        </p>
      </div>

      {/*
        The origin address is passed to this authenticated page only. It is never
        included in any public page, API response or client bundle.
      */}
      <SettingsForm
        settings={{
          originAddress: settings.originAddress,
          pricePerMile: settings.pricePerMile,
          minimumFee: settings.minimumFee,
          maxRadiusMiles: settings.maxRadiusMiles,
          feeExplanation: settings.feeExplanation,
          outsideAreaMessage: settings.outsideAreaMessage,
          displayPricePerMile: settings.displayPricePerMile,
          companyName: settings.companyName,
          companyLogo: settings.companyLogo,
          brandColor: settings.brandColor,
          contactPhone: settings.contactPhone,
          contactEmail: settings.contactEmail,
        }}
      />
    </div>
  );
}
