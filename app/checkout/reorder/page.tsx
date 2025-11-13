'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import RequireAuth from '@/components/RequireAuth'

export default function ReorderCheckoutPage() {
  const router = useRouter()
  

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function createPayment() {
      try {
        setLoading(true)
        setError(null)

    
        const usp = new URLSearchParams(window.location.search)
        const slug = usp.get('slug') ?? ''
        const option = usp.get('option') ?? '0'
        const qty = usp.get('qty') ?? '1'

        // Call your API to create a payment session
        const res = await fetch('/api/payment/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ flow: 'reorder', slug, option, qty }),
        })

        const data = await res.json().catch(() => ({}))

        if (!res.ok || !data.checkoutUrl) {
          setError(data.message || 'Could not start payment')
          setLoading(false)
          return
        }

        // Redirect straight to hosted checkout
        window.location.href = data.checkoutUrl
      } catch (e) {
        setError('Network error. Please try again.')
        setLoading(false)
      }
    }

    createPayment()
  }, [])

  return (
    <RequireAuth>
      <div className="max-w-lg mx-auto px-6 py-16 text-center">
        {loading && <p className="text-gray-700">Redirecting you to payment…</p>}
        {error && (
          <div>
            <p className="text-red-600 mb-3">{error}</p>
            <button
              onClick={() => router.back()}
              className="px-4 py-2 rounded-full border border-black text-black hover:bg-gray-100"
            >
              Go back
            </button>
          </div>
        )}
      </div>
    </RequireAuth>
  )
}
