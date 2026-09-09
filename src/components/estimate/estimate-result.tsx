'use client';

import { Info, Route, Wallet } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { formatCurrency } from '@/lib/fee';
import type { EstimateResponse } from '@/types/estimate';

/**
 * Read-only summary of a completed estimate.
 *
 * Shows distance and fee only — there is deliberately no map, no route, no
 * coordinates and no reference to where the trip starts.
 */
export function EstimateResult({ estimate }: { estimate: EstimateResponse }) {
  if (estimate.outsideServiceArea) {
    return (
      <Alert variant="warning" className="animate-fade-in-up">
        <Info className="h-4 w-4" aria-hidden="true" />
        <AlertTitle>Outside our service area</AlertTitle>
        <AlertDescription>{estimate.message}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="animate-fade-in-up space-y-4">
      <Card className="border-brand/20 overflow-hidden">
        <div className="bg-brand px-6 py-4 text-brand-foreground">
          <h2 className="text-lg font-semibold tracking-tight">Travel Fee Estimate</h2>
        </div>

        <CardContent className="divide-y divide-border p-0">
          <SummaryRow
            icon={<Route className="h-5 w-5" aria-hidden="true" />}
            label="Estimated Round-Trip Distance"
            value={estimate.distanceText}
          />
          <SummaryRow
            icon={<Wallet className="h-5 w-5" aria-hidden="true" />}
            label="Estimated Travel Fee"
            value={formatCurrency(estimate.travelFee)}
            emphasis
          />
        </CardContent>

        {(estimate.pricePerMile !== null || estimate.minimumFeeApplied) && (
          <div className="border-t border-border bg-muted/40 px-6 py-3 text-xs text-muted-foreground">
            {estimate.pricePerMile !== null && (
              <span>
                Calculated at {formatCurrency(estimate.pricePerMile)} per mile round
                trip.{' '}
              </span>
            )}
            {estimate.minimumFeeApplied && (
              <span>
                Our minimum travel fee of {formatCurrency(estimate.minimumFee)} applies.
              </span>
            )}
          </div>
        )}
      </Card>

      <Card className="bg-muted/30">
        <CardContent className="p-5">
          <h3 className="mb-1.5 text-sm font-semibold">Why is there a travel fee?</h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {estimate.feeExplanation}
          </p>
        </CardContent>
      </Card>

      <p className="px-1 text-xs text-muted-foreground">
        This is an estimate. Final travel fees are confirmed when your service is
        scheduled.
      </p>
    </div>
  );
}

function SummaryRow({
  icon,
  label,
  value,
  emphasis = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-6 py-4">
      <div className="flex items-center gap-3 text-muted-foreground">
        <span className="text-brand">{icon}</span>
        <span className="text-sm font-medium text-foreground">{label}</span>
      </div>
      <span
        className={
          emphasis
            ? 'text-2xl font-semibold tracking-tight text-foreground'
            : 'text-lg font-medium tracking-tight text-foreground'
        }
      >
        {value}
      </span>
    </div>
  );
}
