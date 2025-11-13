import { Suspense } from 'react'
import ClientPaymentReturn from './ClientPaymentReturn'

export const dynamic = 'force-dynamic'

type Props = {
  searchParams: Record<string, string | string[] | undefined>
}

export default function Page({ searchParams }: Props) {
  return (
    <Suspense fallback={<p className="p-6">Finishing your payment…</p>}>
      <ClientPaymentReturn initialSearch={searchParams} />
    </Suspense>
  )
}