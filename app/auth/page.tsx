import { Suspense } from 'react'
import ClientCheckout from './ClientAuth'

export const dynamic = 'force-dynamic'

type Props = {
  searchParams: Record<string, string | string[] | undefined>
}

export default function Page({ searchParams }: Props) {
  return (
    <Suspense fallback={<div>Loading checkout</div>}>
      <ClientCheckout initialSearch={searchParams} />
    </Suspense>
  )
}