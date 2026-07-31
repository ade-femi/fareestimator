'use client';

import * as React from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { AlertCircle, CheckCircle2, Lock, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { updateSettingsAction } from '@/server/actions/settings-actions';
import type { ActionState } from '@/server/actions/auth-actions';

export interface SettingsFormValues {
  originAddress: string;
  pricePerMile: number;
  minimumFee: number;
  maxRadiusMiles: number;
  feeExplanation: string;
  outsideAreaMessage: string;
  displayPricePerMile: boolean;
  companyName: string;
  companyLogo: string | null;
  brandColor: string;
  contactPhone: string | null;
  contactEmail: string | null;
}

const initialState: ActionState = { ok: false };

export function SettingsForm({ settings }: { settings: SettingsFormValues }) {
  const [state, formAction] = useActionState(updateSettingsAction, initialState);

  // Radix Switch does not submit a value, so a hidden input mirrors its state.
  const [displayPricePerMile, setDisplayPricePerMile] = React.useState(
    settings.displayPricePerMile,
  );
  const [brandColor, setBrandColor] = React.useState(settings.brandColor);

  const fieldError = (name: string) => state.fields?.[name];

  return (
    <form action={formAction} className="space-y-6" noValidate>
      {state.message && (
        <Alert variant={state.ok ? 'success' : 'destructive'}>
          {state.ok ? (
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          ) : (
            <AlertCircle className="h-4 w-4" aria-hidden="true" />
          )}
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Lock className="h-4 w-4" aria-hidden="true" />
            Business origin (private)
          </CardTitle>
          <CardDescription>
            Used only to calculate driving distance. It is never sent to the browser,
            never shown to customers and never included in any API response.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="originAddress">Origin address</Label>
            <Input
              id="originAddress"
              name="originAddress"
              defaultValue={settings.originAddress}
              placeholder="123 Main St, Austin, TX 78701"
              autoComplete="off"
              aria-invalid={Boolean(fieldError('originAddress'))}
            />
            <FieldError message={fieldError('originAddress')} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pricing &amp; service area</CardTitle>
          <CardDescription>
            The fee is driving distance × price per mile, floored at your minimum.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="pricePerMile">Price per mile ($)</Label>
            <Input
              id="pricePerMile"
              name="pricePerMile"
              type="number"
              step="0.01"
              min="0"
              defaultValue={settings.pricePerMile}
              aria-invalid={Boolean(fieldError('pricePerMile'))}
            />
            <FieldError message={fieldError('pricePerMile')} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="minimumFee">Minimum travel fee ($)</Label>
            <Input
              id="minimumFee"
              name="minimumFee"
              type="number"
              step="0.01"
              min="0"
              defaultValue={settings.minimumFee}
              aria-invalid={Boolean(fieldError('minimumFee'))}
            />
            <FieldError message={fieldError('minimumFee')} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxRadiusMiles">Maximum radius (miles)</Label>
            <Input
              id="maxRadiusMiles"
              name="maxRadiusMiles"
              type="number"
              step="1"
              min="0"
              defaultValue={settings.maxRadiusMiles}
              aria-describedby="maxRadiusMiles-hint"
              aria-invalid={Boolean(fieldError('maxRadiusMiles'))}
            />
            <p id="maxRadiusMiles-hint" className="text-xs text-muted-foreground">
              Use 0 for no limit.
            </p>
            <FieldError message={fieldError('maxRadiusMiles')} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Customer-facing copy</CardTitle>
          <CardDescription>Shown on the estimate results.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="feeExplanation">Travel fee explanation</Label>
            <Textarea
              id="feeExplanation"
              name="feeExplanation"
              rows={3}
              defaultValue={settings.feeExplanation}
              aria-invalid={Boolean(fieldError('feeExplanation'))}
            />
            <FieldError message={fieldError('feeExplanation')} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="outsideAreaMessage">Outside service area message</Label>
            <Textarea
              id="outsideAreaMessage"
              name="outsideAreaMessage"
              rows={3}
              defaultValue={settings.outsideAreaMessage}
              aria-invalid={Boolean(fieldError('outsideAreaMessage'))}
            />
            <FieldError message={fieldError('outsideAreaMessage')} />
          </div>

          <ToggleRow
            id="displayPricePerMile"
            label="Display price per mile"
            description="Show the per-mile rate alongside the estimate."
            checked={displayPricePerMile}
            onChange={setDisplayPricePerMile}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Branding &amp; contact</CardTitle>
          <CardDescription>
            Displayed in the header and footer of the estimator.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="companyName">Company name</Label>
            <Input
              id="companyName"
              name="companyName"
              defaultValue={settings.companyName}
              aria-invalid={Boolean(fieldError('companyName'))}
            />
            <FieldError message={fieldError('companyName')} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="companyLogo">Company logo URL (optional)</Label>
            <Input
              id="companyLogo"
              name="companyLogo"
              type="url"
              placeholder="https://example.com/logo.png"
              defaultValue={settings.companyLogo ?? ''}
              aria-invalid={Boolean(fieldError('companyLogo'))}
            />
            <FieldError message={fieldError('companyLogo')} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="brandColor">Primary brand colour</Label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                aria-label="Choose brand colour"
                value={brandColor}
                onChange={(event) => setBrandColor(event.target.value)}
                className="h-11 w-14 cursor-pointer rounded-md border border-input bg-background p-1"
              />
              <Input
                id="brandColor"
                name="brandColor"
                value={brandColor}
                onChange={(event) => setBrandColor(event.target.value)}
                aria-invalid={Boolean(fieldError('brandColor'))}
              />
            </div>
            <FieldError message={fieldError('brandColor')} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contactPhone">Contact phone</Label>
            <Input
              id="contactPhone"
              name="contactPhone"
              type="tel"
              defaultValue={settings.contactPhone ?? ''}
              aria-invalid={Boolean(fieldError('contactPhone'))}
            />
            <FieldError message={fieldError('contactPhone')} />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="contactEmail">Contact email</Label>
            <Input
              id="contactEmail"
              name="contactEmail"
              type="email"
              defaultValue={settings.contactEmail ?? ''}
              aria-invalid={Boolean(fieldError('contactEmail'))}
            />
            <FieldError message={fieldError('contactEmail')} />
          </div>
        </CardContent>
      </Card>

      <div className="sticky bottom-4 flex justify-end">
        <SaveButton />
      </div>
    </form>
  );
}

function ToggleRow({
  id,
  label,
  description,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-4">
      <div className="space-y-0.5">
        <Label htmlFor={`${id}-switch`}>{label}</Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch id={`${id}-switch`} checked={checked} onCheckedChange={onChange} />
      <input type="hidden" name={id} value={checked ? 'true' : 'false'} />
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs font-medium text-destructive">{message}</p>;
}

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending} className="shadow-lg">
      {pending ? (
        <>
          <Spinner label="Saving settings" />
          Saving…
        </>
      ) : (
        <>
          <Save className="h-4 w-4" aria-hidden="true" />
          Save settings
        </>
      )}
    </Button>
  );
}
