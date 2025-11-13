// app/reorder/page.tsx
'use client'
import ReorderProductCard from '@/components/reorder-product-card'
import { REORDER_ITEMS } from '@/lib/reorder-catalog'
import Link from 'next/link'
import OpenCartOnQuery from '@/components/open-cart-on-query'

export default function ReorderPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  return (
    <div className="max-w-5xl mx-auto px-4 py-6 sm:py-10">
      <OpenCartOnQuery searchParams={searchParams} />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-6">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Reorder for existing patients</h1>
        <Link href="/private-services/weight-loss" className="self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2 rounded-full border border-emerald-600 text-emerald-700 hover:bg-emerald-50">
          ← Back
        </Link>
      </div>
      <p className="text-gray-700 mb-8">
        Pick your medicine and strength then confirm the quick check on the next page and if unsure book a consultation with us
      </p>

      <div className="flex flex-wrap justify-center gap-6">
        {REORDER_ITEMS.map((it) => (
          <div key={it.slug} className="w-[320px]">
            <ReorderProductCard item={it} />
          </div>
        ))}
      </div>
    </div>
  )
}
