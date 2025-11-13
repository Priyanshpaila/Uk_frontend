import { Suspense } from 'react';
import RequireAuth from '@/components/RequireAuth';
import ClientPayPage from './ClientPay';

export const dynamic = 'force-dynamic';

export default function Page() {
  return (
    <RequireAuth>
      <Suspense fallback={<div>Loading payment…</div>}>
        <ClientPayPage />
      </Suspense>
    </RequireAuth>
  );
}