'use client'

import { isBookingEnabled } from '@/lib/feature'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function ThankYou() {
  const router = useRouter()
  const bookingOn = isBookingEnabled()

  // mark assessment complete so /booking is gated
  useEffect(() => {
    try { sessionStorage.setItem('pe_assessment_done', '1') } catch {}
  }, [])

  return (
    <main className="min-h-[70vh] flex items-center justify-center px-6">
      <div className="max-w-2xl w-full">
        <h1 className="text-3xl font-semibold">Thank you for submitting your details</h1>
        <p className="mt-2 text-zinc-700">
          As you’re ordering as a <strong>new patient</strong>, you need to book a free online consultation with us.
        </p>

        {bookingOn ? (
          <div className="mt-6 border p-5">
            <h2 className="text-xl font-medium">Book your free online consultation</h2>
            <p className="text-zinc-600 mt-1">
              Choose a date and time that works for you. Availability updates in real time.
            </p>
            <button
              onClick={() => router.push('/booking')}
              className="mt-4 w-full h-12 bg-black text-white hover:bg-zinc-900"
            >
              Book appointment
            </button>
          </div>
        ) : (
          <div className="mt-6 text-sm text-zinc-600">
            Booking will be available soon. We’ll contact you to arrange your consultation.
          </div>
        )}
      </div>
    </main>
  )
}
