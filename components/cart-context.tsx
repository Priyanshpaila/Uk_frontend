"use client"

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react"

export type CartItem = {
  key: string           // stable unique key per line
  slug: string          // product slug or sku
  name: string
  image: string
  price: number         // unit price in GBP
  qty: number
  optionLabel?: string  // e.g. strength size
  maxQty?: number | null
  // --- optional extensions used by product-card / checkout ---
  variations?: string        // selected option label (displayed as "Variations")
  unitMinor?: number         // per‑unit price in minor units (pence)
  priceMinor?: number        // alias used by some components
  totalMinor?: number        // line total in minor units
  // new explicit identifiers/labels for API pass-through
  sku?: string
  label?: string
  selectedLabel?: string
}

type CartCtx = {
  items: CartItem[]
  isOpen: boolean
  open: () => void
  close: () => void
  addItem: (item: Omit<CartItem, "key">) => void
  updateQty: (key: string, qty: number) => void
  remove: (key: string) => void
  clear: () => void
  subtotal: number
  // optional helpers for account syncing
  mergeGuestIntoAccount: (post: (payload: { items: CartItem[] }) => Promise<any>) => Promise<void>
  loadServerCart: (fetcher: () => Promise<CartItem[]>) => Promise<void>
}

const Ctx = createContext<CartCtx | undefined>(undefined)

const STORAGE_KEY = "pe_cart_v1"

// util key builder consistent across sessions
function buildKey(slug: string, optionLabel?: string, variations?: string, sku?: string) {
  // If a SKU is provided, prefer it (it should be stable and encode the option)
  if (sku && sku.trim().length > 0) return sku
  const opt = (optionLabel ?? variations ?? '').trim().toLowerCase()
  return `${slug}__${opt}`
}

function toMinor(gbp?: number) {
  if (!gbp || !Number.isFinite(gbp)) return 0;
  return Math.round(gbp * 100);
}

