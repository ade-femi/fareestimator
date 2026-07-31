'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { AlertCircle, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { loginAction, type ActionState } from '@/server/actions/auth-actions';

const initialState: ActionState = { ok: false };

export function LoginForm() {
  const [state, formAction] = useActionState(loginAction, initialState);

  return (
    <Card className="shadow-md">
      <CardContent className="p-6">
        <form action={formAction} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              required
              aria-invalid={Boolean(state.fields?.email)}
            />
            {state.fields?.email && (
              <p className="text-xs font-medium text-destructive">{state.fields.email}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              aria-invalid={Boolean(state.fields?.password)}
            />
            {state.fields?.password && (
              <p className="text-xs font-medium text-destructive">
                {state.fields.password}
              </p>
            )}
          </div>

          {state.message && !state.ok && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" aria-hidden="true" />
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          )}

          <SubmitButton />
        </form>
      </CardContent>
    </Card>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? (
        <>
          <Spinner label="Signing in" />
          Signing in…
        </>
      ) : (
        <>
          <LogIn className="h-4 w-4" aria-hidden="true" />
          Sign in
        </>
      )}
    </Button>
  );
}
