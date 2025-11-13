"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import OptionSelect, { Option as SelectOption } from "@/components/option-select"
import { useCart } from "@/components/cart-context"

// Avoid name clash with OptionSelect.Option
export type ProductOption = { label: string; price: number; maxQty?: number }

export type Product = {
  name: string
  slug: string
  priceFrom: number
  image: string
  options?: ProductOption[]
  outOfStock?: boolean
  note?: string
  maxQty?: number // product-wide fallback when option has no max
}

export default function ProductCard({ product }: { product: Product }) {
  const hasOptions = !!product.options?.length
  const [selectedOption, setSelectedOption] = useState("")
  const [qty, setQty] = useState(1)
  const { addItem } = useCart()

  const selectedOpt = useMemo(
    () => product.options?.find((o) => o.label === selectedOption),
    [product.options, selectedOption]
  )

  // option-level > product-level > unlimited
  const maxLimit = selectedOpt?.maxQty ?? product.maxQty ?? Infinity

  const clamp = (v: number) => {
    const base = v || 1
    return Number.isFinite(maxLimit)
      ? Math.max(1, Math.min(maxLimit as number, base))
      : Math.max(1, base)
  }

  const onAdd = () => {
    if (product.outOfStock) return
    if (hasOptions && !selectedOption) return

    const price =
      product.options?.find((o) => o.label === selectedOption)?.price ??
      product.priceFrom

    const maxQty =
      product.options?.find((o) => o.label === selectedOption)?.maxQty ??
      product.maxQty ??
      null

    const unitMinor = Math.round((price || 0) * 100)
    const totalMinor = unitMinor * qty

    // Build a stable SKU from slug + option label
    const normalise = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
    const sku = selectedOption
      ? `${product.slug}:${normalise(selectedOption)}`
      : normalise(product.slug)

    addItem({
      sku,
      slug: product.slug,
      name: product.name,
      image: product.image,
      price,            // keep for UI that expects pounds
      qty,
      optionLabel: selectedOption || undefined,  // legacy/compat
      label: selectedOption || undefined,        // explicit for API
      selectedLabel: selectedOption || undefined,// explicit for API
      variations: selectedOption || undefined,   // canonical variation
      unitMinor,                                  // per‑unit in minor (pence)
      priceMinor: unitMinor,                      // compat alias some code uses
      totalMinor,                                 // line total in minor units
      maxQty,
    })
  } // <-- make sure onAdd closes here

  return (
    <div className="h-full rounded-3xl border border-gray-200 bg-white shadow-sm hover:shadow-2xl transition p-6 flex flex-col">
      {/* image area */}
      <div className="h-28 md:h-32 w-full flex items-center justify-center mb-4">
        <img src={product.image} alt={product.name} className="max-h-full object-contain" />
      </div>

      {/* header block with reserved heights for alignment */}
      <div className="text-center mb-2">
        <h3 className="text-2xl font-semibold leading-snug min-h-[56px] flex items-center justify-center">
          {product.name}
        </h3>

        <p className="text-gray-800 font-semibold min-h-[24px] flex items-center justify-center">
          Prices from £{product.priceFrom.toFixed(2)}
        </p>

        {product.note ? (
          <p className="text-sm text-gray-500 leading-relaxed max-w-[260px] mx-auto min-h-[48px] flex items-center justify-center">
            {product.note}
          </p>
        ) : (
          <div className="min-h-[48px]" />
        )}

        <div className="min-h-[24px] flex items-center justify-center">
          <Link href={`/private-services/weight-loss/treatments/${product.slug}`} className="text-emerald-600 hover:underline">
            More info
          </Link>
        </div>
      </div>

      <div className="h-px bg-gray-200 mt-2 mb-4" />

      {/* options */}
      {hasOptions && (
        <div className="mb-3">
          <OptionSelect
            options={(product.options as unknown as SelectOption[]) || []}
            value={selectedOption}
            onChange={(v) => {
              setSelectedOption(v)
              setQty(1) // reset so new max is respected
            }}
            placeholder="Choose an option"
          />
        </div>
      )}

      {/* qty + add */}
      <div className="mt-auto flex items-center gap-3">
        <input
          type="number"
          min={1}
          {...(Number.isFinite(maxLimit) ? { max: maxLimit as number } : {})}
          value={qty}
          onChange={(e) => {
            const raw = e.target.value;
            // parse int safely; treat empty/invalid as 1 before clamping
            const parsed = Number.isFinite(parseInt(raw, 10)) ? parseInt(raw, 10) : 1;
            setQty(clamp(parsed));
          }}
          className="w-16 border border-gray-300 rounded-full p-2 text-center"
        />
        <button
          onClick={onAdd}
          disabled={
            product.outOfStock ||
            (hasOptions && !selectedOption) ||
            (Number.isFinite(maxLimit) && qty > (maxLimit as number))
          }
          className={`flex-1 py-2 rounded-full transition ${
            product.outOfStock || (hasOptions && !selectedOption)
              ? "bg-gray-300 text-gray-600 cursor-not-allowed"
              : "bg-emerald-500 text-white hover:bg-emerald-600"
          }`}
        >
          {product.outOfStock ? "Out of stock" : "Add to basket"}
        </button>
      </div>

      {Number.isFinite(maxLimit) && (
        <p className="mt-2 text-xs text-gray-500">Max {maxLimit as number} per order</p>
      )}
    </div>
  )
}
