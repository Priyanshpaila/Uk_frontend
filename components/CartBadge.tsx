// components/CartBadge.tsx
'use client'
import { useCart } from '@/components/cart-context'
export default function CartBadge() {
  const { items } = useCart()
  const totalQty = items.reduce((n, i) => n + i.qty, 0)
  if (!totalQty) return null
  return (
    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-emerald-600 text-white text-[10px] leading-[18px] text-center font-semibold">
      {totalQty}
    </span>
  )
}