'use client'
const API_BASE = ((process.env.NEXT_PUBLIC_API_BASE_URL || '') || 'http://127.0.0.1:8000/api').replace(/\/+$/, '')
const API_ORIGIN = API_BASE.replace(/\/api$/, '')
const api = (p: string) => (p.startsWith('/') ? `${API_BASE}${p}` : p)
if (typeof window !== 'undefined') {
  try { console.debug('[success] API_BASE', API_BASE, 'API_ORIGIN', API_ORIGIN) } catch {}
}

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

export default function Success() {
  const params = useSearchParams()

  // ref & type
  const ref = (() => {
    try {
      const last = JSON.parse(typeof window !== 'undefined' ? (localStorage.getItem('last_payment') || 'null') : 'null')
      const paramRef = (params.get('ref') || params.get('reference') || params.get('order') || '')
      const lastRef = last?.ref || ''
      return (paramRef || lastRef)
    } catch {
      return (params.get('ref') || params.get('reference') || params.get('order') || '')
    }
  })()

  const type = (() => {
    try {
      const last = JSON.parse(typeof window !== 'undefined' ? (localStorage.getItem('last_payment') || 'null') : 'null')
      const raw = (last?.type || params.get('type') || '').toString().toLowerCase().trim()
      if (['new','transfer','current','reorder','consultation'].includes(raw)) return raw as any
      return raw === 'consult' ? 'consultation' : 'new'
    } catch { return 'new' }
  })() as 'new' | 'transfer' | 'current' | 'reorder' | 'consultation'

  const [paymentStatus, setPaymentStatus] = useState('')
  const [bookingStatus, setBookingStatus] = useState('')
  const [orderJson, setOrderJson] = useState<any>(null)
  const [polling, setPolling] = useState(false)
  const postedOnceRef = useRef(false)
  const startedRef = useRef(false)

  // Post lightweight pending order + clear carts
  useEffect(() => {
    try {
      // Idempotency: if no ref, or this ref already handled, skip
      if (!ref) return
      if (postedOnceRef.current) return
      if (wasDone(ref)) return
      postedOnceRef.current = true
      const last = safeJson(localStorage.getItem('last_payment'))
      // Retrieve sessionId from last_payment or localStorage
      const sessionId = last?.sessionId || last?.session_id || last?.session || safeJson(localStorage.getItem('consultation_session_id')) || null;
      // Prefer explicit lines: last.items, but fall back to last.meta.items if present
      const lastItems: any[] =
        (Array.isArray(last?.items) ? last.items :
         (Array.isArray(last?.meta?.items) ? last.meta.items : [])) || []

      const cartArr: any[] = safeJson(localStorage.getItem('pe_cart_v1')) || []

      // extra debug to verify inputs
      try {
        console.debug('[success] last_items →', lastItems)
        console.debug('[success] cart_items →', cartArr)
      } catch {}

      // Clear local carts
      try {
        localStorage.removeItem('pe_cart_v1')
        localStorage.removeItem('guest_cart_v1')
        localStorage.removeItem('cart')
        localStorage.setItem('clear_cart', '1')
        window.dispatchEvent(new Event('cart:clear'))
      } catch {}

      // Normalized items (no name+variation concat)
      let items = normalizeItems(lastItems, cartArr)

      // Fallback single line from URL if needed (display only)
      // Fallback single line ONLY if still empty
      if (!items.length) {
        const qty = Math.max(1, toInt(params.get('qty')) || 1)
        const unitMinor = toInt(params.get('unitMinor')) || 0
        const nameRaw = (params.get('treatment') || params.get('name') || 'Item').toString().trim()
        items = [normalizeItem({ sku: 'item', name: nameRaw, qty, unitMinor })]
      }

      const postedItems = items.slice(); // freeze what we’re about to send

      const amountMinor =
        toInt(last?.amountMinor) ||
        toInt(params.get('amountMinor')) ||
        toInt(params.get('totalMinor')) ||
        postedItems.reduce((s, it) => s + (it.totalMinor ?? it.unitMinor * Math.max(1, it.qty || 1)), 0)

      let selectedProduct: any = undefined
      if (postedItems.length === 1) {
        const f = postedItems[0]
        selectedProduct = {
          name: f.name,
          variation: f.variations ?? null,
          strength: f.variations ?? null,
          qty: f.qty,
          unitMinor: f.unitMinor,
          totalMinor: f.totalMinor ?? f.unitMinor * f.qty,
        }
      }

      const body = {
        ref,
        amountMinor,
        paid: true,
        type,
        createdAt: new Date().toISOString(),
        items: postedItems, // exact items we’re sending
        // compat lines array for admin UI (includes price fields)
        lines: postedItems.map((i, idx) => ({
          index: idx,
          name: i.name,
          qty: i.qty,
          variation: i.variations ?? null,
          unitMinor: i.unitMinor,
          priceMinor: i.unitMinor,
          totalMinor: i.totalMinor ?? (i.unitMinor * Math.max(1, i.qty || 1)),
        })),
        ...(selectedProduct ? { selectedProduct } : {}),
        token: (localStorage.getItem('token') || localStorage.getItem('auth_token') || undefined),
        sessionId,
      }

      console.debug('[success] pending items →', postedItems)
      console.debug('[success] pending body →', body)

      ;(async () => {
        try {
          const resp = await fetch('/api/orders/pending', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            cache: 'no-store',
          })
          try { console.debug('[success] POST /api/orders/pending →', resp.status) } catch {}
        } catch (err) {
          try { console.debug('[success] POST /api/orders/pending failed →', err) } catch {}
        }
      })()

      // Local order mirrors exactly what we posted
      const localOrder = {
        id: ref || `temp-${Date.now()}`,
        reference: ref || undefined,
        createdAt: new Date().toISOString(),
        status: 'Pending',
        totalMinor: amountMinor,
        items: postedItems.map(i => ({
          sku: i.sku || 'item',
          name: i.name,
          variations: i.variations ?? null,   // plural
          variation: i.variations ?? null,    // legacy/singular
          strength: i.variations ?? null, 
          qty: i.qty,
          unitMinor: i.unitMinor,
          totalMinor: i.totalMinor ?? i.unitMinor * i.qty,
        })),
      }
      // Debug preview of localOrder before saving
      try {
        console.debug('[success] localOrder preview →', localOrder)
        console.debug('[success] localOrder.items length →', Array.isArray(localOrder.items) ? localOrder.items.length : 0)
      } catch {}
      const key = 'local_orders'
      const prev: any[] = safeJson(localStorage.getItem(key)) || []
      const refKey = String(localOrder.reference || localOrder.id || '')
      const dedup = (Array.isArray(prev) ? prev : []).filter(p => String(p?.reference || p?.id || '') !== refKey)
      const next = [localOrder, ...dedup].slice(0, 5)
      localStorage.setItem(key, JSON.stringify(next))
      try { window.dispatchEvent(new Event('orders:updated')) } catch {}
      try { console.debug('[success] saved local_orders →', next) } catch {}

      // Mark this reference as processed to avoid duplicates across re-renders
      markDone(ref)

      // tidy
      try { localStorage.removeItem('last_payment') } catch {}
      try { sessionStorage.removeItem('pe_selected_treatments') } catch {}
    } catch (e) {
      console.debug('[success] init failed', e)
    }
  }, [params, ref, type])

  // Poll the order for statuses
  useEffect(() => {
    if (!ref) return
    if (startedRef.current) return
    startedRef.current = true

    let cancelled = false
    let iv: any = null

    const fetchOrder = async () => {
      const token = typeof window !== 'undefined' ? (localStorage.getItem('token') || localStorage.getItem('auth_token') || '') : ''
      const url = api(`/account/orders/by-ref/${encodeURIComponent(ref)}`)
      try {
        const r = await fetch(url, { headers: { 'Accept': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }, cache: 'no-store' })
        if (!r.ok || cancelled) return
        const data = await r.json()

        if (process.env.NODE_ENV !== 'production') {
          console.debug('[success] by-ref payload →', data)
        }

        setOrderJson(data)
        const pay = String(data?.payment_status || '')
        const book = String(data?.booking_status || '')
        setPaymentStatus(pay)
        setBookingStatus(book)

        // Stop polling if we have a final state
        if (pay === 'paid' && (book === 'approved' || book === 'rejected' || book === '')) {
          if (iv) clearInterval(iv)
          setPolling(false)
        }
      } catch (e) {
        console.debug('[success] fetchOrder error', e)
      }
    }

    // first hit immediately
    fetchOrder()
    setPolling(true)

    // poll a few times while pending
    let tries = 0
    iv = setInterval(() => {
      if (cancelled) return
      tries += 1
      if (tries > 8) {
        clearInterval(iv)
        setPolling(false)
        return
      }
      fetchOrder()
    }, 2000)

    return () => {
      cancelled = true
      if (iv) clearInterval(iv)
      setPolling(false)
    }
  }, [ref])

  return (
    <main className="max-w-2xl mx-auto px-6 py-16">
      <div className="bg-white shadow-sm border rounded-2xl p-8">
        <div className="mx-auto w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <h1 className="mt-6 text-2xl font-semibold text-emerald-700 text-center">Payment successful</h1>
        <p className="mt-2 text-center text-gray-700">Thank you for your order. Your payment has been processed.</p>

        {ref ? (
          <div className="mt-2 text-center">
            <p className="text-gray-600">Order reference {ref}</p>
            <div className="mt-2 flex items-center justify-center gap-2 text-sm">
              {paymentStatus && (
                <span className={`rounded-full px-3 py-1 ${paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-800' : paymentStatus === 'refunded' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-700'}`}>
                  {paymentStatus === 'paid' ? 'Paid' : paymentStatus === 'refunded' ? 'Refunded' : paymentStatus}
                </span>
              )}
              {bookingStatus === 'pending' && <span className="rounded-full px-3 py-1 bg-amber-100 text-amber-800">Pending approval</span>}
              {bookingStatus === 'approved' && <span className="rounded-full px-3 py-1 bg-emerald-100 text-emerald-800">Approved</span>}
              {bookingStatus === 'rejected' && <span className="rounded-full px-3 py-1 bg-red-100 text-red-800">Not approved</span>}
            </div>
          </div>
        ) : null}

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Link href="/account?tab=orders&refresh=1" className="w-full text-center rounded-full bg-emerald-600 text-white px-4 py-2.5 hover:bg-emerald-700 transition">View my orders</Link>
          <Link href="/" className="w-full text-center rounded-full border border-gray-300 px-4 py-2.5 hover:bg-gray-50 transition">Go to homepage</Link>
        </div>

        {/* What happens next (simple) */}
        {type !== 'consultation' && (
          <div className="mt-8 rounded-xl bg-emerald-50 text-emerald-900 p-4">
            <p className="font-medium">What happens next</p>
            <ul className="mt-2 list-disc pl-5 space-y-1 text-sm">
              <li>You will receive a confirmation email shortly</li>
              <li>Our clinician will review your details and prescription</li>
              <li>We will update you when your order is dispatched</li>
            </ul>
          </div>
        )}

        {/* Debug area */}
        {process.env.NODE_ENV !== 'production' && ref && (
          <div className="mt-6 border-t pt-4 text-xs text-gray-600">
            <div className="flex items-center justify-between">
              <div>
                <span className="inline-block mr-3">Debug:</span>
                <span>payment_status = <code>{paymentStatus || '""'}</code></span>
                <span className="ml-3">booking_status = <code>{bookingStatus || '""'}</code></span>
                {polling && <span className="ml-3 text-amber-700">(polling…)</span>}
              </div>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await fetch(API_ORIGIN + '/api/webhooks/ryft', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ data: { reference: ref, paid: true } }),
                    })
                    const token = typeof window !== 'undefined' ? (localStorage.getItem('token') || localStorage.getItem('auth_token') || '') : ''
                    const url = api(`/account/orders/by-ref/${encodeURIComponent(ref)}`)
                    const r = await fetch(url, { headers: { 'Accept': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }, cache: 'no-store' })
                    if (r.ok) {
                      const data = await r.json()
                      setOrderJson(data)
                      setPaymentStatus(String(data?.payment_status || ''))
                      setBookingStatus(String(data?.booking_status || ''))
                    }
                  } catch {}
                }}
                className="ml-3 rounded-full border px-3 py-1 hover:bg-gray-50"
              >
                Force webhook (dev)
              </button>
            </div>
            {orderJson && <pre className="mt-2 max-h-40 overflow-auto bg-gray-50 p-2 rounded">{JSON.stringify(orderJson, null, 2)}</pre>}
          </div>
        )}
      </div>
    </main>
  )
}

