'use client'
import Link from 'next/link'

export default function Cancel() {
  return (
    <main className="max-w-2xl mx-auto px-6 py-16">
      <div className="bg-white shadow-sm border rounded-2xl p-8">
        <div className="mx-auto w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <h1 className="mt-6 text-2xl font-semibold text-red-600 text-center">
          Payment cancelled
        </h1>
        <p className="mt-2 text-center text-gray-700">
          Your payment was not completed. If this was a mistake, you can try again.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Link
            href="/private-services/weight-loss"
            className="w-full text-center rounded-full bg-red-600 text-white px-4 py-2.5 hover:bg-red-700 transition"
          >
            Try again
          </Link>
          <Link
            href="/"
            className="w-full text-center rounded-full border border-gray-300 px-4 py-2.5 hover:bg-gray-50 transition"
          >
            Go to homepage
          </Link>
        </div>

        <div className="mt-8 rounded-xl bg-red-50 text-red-900 p-4">
          <p className="font-medium">Need help with your payment</p>
          <p className="mt-2 text-sm">
            If you continue to face issues completing your payment, please contact our support team for assistance.
          </p>
        </div>

        <div className="mt-6 text-sm text-gray-600 text-center">
          <Link href="/contact" className="text-red-700 hover:underline">
            Contact support
          </Link>
        </div>
      </div>
    </main>
  )
}




