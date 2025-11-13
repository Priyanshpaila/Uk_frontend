'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

type Search = Record<string, string | string[] | undefined>

export default function ClientPaymentReturn({ initialSearch }: { initialSearch: Search }) {
  const router = useRouter()

  useEffect(() => {
    const raw = initialSearch.status
    const status = Array.isArray(raw) ? raw[0] : raw
    if (!status) return

    const s = status.toLowerCase()
    if (s === 'succeeded' || s === 'approved') {
      router.replace('/payment/success')
    } else {
      router.replace('/payment/cancel')
    }
  }, [initialSearch, router])

  return <p className="p-6">Finishing your payment…</p>
}