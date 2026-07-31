'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import {
  AddressAutocomplete,
  type ResolvedAddress,
} from '@/components/estimate/address-autocomplete';
import { EstimateResult } from '@/components/estimate/estimate-result';
import { destinationSchema, US_STATES, type DestinationInput } from '@/lib/validation';
import type { ApiErrorResponse, EstimateResponse } from '@/types/estimate';

/**
 * The customer-facing estimate form.
 *
 * Autocomplete fills the four address fields, but they remain visible and
 * editable so an address Google does not know can still be entered by hand.
 */
export function EstimateForm() {
  const [searchValue, setSearchValue] = React.useState('');
  const [estimate, setEstimate] = React.useState<EstimateResponse | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);

  const resultRef = React.useRef<HTMLDivElement>(null);

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<DestinationInput>({
    resolver: zodResolver(destinationSchema),
    defaultValues: { street: '', city: '', state: '', zip: '' },
    mode: 'onBlur',
  });

  /** Fills the structured fields once a suggestion is expanded. */
  const applyAddress = React.useCallback(
    (address: ResolvedAddress) => {
      setValue('street', address.street, { shouldValidate: true });
      setValue('city', address.city, { shouldValidate: true });
      setValue('state', address.state, { shouldValidate: true });
      setValue('zip', address.zip, { shouldValidate: true });
      clearErrors();
      setNotice(null);
    },
    [setValue, clearErrors],
  );

  async function onSubmit(values: DestinationInput) {
    setFormError(null);
    setEstimate(null);

    try {
      const response = await fetch('/api/estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as ApiErrorResponse | null;

        // Map server-side field errors back onto the form controls.
        if (body?.error.fields) {
          for (const [field, message] of Object.entries(body.error.fields)) {
            if (field in values) {
              setError(field as keyof DestinationInput, { type: 'server', message });
            }
          }
        }

        setFormError(
          body?.error.message ??
            'We could not calculate an estimate right now. Please try again.',
        );
        return;
      }

      const data = (await response.json()) as EstimateResponse;
      setEstimate(data);

      // Move focus/scroll to the result for keyboard and screen reader users.
      requestAnimationFrame(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    } catch {
      setFormError(
        'We could not reach the estimator. Please check your connection and try again.',
      );
    }
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-md">
        <CardContent className="p-6 sm:p-8">
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
            <fieldset disabled={isSubmitting} className="space-y-6">
              <legend className="sr-only">Destination information</legend>

              <div className="space-y-2">
                <Label htmlFor="destination-search">Destination Address</Label>
                <AddressAutocomplete
                  value={searchValue}
                  onValueChange={setSearchValue}
                  onAddressSelected={applyAddress}
                  onError={setNotice}
                  disabled={isSubmitting}
                  aria-describedby="destination-search-hint"
                />
                <p id="destination-search-hint" className="text-xs text-muted-foreground">
                  Start typing and choose your address — the fields below fill in
                  automatically.
                </p>
              </div>

              {notice && (
                <Alert variant="info">
                  <AlertDescription>{notice}</AlertDescription>
                </Alert>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="street">Street Address</Label>
                  <Input
                    id="street"
                    autoComplete="address-line1"
                    aria-invalid={Boolean(errors.street)}
                    aria-describedby={errors.street ? 'street-error' : undefined}
                    {...register('street')}
                  />
                  <FieldError id="street-error" message={errors.street?.message} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    autoComplete="address-level2"
                    aria-invalid={Boolean(errors.city)}
                    aria-describedby={errors.city ? 'city-error' : undefined}
                    {...register('city')}
                  />
                  <FieldError id="city-error" message={errors.city?.message} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="state">State</Label>
                    <select
                      id="state"
                      autoComplete="address-level1"
                      aria-invalid={Boolean(errors.state)}
                      aria-describedby={errors.state ? 'state-error' : undefined}
                      className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                      {...register('state')}
                    >
                      <option value="">—</option>
                      {US_STATES.map((state) => (
                        <option key={state} value={state}>
                          {state}
                        </option>
                      ))}
                    </select>
                    <FieldError id="state-error" message={errors.state?.message} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="zip">ZIP Code</Label>
                    <Input
                      id="zip"
                      inputMode="numeric"
                      autoComplete="postal-code"
                      maxLength={10}
                      aria-invalid={Boolean(errors.zip)}
                      aria-describedby={errors.zip ? 'zip-error' : undefined}
                      {...register('zip')}
                    />
                    <FieldError id="zip-error" message={errors.zip?.message} />
                  </div>
                </div>
              </div>
            </fieldset>

            {formError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" aria-hidden="true" />
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              variant="brand"
              size="lg"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Spinner label="Calculating your estimate" />
                  Calculating…
                </>
              ) : (
                <>
                  <Calculator className="h-4 w-4" aria-hidden="true" />
                  Calculate Estimate
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Announced politely so screen readers hear the result without stealing focus. */}
      <div ref={resultRef} aria-live="polite" aria-atomic="true">
        {estimate && <EstimateResult estimate={estimate} />}
      </div>
    </div>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="text-xs font-medium text-destructive">
      {message}
    </p>
  );
}
