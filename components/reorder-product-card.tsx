'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import OptionSelect, { Option as SelectOption } from '@/components/option-select'

export type ReorderOption = { label: string; price: number; maxQty?: number }
export type ReorderItem = {
  slug: 'mounjaro-refill' | 'wegovy-refill' 
  name: string
  image: string
  options: ReorderOption[]
  priceFrom?: number
  note?: string
  maxQty?: number
}

export default function ReorderProductCard({ item }: { item: ReorderItem }) {
  const router = useRouter()
  const [selectedOption, setSelectedOption] = useState('')
  const [qty, setQty] = useState(1)

  const priceFrom = useMemo(() => {
    if (typeof item.priceFrom === 'number') return item.priceFrom
    const min = Math.min(...item.options.map(o => o.price))
    return Number.isFinite(min) ? min : 0
  }, [item])

  const selectedOpt = useMemo(
    () => item.options.find(o => o.label === selectedOption),
    [item.options, selectedOption]
  )

  const maxLimit = selectedOpt?.maxQty ?? item.maxQty ?? Infinity

  const clamp = (v: number) => {
    const base = v || 1
    return Number.isFinite(maxLimit)
      ? Math.max(1, Math.min(maxLimit as number, base))
      : Math.max(1, base)
  }

  const onContinue = () => {
    if (!item?.slug) {
      console.warn('missing slug in item', item)
      return
    }
    const optionIndex = item.options.findIndex(o => o.label === selectedOption)
    if (optionIndex < 0) return
    const qs = new URLSearchParams({
      slug: item.slug,
      option: String(optionIndex),
      qty: String(qty),
    })
    router.push(`/private-services/weight-loss/reorder/assessment?${qs.toString()}`)
  }

  return (
    <div className="h-full max-w-xs w-full mx-auto rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow-lg transition p-4 flex flex-col">
      {/* image */}
      <div className="h-24 md:h-28 w-full flex items-center justify-center mb-3">
        <img src={item.image} alt={item.name} className="max-h-full object-contain" />
      </div>

      {/* header */}
      <div className="text-center mb-2">
        <h3 className="text-xl font-semibold leading-snug min-h-[40px] flex items-center justify-center">
          {item.name}
        </h3>

        <p className="text-gray-800 font-semibold text-sm min-h-[20px] flex items-center justify-center">
          Prices from £{priceFrom.toFixed(2)}
        </p>

        {item.note ? (
          <p className="text-xs text-gray-500 leading-relaxed max-w-[240px] mx-auto min-h-[36px] flex items-center justify-center">
            {item.note}
          </p>
        ) : (
          <div className="min-h-[36px]" />
        )}

        {/* spacer (keeps alignment with other cards) */}
        <div className="min-h-[18px]" />
      </div>

      <div className="h-px bg-gray-200 my-3" />

      {/* options */}
      <div className="mb-3">
        <OptionSelect
          options={(item.options as unknown as SelectOption[]) || []}
          value={selectedOption}
          onChange={(v) => {
            setSelectedOption(v)
            setQty(1)
          }}
          placeholder="Choose an option"
        />
      </div>

      {/* qty + continue */}
      <div className="mt-auto flex items-center gap-2">
        <input
          type="number"
          min={1}
          {...(Number.isFinite(maxLimit) ? { max: maxLimit as number } : {})}
          value={qty}
          onChange={(e) => setQty(clamp(Number(e.target.value)))}
          className="w-12 border border-gray-300 rounded-full p-1 text-center text-sm"
        />

        <button
          onClick={onContinue}
          disabled={!selectedOption || (Number.isFinite(maxLimit) && qty > (maxLimit as number))}
          className={`flex-1 py-1.5 rounded-full text-sm transition ${
            !selectedOption
              ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
              : 'bg-emerald-500 text-white hover:bg-emerald-600'
          }`}
        >
          Reorder
        </button>
      </div>

      {Number.isFinite(maxLimit) && (
        <p className="mt-2 text-[11px] text-gray-500">Max {maxLimit as number} per order</p>
      )}
    </div>
  )
}
