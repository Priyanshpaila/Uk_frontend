import { Suspense } from 'react'
import RequireAuth from '@/components/RequireAuth'
import ClientCheckout from './ClientCheckout'

export const dynamic = 'force-dynamic'

export default function Page() {
  return (
    <RequireAuth>
      <Suspense fallback={<div>Loading payment options…</div>}>
        <ClientCheckout />
      </Suspense>
    </RequireAuth>
  )
}
