import type { Metadata } from 'next';
import { AdminNav } from '@/components/admin/admin-nav';
import { auth } from '@/auth';

export const metadata: Metadata = {
  title: 'Admin',
  robots: { index: false, follow: false },
};

/**
 * Admin shell.
 *
 * The login page renders its own full-screen layout, so the chrome below is
 * only added once a session exists.
 */
export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();

  if (!session?.user) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-dvh bg-muted/30">
      <AdminNav userEmail={session.user.email ?? ''} />
      <main className="mx-auto w-full max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
