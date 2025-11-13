// lib/reorder-catalog.ts
export type ReorderOption = { label: string; price: number }
export type ReorderSlug = 'mounjaro-refill' | 'wegovy-refill'
export type ReorderItem = {
  slug: ReorderSlug
  name: string
  image: string
  options: ReorderOption[]
}

export const REORDER_ITEMS: ReorderItem[] = [
  {
    slug: 'mounjaro-refill',
    name: 'Mounjaro Refill',
    image: '/meds/mounjaro.jpg',
    options: [
      { label: '2.5mg Starter Pack Needles Swabs Sharps bin', price: 169.99 },
      { label: '2.5mg and 5mg Starter Pack', price: 338.0 },
      { label: '2.5mg',   price: 144.99 },
      { label: '5mg',     price: 164.99 },
      { label: '7.5mg',   price: 224.99 },
      { label: '10mg',    price: 244.99 },
      { label: '12.5mg',  price: 264.99 },
      { label: '15mg',    price: 284.99 },
    ],
  },
  {
    slug: 'wegovy-refill',
    name: 'Wegovy refill',
    image: '/meds/wegovy.jpg',
    options: [
      { label: '0.25mg', price:  99.49 },
      { label: '0.5mg',  price: 104.49 },
      { label: '1mg',    price: 114.49 },
      { label: '1.7mg',  price: 159.99 },
      { label: '2.4mg',  price: 209.99 },
    ],
  },
]

export function getItem(slug: ReorderSlug) {
  return REORDER_ITEMS.find(i => i.slug === slug)
}

export function getPriceEach(slug: ReorderSlug, optionIndex: number): number | null {
  const it = getItem(slug)
  if (!it) return null
  const opt = it.options[optionIndex]
  return opt ? opt.price : null
}

export function getAmountMinor(slug: ReorderSlug, optionIndex: number, qty: number): number | null {
  const each = getPriceEach(slug, optionIndex)
  if (each == null) return null
  return Math.round(each * 100) * Math.max(1, qty)   // GBP minor units (pence)
}
