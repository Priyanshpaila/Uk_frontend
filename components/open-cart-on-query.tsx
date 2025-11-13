"use client"

import { useEffect, useRef } from "react"
import { useCart } from "@/components/cart-context"
import { useRouter, useSearchParams } from "next/navigation"

/**
 * Opens the cart when a query flag is present.
 * Supports either a passed-in searchParams prop (from a Page) or reading from the URL.
 * Truthy values: 1 | true | yes. Keys: openCart or cart.
 */
export default function OpenCartOnQuery({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>
}) {
  const { open } = useCart()
  const router = useRouter()
  const sp = useSearchParams()
  const openedOnce = useRef(false)

  useEffect(() => {
    if (openedOnce.current) return

    const getFirst = (v?: string | string[] | null) => (Array.isArray(v) ? v[0] : v ?? undefined)

    // Prefer prop (SSR-provided) but fall back to client URL if not provided
    const fromProp = getFirst(searchParams?.openCart) ?? getFirst(searchParams?.cart)
    const fromUrl = sp ? (sp.get("openCart") ?? sp.get("cart")) : undefined

    const raw = (fromProp ?? fromUrl)?.toString().toLowerCase()
    const truthy = raw === "1" || raw === "true" || raw === "yes"

    if (!truthy) return

    openedOnce.current = true
    open()

    // Clean the URL so it won’t keep re-opening on navigation
    try {
      if (sp) {
        const params = new URLSearchParams(sp.toString())
        params.delete("openCart")
        params.delete("cart")
        const qs = params.toString()
        router.replace(qs ? `?${qs}` : "?", { scroll: false })
      }
    } catch {
      // no-op: best effort only
    }
  }, [searchParams, sp, open, router])

  return null
}