/* ---------------- helpers (minimal) ---------------- */

const DONE_PREFIX = 'success_done_'
function wasDone(r: string) {
  try { return !!(r && localStorage.getItem(DONE_PREFIX + r)) } catch { return false }
}
function markDone(r: string) {
  try { if (r) localStorage.setItem(DONE_PREFIX + r, '1') } catch {}
}

function safeJson(s: any) { try { return s ? JSON.parse(String(s)) : null } catch { return null } }
function toInt(x: any) { const n = Number(x); return Number.isFinite(n) ? Math.trunc(n) : 0 }
function toMinor(val: any) {
  if (val == null || val === '') return 0
  const s = String(val); const num = Number(val)
  if (Number.isNaN(num)) return 0
  return s.includes('.') ? Math.round(num * 100) : Math.round(num)
}

function normalizeItems(fromLast: any, fromCart: any[]) {
  const cart: any[] = Array.isArray(fromCart) ? fromCart : []
  const lastRaw: any[] = Array.isArray(fromLast) ? fromLast : []

  // If we already have explicit cart lines, ignore any combined line from last_payment
  const last = cart.length
    ? lastRaw.filter(r => {
        const sku = String(r?.sku || '')
        const variations = String(r?.variations ?? r?.variation ?? '')
        const looksCombined = sku === 'item' || variations.includes(' • ')
        return !looksCombined
      })
    : lastRaw

  const merged = [...cart, ...last]
  const seen = new Set<string>()
  const out: any[] = []
  for (const raw of merged) {
    const i = normalizeItem(raw)
    const key = `${i.sku}::${i.variations || ''}::${i.name}`
    if (!seen.has(key)) { seen.add(key); out.push(i) }
  }
  return out
}