function normalizeLine(i: Omit<CartItem, "key"> & Partial<Pick<CartItem, "key">>) {
  const qty = Math.max(1, Number(i.qty) || 1);
  const name = i.name;
  const variations = (
    i.variations ??
    i.optionLabel ??
    i.selectedLabel ??
    (i as any)?.label ??
    (i as any)?.optionText ??
    (i as any)?.option_text ??
    (i as any)?.variant ??
    (i as any)?.dose ??
    (i as any)?.strength ??
    (i as any)?.plan ??
    (i as any)?.package ??
    ''
  )?.toString().trim() || undefined;

  // prefer explicitly provided minor fields; else derive from price (GBP)
  const unitMinor =
    (typeof i.unitMinor === "number" ? i.unitMinor : undefined) ??
    (typeof i.priceMinor === "number" ? i.priceMinor : undefined) ??
    toMinor(i.price);

  const totalMinor =
    (typeof i.totalMinor === "number" ? i.totalMinor : undefined) ??
    (unitMinor > 0 ? unitMinor * qty : 0);

  return {
    ...i,
    qty,
    name,
    variations,
    unitMinor,
    priceMinor: unitMinor,
    totalMinor,
  };
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [isOpen, setOpen] = useState(false)
  const hydratedRef = useRef(false)

  // hydrate once from localStorage
  useEffect(() => {
    if (hydratedRef.current) return
    hydratedRef.current = true
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed: any[] = JSON.parse(raw)
        // defensively rebuild keys to our format
        const sane = parsed
          .filter(Boolean)
          .map((i) => {
            const normalized = normalizeLine({
              ...i,
              qty: Math.max(1, Number(i.qty) || 1),
              price: Number(i.price) || 0,
            });
            const key = buildKey(
              normalized.slug,
              normalized.optionLabel,
              normalized.variations,
              (normalized as any).sku
            );
            const finalized: CartItem = { ...normalized, key };
            return finalized;
          })
        setItems(sane)
      }
    } catch {
      // ignore
    }
  }, [])

  // persist whenever items change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    } catch {
      // ignore quota errors
    }
  }, [items])

  // sync across tabs windows
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return
      try {
        const next = e.newValue ? JSON.parse(e.newValue) : []
        setItems(
          (next as any[]).map((i) => {
            const normalized = normalizeLine({
              ...i,
              qty: Math.max(1, Number(i.qty) || 1),
              price: Number(i.price) || 0,
            });
            const key = buildKey(
              normalized.slug,
              normalized.optionLabel,
              normalized.variations,
              (normalized as any).sku
            );
            const finalized: CartItem = { ...normalized, key };
            return finalized;
          })
        )
      } catch {}
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [])

  const addItem: CartCtx["addItem"] = (item) => {
    const normalized = normalizeLine(item);
    const key = buildKey(normalized.slug, normalized.optionLabel, normalized.variations, (normalized as any).sku);
    setItems((prev) => {
      const exists = prev.find((i) => i.key === key)
      if (exists) {
        const max = Number.isFinite(exists.maxQty as number) ? (exists.maxQty as number) : Infinity
        const nextQty = Math.min(max, exists.qty + item.qty)
        return prev.map((i) => {
          if (i.key !== key) return i;
          const unitMinor = (typeof i.unitMinor === "number" ? i.unitMinor : toMinor(i.price));
          return { ...i, qty: nextQty, totalMinor: unitMinor > 0 ? unitMinor * nextQty : i.totalMinor ?? 0 };
        });
      }
      const max = Number.isFinite(item.maxQty as number) ? (item.maxQty as number) : Infinity
      return [
        ...prev,
        {
          ...normalized,
          key,
          qty: Math.min(max, Math.max(1, normalized.qty)),
          totalMinor: (normalized.unitMinor ?? 0) > 0 ? (normalized.unitMinor as number) * Math.min(max, Math.max(1, normalized.qty)) : (normalized.totalMinor ?? 0),
        },
      ];
    })
    setOpen(true)
  }

  const updateQty: CartCtx["updateQty"] = (key, qty) => {
    setItems((prev) =>
      prev.map((i) => {
        if (i.key !== key) return i
        const max = Number.isFinite(i.maxQty as number) ? (i.maxQty as number) : Infinity
        const clamped = Math.max(1, Math.min(max, qty || 1))
        const unitMinor = (typeof i.unitMinor === "number" ? i.unitMinor : toMinor(i.price));
        return { ...i, qty: clamped, totalMinor: unitMinor > 0 ? unitMinor * clamped : i.totalMinor ?? 0 };
      })
    )
  }

  const remove: CartCtx["remove"] = (key) => setItems((p) => p.filter((i) => i.key !== key))
  const clear = () => setItems([])
  const open = () => setOpen(true)
  const close = () => setOpen(false)

  const subtotal = useMemo(() => {
    const minor = items.reduce((s, i) => {
      const u = (typeof i.unitMinor === "number" ? i.unitMinor : toMinor(i.price));
      return s + u * Math.max(1, i.qty || 1);
    }, 0);
    return minor / 100;
  }, [items]);

  // Clear cart when success page signals it (works across tabs and in the same tab)
  useEffect(() => {
    const apply = () => {
      setItems([])
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify([])) } catch {}
      try { localStorage.removeItem('clear_cart') } catch {}
    }

    // 1) Same-tab runtime event (success page dispatches `cart:clear`)
    const onClearEvent = () => apply()
    window.addEventListener('cart:clear', onClearEvent)

    // 2) Cross-tab/localStorage signal (success page sets `clear_cart`)
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'clear_cart' && e.newValue === '1') apply()
    }
    window.addEventListener('storage', onStorage)

    // 3) If the flag was set before this provider mounted, apply immediately
    try { if (localStorage.getItem('clear_cart') === '1') apply() } catch {}

    return () => {
      window.removeEventListener('cart:clear', onClearEvent)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  // optional account sync helpers

  // call this right after login if you want to merge the guest cart into the user's server cart
  const mergeGuestIntoAccount: CartCtx["mergeGuestIntoAccount"] = async (post) => {
    if (!items.length) return
    await post({ items })
    // after successful merge you can keep or clear guest cart
    // keeping is nice so the UI stays consistent until you reload from server
  }

  // call this to replace local cart with server copy on any device
  const loadServerCart: CartCtx["loadServerCart"] = async (fetcher) => {
    const serverItems = await fetcher()
    setItems(
      serverItems.map((i) => {
        const normalized = normalizeLine({
          ...i,
          qty: Math.max(1, Number(i.qty) || 1),
          price: Number(i.price) || 0,
        });
        const key = buildKey(
          normalized.slug,
          normalized.optionLabel,
          normalized.variations,
          (normalized as any).sku
        );
        const finalized: CartItem = { ...normalized, key };
        return finalized;
      })
    )
  }

  const value: CartCtx = {
    items,
    isOpen,
    open,
    close,
    addItem,
    updateQty,
    remove,
    clear,
    subtotal,
    mergeGuestIntoAccount,
    loadServerCart,
  }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useCart() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error("useCart must be used within CartProvider")
  return ctx
}