import Link from 'next/link';
import { ArrowRight, DollarSign, Gauge, ShieldCheck, Settings } from 'lucide-react';
import { requireAdmin } from '@/auth';
import { getSettings } from '@/lib/settings';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDistance } from '@/lib/fee';

export const dynamic = 'force-dynamic';

/** Overview page: the pricing rules currently applied to every estimate. */
export default async function AdminOverviewPage() {
  await requireAdmin();
  const settings = await getSettings();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          The rules currently applied to every customer estimate.
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <DollarSign className="h-4 w-4" aria-hidden="true" />
              Current pricing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Price per mile" value={formatCurrency(settings.pricePerMile)} />
            <Row label="Minimum travel fee" value={formatCurrency(settings.minimumFee)} />
            <Row
              label="Maximum service radius"
              value={
                settings.maxRadiusMiles > 0
                  ? formatDistance(settings.maxRadiusMiles)
                  : 'No limit'
              }
            />
            <Row
              label="Show price per mile to customers"
              value={settings.displayPricePerMile ? 'Yes' : 'No'}
            />
            {/*
              The origin address is intentionally not shown here. It is editable
              on the settings page only, and never appears on any public page.
            */}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Gauge className="h-4 w-4" aria-hidden="true" />
              Quick actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button asChild variant="outline" className="w-full justify-between">
              <Link href="/admin/settings">
                <span className="flex items-center gap-2">
                  <Settings className="h-4 w-4" aria-hidden="true" />
                  Edit pricing &amp; branding
                </span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild variant="ghost" className="w-full justify-between">
              <Link href="/" target="_blank" rel="noreferrer">
                <span>Open customer estimator</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      <Card className="bg-muted/30">
        <CardContent className="flex gap-3 p-5">
          <ShieldCheck
            className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
          <div className="space-y-1 text-sm">
            <p className="font-medium">Privacy by design</p>
            <p className="text-muted-foreground">
              Estimates are calculated and returned in the moment — no destination,
              distance, fee or customer detail is ever written to the database. The
              business origin address is used only to call Google and is never sent to the
              browser.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border pb-2 last:border-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