function normalizeItem(i: any) {
  const qty = Math.max(1, Number(i?.qty) || Number(i?.quantity) || 1)

  // prefer explicit variation fields from payload/cart
  let variation: string | null =
    (i?.variations ?? i?.variation ?? i?.optionLabel ?? i?.selectedLabel ?? i?.label ?? i?.strength ?? i?.dose ?? null) as any

  // clean base name (never concatenate with variation)
  let name = (i?.product?.name || i?.baseName || i?.name || i?.title || 'Item').toString().trim()
  const sku = (i?.sku || i?.slug || i?.id || 'item').toString()

  // --- Generic, non hard-coded name → variation extraction ---
  // If no explicit variation is present, try to infer it using SKU prefixes like "mounjaro:15mg"
  // or other "brand:variant" styles. We only split when the name begins with the SKU's base.
  if (!variation && sku.includes(':')) {
    const skuBaseRaw = sku.split(':')[0].replace(/[-_]+/g, ' ').trim()
    if (skuBaseRaw) {
      const nameLC = name.toLowerCase()
      const baseLC = skuBaseRaw.toLowerCase()
      if (nameLC.startsWith(baseLC + ' ') && name.length > skuBaseRaw.length + 1) {
        variation = name.slice(skuBaseRaw.length + 1).trim() || null
        name = titleCase(skuBaseRaw)
      }
    }
  }

  // If still no variation, a light heuristic:
  // - If the name starts with a word chunk followed by a piece beginning with a number (e.g., "X 2.5mg …"),
  //   split on the first space before the digit sequence.
  if (!variation) {
    const m = /^(.+?)\s+(\d[\s\S]*)$/.exec(name)
    if (m && m[1] && m[2]) {
      name = m[1].trim()
      variation = m[2].trim() || null
    }
  }

  const unitMinor = toMinor(i?.unitMinor ?? i?.priceMinor ?? i?.amountMinor ?? i?.unit_price ?? i?.price ?? 0)
  const totalMinor = (typeof i?.totalMinor === 'number' ? i.totalMinor : undefined) ?? (unitMinor * qty)

  return {
    sku,
    name,
    variations: variation ?? null,
    strength: variation ?? null, // legacy mirror for admin
    qty,
    unitMinor,
    totalMinor,
  }
}

function titleCase(s: string) {
  return s.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
}