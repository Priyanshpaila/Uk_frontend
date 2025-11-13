'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import RequireAuth from '@/components/RequireAuth'
import { useCart } from '@/components/cart-context'
import Script from 'next/script'
import { REORDER_ITEMS } from '@/lib/reorder-catalog'
import { mapCartToItems } from '@/utils/orderPayload'

const SERVICE_PREFIX = 'PWL' // Pharmacy Weight Loss
function serviceCode(type: string) {
  const t = (type || '').toLowerCase()
  if (t === 'transfer') return `${SERVICE_PREFIX}T`
  if (t === 'reorder') return `${SERVICE_PREFIX}R`
  if (t === 'current') return `${SERVICE_PREFIX}C`
  if (t === 'consultation') return `${SERVICE_PREFIX}C`
  return `${SERVICE_PREFIX}N` // default new
}
function shortSeqFromId(id?: string) {
  const hex = (id || '').replace(/[^a-f0-9]/gi, '')
  if (!hex) return String(Date.now()).slice(-7)
  const slice = hex.slice(-7)
  const n = parseInt(slice, 16) % 10000000
  return n.toString().padStart(7, '0')
}

type Summary = {
  serviceName: string
  dateText?: string
  patientName?: string
  priceMinor: number
  email?: string
}

function normalizeFlow(raw?: string) {
  const t = (raw || '').toLowerCase().trim()
  if (!t) return ''
  if (['new', 'np', 'newpatient', 'new-patient'].includes(t)) return 'new'
  if (['transfer', 'tp', 'transfer-patient'].includes(t)) return 'transfer'
  if (['reorder', 'refill', 'existing'].includes(t)) return 'reorder'
  if (['current', 'followup', 'follow-up'].includes(t)) return 'current'
  if (['consult', 'consultation'].includes(t)) return 'consultation'
  return t
}

export default function ClientCheckout() {
  return (
    <RequireAuth>
      <ConfirmInner />
    </RequireAuth>
  )
}

function ConfirmInner() {

  // Build and POST a Pending Order with guaranteed variations
  async function postPending(paidFlag: boolean) {
    const cartItemsArr = (items || []) as any[];
    if (process.env.NODE_ENV !== 'production') {
      console.log('[cart raw]', JSON.parse(localStorage.getItem('pe_cart_v1') || '[]'));
      console.log('[cart mapped]', mapCartToItems(items || []));
    }
    const lineItems = mapCartToItems(cartItemsArr);

    // If there's only one line item and it lacks variations, fill it explicitly
    if (lineItems.length === 1 && !lineItems[0].variations) {
      const only = cartItemsArr[0];
      const v =
        only?.variations ??
        only?.selectedLabel ??
        only?.optionLabel ??
        only?.optionText ??
        only?.label ??
        null;
      if (v) lineItems[0].variations = v;
    }

    // ===== DEBUG: inspect what we're about to send =====
    const pendingBody = {
      ref: summary.refCode,
      amountMinor: summary.priceMinor,
      type,
      items: lineItems,
      paid: paidFlag,
      sessionId: sessionId ?? undefined,
      __debug: {
        cartItemsRaw: cartItemsArr,
        lineItemsMapped: lineItems,
      },
    } as const;
    (window as any).__lastPendingBody = pendingBody;
    if (process.env.NODE_ENV !== 'production') {
      console.log('[pending:body]', JSON.stringify(pendingBody, null, 2));
    }

    // Post to correct API endpoint
    try {
      const API = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '') || 'http://127.0.0.1:8000';
      await fetch(`${API}/api/orders/pending`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pendingBody),
      });
    } catch (e) {
      // swallow — not critical to block checkout
      if (process.env.NODE_ENV !== 'production') console.warn('postPending failed', e);
    }
  }
  // Dev/test helper: simulate a successful payment without card entry
  const handleTestSuccess = () => {
    try { localStorage.setItem('orders_dirty', '1') } catch {}

    // Move unitMinor and itemsForTest here
    const unitMinor = Math.round(priceMinor / Math.max(1, qtyNum))
    const itemsForTest = mapCartToItems(items || []);

    (async () => {
      const API = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '') || 'http://127.0.0.1:8000';

      // Also create/ensure the Pending Order via Next API with proper variations
      await postPending(true);

      // 1) Create the order in Laravel with the same reference & meta
      await fetch(`${API}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // If your /api/orders requires auth, include the token:
          // Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          reference: summary.refCode,
          meta: {
            type,
            service: summary.serviceName,
            consultation_session_id: sessionId ?? undefined,
            items: itemsForTest.map((x: any) => ({
              sku: x.sku || null,
              name: String(x.name || 'Item'),
              variations: String(x.variations || ''),
              qty: Math.max(1, Number(x.qty) || 1),
              unitMinor: Number(x.unitMinor || 0) || 0,
              totalMinor: Number(x.totalMinor || 0) || 0,
            })),
          },
        }),
      }).catch(() => {});

      // 2) Simulate the Ryft webhook (marks paid & sets booking_status=pending + creates bookings row)
      await fetch(`${API}/api/webhooks/ryft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: { reference: summary.refCode, paid: true } }),
      }).catch(() => {});
    
    })();

    // Also persist a full multi‑item last_payment so Success page forwards every line
    try {
      localStorage.setItem('last_payment', JSON.stringify({
        ref: summary.refCode,
        amountMinor: summary.priceMinor, // total for the order
        type,
        treatment: summary.treatment || '',
        items: itemsForTest.map((x: any) => ({
          sku: x.sku || 'item',
          name: String(x.name || ''),
          variations: String(x.variations || ''),
          qty: Math.max(1, Number(x.qty) || 1),
        })),
        ts: Date.now(),
      }))
      localStorage.setItem('clear_cart', '1')
    } catch {}

    // Stash a lightweight local order (so Orders shows immediately)
    try {
      const localOrder = {
        id: summary.refCode,
        createdAt: new Date().toISOString(),
        status: 'Paid',
        totalMinor: priceMinor,
        items: (itemsForTest && itemsForTest.length)
          ? itemsForTest.map((x: any) => ({
              sku: x.sku || 'item',
              name: (x.name || '').toString(),           // keep pure product name
              variations: (x.variations || '') + '',     // keep option/strength label separate
              qty: Math.max(1, Number(x.qty) || 1),
              unitMinor: Number(x.unitMinor || 0) || 0,
            }))
          : [
              {
                sku: slugParam || 'item',
                name: (summary.treatment || slugParam || 'Order').toString().split(' — ')[0] || 'Order',
                variations: (summary.treatment || '').includes(' — ')
                  ? (summary.treatment as string).split(' — ').slice(1).join(' — ')
                  : '',
                qty: qtyNum,
                unitMinor,
              },
            ],
      }
      const key = 'local_orders'
      const existing = JSON.parse(localStorage.getItem(key) || '[]')
      const next = [localOrder, ...(Array.isArray(existing) ? existing : [])].slice(0, 5)
      localStorage.setItem(key, JSON.stringify(next))
    } catch {}

    const usp = new URLSearchParams()
    usp.set('ref', summary.refCode)
    if (slugParam) usp.set('slug', slugParam)
    if (Number.isFinite(optionIndexNum)) usp.set('option', String(optionIndexNum))
    usp.set('qty', String(qtyNum))
    usp.set('unitMinor', String(unitMinor))
    usp.set('totalMinor', String(priceMinor))
    if (summary.treatment) usp.set('treatment', summary.treatment)

    router.push(`/private-services/weight-loss/checkout/success?${usp.toString()}`)
  }
  
  const router = useRouter()
  const sp = useSearchParams()
  const sessionIdStr = useMemo(() => {
    try {
      // 1) Prefer explicit query param
      const fromUrl = (sp.get('sessionId') || '').toString().trim()
      if (fromUrl) return fromUrl
      // 2) Fallback to any storage keys set during intake/booking
      const keys = [
        'consultation_session_id',
        'pe_consultation_session_id',
        'intake_session_id',
        'session_id',
      ]
      for (const k of keys) {
        const v =
          (typeof window !== 'undefined' ? localStorage.getItem(k) : '') ||
          (typeof window !== 'undefined' ? sessionStorage.getItem(k) : '') ||
          ''
        if (v && v.trim()) return v.trim()
      }
      return ''
    } catch {
      return ''
    }
  }, [sp])

  const sessionId = useMemo(() => {
    const n = Number(sessionIdStr)
    return Number.isFinite(n) && n > 0 ? n : undefined
  }, [sessionIdStr])

  // normalise/persist for downstream pages just in case
  useEffect(() => {
    if (!sessionId) return
    try {
      localStorage.setItem('consultation_session_id', String(sessionId))
      sessionStorage.setItem('consultation_session_id', String(sessionId))
      // legacy alias
      localStorage.setItem('pe_consultation_session_id', String(sessionId))
    } catch {}
  }, [sessionId])
  const type = useMemo(() => {
    // 1) explicit query keys win
    const explicit = normalizeFlow(
      (sp.get('flow') || sp.get('type') || sp.get('source') || '').toString()
    )
    if (explicit) return explicit

    // 2) stored preference next
    try {
      const stored = normalizeFlow(
        (localStorage.getItem('checkout_source') || localStorage.getItem('flow_type') || '').toString()
      )
      if (stored) return stored
    } catch {}

    // 3) heuristics only as a last resort
    const slugGuess = (sp.get('slug') || '').toString().toLowerCase()
    if (slugGuess.includes('refill') || slugGuess.includes('reorder')) return 'reorder'

    const hasBooking = Boolean(sp.get('bookingId') || sp.get('assessmentId'))
    const hasTreatment = Boolean(sp.get('treatment'))
    if (hasBooking && !hasTreatment && !slugGuess) return 'current'

    return 'new'
  }, [sp])

  // Gather multiple treatment params from URL if present
  const treatmentsFromUrl = useMemo(() => {
    try {
      const arr = sp.getAll('treatment') as unknown as string[]
      return Array.isArray(arr)
        ? arr.map((v) => (v || '').toString().trim()).filter(Boolean)
        : []
    } catch {
      return []
    }
  }, [sp])

  // Reorder context used for price/treatment derivation
  const slugParam = useMemo(() => (sp.get('slug') || '').toString() || (typeof window !== 'undefined' ? (localStorage.getItem('reorder_slug') || '') : ''), [sp]);
  const optionIndexNum = useMemo(() => {
    const raw = (sp.get('option') || (typeof window !== 'undefined' ? localStorage.getItem('reorder_option') : '') || '').toString();
    const n = Number(raw);
    return Number.isFinite(n) ? n : NaN;
  }, [sp]);
  const qtyNum = useMemo(() => {
    const raw = (sp.get('qty') || (typeof window !== 'undefined' ? localStorage.getItem('reorder_qty') : '') || '1').toString();
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : 1;
  }, [sp]);

  const backUrl = useMemo(() => {
    if (type === 'reorder') {
      const params = new URLSearchParams()
      if (slugParam) params.set('slug', slugParam)
      if (Number.isFinite(optionIndexNum)) params.set('option', String(optionIndexNum))
      if (qtyNum > 0) params.set('qty', String(qtyNum))
      const qs = params.toString()
      return `/private-services/weight-loss/reorder${qs ? `?${qs}` : ''}`
    }
    return `/private-services/weight-loss/booking?type=${encodeURIComponent(type || 'new')}`
  }, [type, slugParam, optionIndexNum, qtyNum])

  // Identify this booking/assessment and the Calendly invitee (if present)
  const [bookingId, setBookingId] = useState<string>('');
  const [invitee, setInvitee] = useState<string>('');

  // Prefer an explicit treatment name if provided, otherwise try to build one from slug/option
  const allowStorageTreatment = type !== 'consultation'
  let treatment = ''

  // 1) Use single treatment if present; never concatenate multiple into one label
  if (treatmentsFromUrl.length === 1) {
    treatment = treatmentsFromUrl[0];
  } else {
    treatment = '';
  }

  // 2) Otherwise fall back to single params / stored values, but ignore previously joined strings
  if (!treatment) {
    const fallback =
      sp.get('treatment') ||
      sp.get('svc') ||
      sp.get('product') ||
      sp.get('service') ||
      sp.get('optionLabel') ||
      sp.get('optLabel') ||
      sp.get('label') ||
      (allowStorageTreatment
        ? (localStorage.getItem('treatment_name') ||
           localStorage.getItem('selected_treatment') ||
           localStorage.getItem('reorder_label'))
        : '') ||
      '';

    // If the fallback looks like a concatenated multi-label, ignore it
    treatment = /•|,/.test(String(fallback)) ? '' : String(fallback);
  }

  if (!treatment) {
    const slug = (sp.get('slug') || '').toString();
    const optRaw = (sp.get('option') || '').toString();
    const optIndex = optRaw ? Number(optRaw) : NaN;

    // Minimal in-file catalog fallbacks for common reorder slugs
    const doseMaps: Record<string, string[]> = {
      'mounjaro-refill': ['2.5 mg', '5 mg', '7.5 mg', '10 mg', '12.5 mg', '15 mg'],
      'wegovy-refill': ['0.25 mg', '0.5 mg', '1 mg', '1.7 mg', '2.4 mg'],
      'ozempic-refill': ['0.25 mg', '0.5 mg', '1 mg'],
    };

    if (slug) {
      const key = slug.toLowerCase();
      const doses = doseMaps[key];
      // Prefer a label from the catalog if present
      try {
        const item: any = (REORDER_ITEMS || []).find((i: any) => (i.slug || '').toLowerCase() === key);
        const opt: any = item && (item.options || item.doses || item.variants || [])[optIndex];
        const labelFromCatalog = opt && (opt.label || opt.name || opt.title);
        if (labelFromCatalog) {
          treatment = String(labelFromCatalog);
        }
      } catch {}
      if (doses && Number.isFinite(optIndex) && doses[optIndex]) {
        const brand = key.replace('-refill', '').replace(/\b\w/g, (c) => c.toUpperCase());
        treatment = `${brand} ${doses[optIndex]} (Refill)`;
      } else {
        const readable = slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
        treatment = readable + (Number.isFinite(optIndex) ? ` (option ${optIndex})` : '');
      }
    }
  }
  if (process.env.NODE_ENV !== 'production') console.log('Checkout treatment', treatment)

  useEffect(() => {
    if (type !== 'consultation') return
    try {
      localStorage.removeItem('treatment_name')
      localStorage.removeItem('selected_treatment')
      localStorage.removeItem('reorder_label')
    } catch {}
  }, [type])

  useEffect(() => {
    // Prefer explicit URL params; fall back to any values we saved earlier
    try {
      const idFromUrl = sp.get('bookingId') || sp.get('assessmentId') || '';
      const inviteeFromUrl = sp.get('invitee') || '';
      const idStored = localStorage.getItem('booking_id') || '';
      const inviteeStored = localStorage.getItem('cal_invitee') || '';
      setBookingId(idFromUrl || idStored);
      setInvitee(inviteeFromUrl || inviteeStored);
    } catch {
      // ignore
    }
  }, [sp]);

  const [identity, setIdentity] = useState<{ name: string; email: string }>({ name: '', email: '' })
  const [error, setError] = useState<string | null>(null)
  const [initialising, setInitialising] = useState(false)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [cardValid, setCardValid] = useState(false)
  const [sdkReady, setSdkReady] = useState(false)
  const [tempName, setTempName] = useState('');
  const [tempEmail, setTempEmail] = useState('');
  

  // Cart access
  const { items, subtotal, remove, clear } = useCart?.() || { items: [], subtotal: 0, remove: () => {}, clear: () => {} }
  const treatmentsFromCart = useMemo(() => {
    if (!items?.length) return [] as string[]
    return mapCartToItems(items || [])
      .map((n: any) => {
        const nName = (n.name || '').toString().trim();
        const nVar  = (n.variations || '').toString().trim();
        return nVar ? `${nName} — ${nVar}` : nName;
      })
      .filter(Boolean);
  }, [items]);
  const treatmentFromCart = useMemo(() => treatmentsFromCart.join(' • '), [treatmentsFromCart]);

  useEffect(() => {
    try {
      // 1) direct keys we use across the app
      let name =
        localStorage.getItem('patient_name') ||
        localStorage.getItem('full_name') ||
        localStorage.getItem('name') ||
        '';
      let email =
        localStorage.getItem('patient_email') ||
        localStorage.getItem('email') ||
        '';

      // 2) common JSON blobs we may have saved earlier
      const blobs = [
        localStorage.getItem('user'),
        localStorage.getItem('profile'),
        localStorage.getItem('auth_user'),
        localStorage.getItem('account'),
      ];
      for (const b of blobs) {
        if (!b) continue;
        try {
          const o = JSON.parse(b);
          if (!name) {
            name =
              o?.name ||
              [o?.firstName, o?.lastName].filter(Boolean).join(' ') ||
              [o?.first_name, o?.last_name].filter(Boolean).join(' ') ||
              '';
          }
          if (!email) {
            email = o?.email || o?.primaryEmail || o?.mail || '';
          }
          if (name && email) break;
        } catch { /* ignore bad JSON */ }
      }

      // 3) as a last resort, check sessionStorage too
      if (!name || !email) {
        try {
          const ssName =
            sessionStorage.getItem('patient_name') ||
            sessionStorage.getItem('name') ||
            '';
          const ssEmail =
            sessionStorage.getItem('patient_email') ||
            sessionStorage.getItem('email') ||
            '';
          name = name || ssName || '';
          email = email || ssEmail || '';
        } catch { /* ignore */ }
      }

      setIdentity({ name: name || '', email: email || '' });

      // normalise our canonical keys for downstream pages
      if (name) localStorage.setItem('patient_name', name);
      if (email) localStorage.setItem('patient_email', email);
    } catch {
      /* ignore */
    }
  }, [])
  useEffect(() => {
    setTempName(identity.name || '');
    setTempEmail(identity.email || '');
  }, [identity.name, identity.email]);

  // Helper to resolve price from reorder catalog if available
  function findReorderPriceMinor(slug: string, index: number): number | null {
    try {
      const item: any = (REORDER_ITEMS || []).find((i: any) => (i.slug || '').toLowerCase() === (slug || '').toLowerCase());
      if (!item) return null;
      const variants: any[] = item.options || item.doses || item.variants || [];
      const v = variants[index];
      if (!v) return null;
      // Try common property names
      const p = (typeof v === 'object')
        ? (v.priceMinor ?? v.price_pence ?? v.pricePence ?? (typeof v.price === 'number' ? v.price * 100 : undefined))
        : undefined;
      const asNumber = Number(p);
      return Number.isFinite(asNumber) && asNumber > 0 ? Math.round(asNumber) : null;
    } catch {
      return null;
    }
  }

  const priceMinor = useMemo(() => {
    // 1) Explicit amount in the URL (supports `pricePence`, `price`, or `amount` in minor units)
    const qp = Number(sp.get('pricePence') || sp.get('price') || sp.get('amount') || '');
    if (Number.isFinite(qp) && qp > 0) return Math.round(qp);

    // 2) If this is a reorder, try the strongest signals first
    if (type === 'reorder') {
      // a) Previously stored at the point of selection
      try {
        const stored = Number((typeof window !== 'undefined' ? localStorage.getItem('reorder_price_minor') : '') || '');
        if (Number.isFinite(stored) && stored > 0) return Math.round(stored) * qtyNum;
      } catch {}

      // b) Derive from our in-app catalog using slug + option index
      if (slugParam && Number.isFinite(optionIndexNum)) {
        const fromCatalog = findReorderPriceMinor(slugParam, optionIndexNum);
        if (Number.isFinite(fromCatalog || 0) && (fromCatalog as number) > 0) return (fromCatalog as number) * qtyNum;
      }
    }

    // 3) From cart subtotal (already includes qty when using cart)
    const fromCart = Number.isFinite(subtotal) && subtotal > 0 ? Math.round(subtotal * 100) : 0;
    if (fromCart > 0) return fromCart;

    // 4) Consult-only flow: current patient consultation defaults to £24.99
    if (type === 'current') {
      return Number(process.env.NEXT_PUBLIC_CURRENT_CONSULT_PRICE_PENCE || 2499);
    }

    // 5) Fallback to general consultation price (new/transfer)
    return Number(process.env.NEXT_PUBLIC_CONSULTATION_PRICE_PENCE || 2999);
  }, [sp, subtotal, type, slugParam, optionIndexNum, qtyNum]);

  const summary: Summary & { refCode: string; treatment?: string } = useMemo(() => {
    const serviceName =
      type === 'reorder'
        ? 'Reorder existing treatment'
        : type === 'transfer'
        ? 'Transfer patient consultation'
        : type === 'current'
        ? 'Current patient consultation'
        : type === 'consultation'
        ? 'Consultation'
        : 'New patient consultation'
    const dateText = 'Scheduled via Calendly';
    const patientName = identity.name || undefined;
    const code = serviceCode(type); // PWLN / PWLR / PWLC / PWLT
    const seq = shortSeqFromId(bookingId);
    const refCode = `${code}${seq}`;
    return {
      serviceName,
      dateText,
      patientName,
      priceMinor,
      email: identity.email,
      refCode,
      treatment: type === 'consultation' ? undefined : ((treatment || treatmentFromCart || '') || undefined),
    };
  }, [identity.name, identity.email, type, priceMinor, bookingId, treatment, treatmentFromCart])

  const sessionKey = useMemo(() => JSON.stringify({
    ref: summary.refCode,
    amt: summary.priceMinor,
    trt: summary.treatment || '',
    email: summary.email || '',
    bookingId,
    invitee,
    type,
    items: mapCartToItems(items || []).map((n: any) => [n.sku, (n.variations || ''), n.qty]),
  }), [summary.refCode, summary.priceMinor, summary.treatment, summary.email, bookingId, invitee, type, items]);

  useEffect(() => {
    let cancelled = false

    async function setupRyft() {
      try {
        setInitialising(true)
        setError(null)

        // Ryft metadata must be flat string key/value pairs — no arrays/objects
        const meta: Record<string, string> = {
          bookingId: String(bookingId || ''),
          invitee: String(invitee || ''),
          type: String(type || ''),
          treatment: String((summary.treatment || '').slice(0, 180)),
          cartItems: JSON.stringify(
            mapCartToItems(items || []).map((n: any) => ({
              sku: n.sku,
              name: n.name,
              label: n.variations, // alias for clarity
              variations: n.variations,
              qty: n.qty,
              unitMinor: n.unitMinor,
              totalMinor: n.totalMinor,
            }))
          ).slice(0, 1800),
        };
        const payload = {
          amount: summary.priceMinor,
          currency: process.env.NEXT_PUBLIC_CONSULTATION_CURRENCY || 'GBP',
          description: `${summary.serviceName}`,
          assessmentId: bookingId || undefined,
          customerEmail: summary.email || undefined,
          reference: summary.refCode,
          metadata: meta,
          returnUrl: process.env.NEXT_PUBLIC_RETURN_URL_HTTPS
            ? `${process.env.NEXT_PUBLIC_RETURN_URL_HTTPS.replace(/\/+$/, '')}/private-services/weight-loss/checkout/return`
            : undefined,
        }

        // Ask our frontend API to create a Payment Session (server-side uses the Ryft SECRET)
        // You need an API route at /app/api/pay/ryft/session/route.ts that returns { clientSecret }
        // If you don't have it yet, this will 404 and we show a helpful error.
        const res = await fetch('/api/pay/ryft/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          cache: 'no-store',
        })

        const text = await res.text()
        let data: any;
        try { data = text ? JSON.parse(text) : {} } catch { data = {} }

        const friendly = (s: string) => {
          if (!s) return '';
          const trimmed = s.trim();
          if (trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html')) {
            return 'Could not create payment session (404). Is /api/pay/ryft/session implemented and reachable?';
          }
          return trimmed.slice(0, 400); // prevent huge dumps
        };

        if (!res.ok) {
          const msg = friendly(data?.detail || data?.message || text || 'Could not create payment session');
          throw new Error(msg);
        }

        const secret = data?.clientSecret
        if (!secret) throw new Error('Server did not return clientSecret')

        if (cancelled) return
        setClientSecret(secret)

        // Wait for SDK to be present on window
        const ensureRyft = () =>
          new Promise<void>((resolve, reject) => {
            let tries = 0
            const timer = setInterval(() => {
              tries++
              if (typeof (window as any).Ryft !== 'undefined') {
                clearInterval(timer)
                resolve()
              } else if (tries > 50) {
                clearInterval(timer)
                reject(new Error('Ryft SDK not loaded'))
              }
            }, 100)
          })

        await ensureRyft()
        if (cancelled) return

        const Ryft: any = (window as any).Ryft
        const publicKey = process.env.NEXT_PUBLIC_RYFT_PUBLIC_KEY

        if (!publicKey) {
          throw new Error('Missing NEXT_PUBLIC_RYFT_PUBLIC_KEY')
        }

        // Initialise the embedded form
        Ryft.init({
          publicKey,
          clientSecret: secret,
          // Uncomment to show wallet-only buttons
          // expressCheckout: { enabled: true },
          applePay: {
            merchantName: 'Safescript Pharmacy',
            merchantCountryCode: 'GB',
          },
          googlePay: {
            merchantIdentifier: 'merchant_safescript',
            merchantName: 'Safescript Pharmacy',
            merchantCountryCode: 'GB',
          },
          fieldCollection: {
            billingAddress: {
              display: 'full',
            },
          },
          style: {
            borderRadius: 8,
            backgroundColor: '#ffffff',
            borderColor: '#e5e7eb',
            padding: 12,
            color: '#111827',
            focusColor: '#111827',
            bodyColor: '#ffffff',
          },
        })

        // Enable/disable button based on card validity
        Ryft.addEventHandler('cardValidationChanged', (e: any) => {
          setCardValid(Boolean(e?.isValid))
        })

        // Handle wallet (Apple/Google Pay) result
        async function handlePaymentResult(paymentSession: any) {
          if (paymentSession?.status === 'Approved' || paymentSession?.status === 'Captured') {
            // Success — record last payment details for Success page & Orders, signal cart clear
            try {
              localStorage.setItem('orders_dirty', '1')
              localStorage.setItem(
                'last_payment',
                JSON.stringify({
                  ref: summary.refCode,
                  amountMinor: summary.priceMinor,
                  type,
                  treatment: summary.treatment || '',
                  items: mapCartToItems(items || []).map((n: any) => ({
                    sku: n.sku,
                    name: n.name,
                    variations: n.variations,
                    qty: n.qty,
                    unitMinor: n.unitMinor,
                    totalMinor: n.totalMinor,
                  })),
                  ts: Date.now(),
                })
              )
              localStorage.setItem('clear_cart', '1')
            } catch {}
            const toParams = new URLSearchParams({ ref: summary.refCode })
            if (sessionId) toParams.set('sessionId', String(sessionId))
            const to = `/private-services/weight-loss/checkout/success?${toParams.toString()}`
            await postPending(true);
            window.location.href = to
            return
          }
          if (paymentSession?.lastError) {
            const msg = Ryft.getUserFacingErrorMessage(paymentSession.lastError)
            setError(msg || 'Payment declined')
          }
        }

        Ryft.addEventHandler('walletPaymentSessionResult', (e: any) => {
          handlePaymentResult(e?.paymentSession)
        })

        setSdkReady(true)
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to initialise payments')
      } finally {
        if (!cancelled) setInitialising(false)
      }
    }

    setupRyft()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionKey]);

  const totalDisplay = `£${(summary.priceMinor / 100).toFixed(2)}`

  const revealPay = () => {
    try {
      const form = document.getElementById('ryft-pay-form');
      form?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      const btn = document.getElementById('ryft-pay-btn') as HTMLButtonElement | null;
      btn?.focus();
    } catch {
      // no-op
    }
  };

  return (
    <main className="bg-white min-h-screen">
      <Script src="https://embedded.ryftpay.com/v2/ryft.min.js" strategy="afterInteractive" />
      <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => router.push(backUrl)}
          className="inline-flex items-center gap-2 text-sm text-emerald-400 hover:text-emerald-900 font-medium rounded-full border border-emerald-400 px-4 py-2"
        >
          <span className="text-lg">←</span>
          <span>Back</span>
        </button>
      </div>

      <section className="max-w-3xl mx-auto px-4 lg:px-6 py-10">
        <h1 className="text-2xl font-semibold">Review and pay</h1>
        <p className="mt-2 text-zinc-700">
          Your consultation has been scheduled. Review your booking, then choose a payment option.
        </p>

        <div className="mt-6 space-y-6">
          <div className="rounded-2xl border border-zinc-200 shadow-sm p-4">
            <h2 className="text-lg font-medium">Booking summary</h2>
            <div className="mt-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span>Service</span><span>{summary.serviceName}</span>
              </div>
              <div className="flex justify-between">
                <span>Treatment</span>
                {type === 'consultation' ? (
                  <span>—</span>
                ) : (treatmentsFromCart && treatmentsFromCart.length > 0) ? (
                  <span className="text-right whitespace-pre-line">
                    {treatmentsFromCart.join('\n')}
                  </span>
                ) : (
                  <span className="text-right whitespace-pre-line">
                    {(summary.treatment || '—')}
                  </span>
                )}
              </div>
              <div className="flex justify-between">
                <span>Scheduled by</span><span>{summary.patientName || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span>Email</span><span>{summary.email || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span>Reference</span><span>{summary.refCode}</span>
              </div>
              <div className="flex justify-between font-medium pt-2 border-t mt-2">
                <span>Total</span><span>{totalDisplay}</span>
              </div>
            </div>
            {(!summary.patientName || !summary.email) && (
              <div className="mt-4 border-t pt-3">
                <p className="text-sm text-zinc-700 mb-2">Add your details to prefill payment and emails</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Full name"
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    value={tempEmail}
                    onChange={(e) => setTempEmail(e.target.value)}
                    className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
                  />
                </div>
                <div className="mt-3">
                  <button
                    type="button"
                    className="px-4 py-2 rounded-full bg-emerald-600 text-white text-sm"
                    onClick={() => {
                      const n = (tempName || '').trim();
                      const e = (tempEmail || '').trim();
                      if (n) {
                        try { localStorage.setItem('patient_name', n); } catch {}
                      }
                      if (e) {
                        try { localStorage.setItem('patient_email', e); } catch {}
                      }
                      setIdentity({ name: n || identity.name, email: e || identity.email });
                    }}
                  >
                    Save details
                  </button>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="rounded-xl bg-rose-50 text-rose-700 p-3 text-sm">{error}</div>
          )}

          <div className="rounded-2xl border border-zinc-200 shadow-sm p-4 space-y-3">
            {/* Embedded Ryft form mounts inside this form */}
            <form
              id="ryft-pay-form"
              className="space-y-3"
              onSubmit={async (e) => {
                e.preventDefault()
                const Ryft: any = (window as any).Ryft
                if (!Ryft || !clientSecret) {
                  setError('Payments not ready yet')
                  return
                }
                // Attempt payment; result for cards is returned here, wallets via event
                Ryft.attemptPayment({
                  // Passing both is safe; Ryft ignores fields it already has from init
                  clientSecret,
                  customerEmail: summary.email,
                })
                  .then(async (paymentSession: any) => {
                    if (paymentSession?.status === 'Approved' || paymentSession?.status === 'Captured') {
                      try {
                        localStorage.setItem('orders_dirty', '1')
                        localStorage.setItem(
                          'last_payment',
                          JSON.stringify({
                            ref: summary.refCode,
                            amountMinor: summary.priceMinor,
                            type,
                            treatment: summary.treatment || '',
                            items: mapCartToItems(items || []).map((n: any) => ({
                              sku: n.sku,
                              name: n.name,
                              variations: n.variations,
                              qty: n.qty,
                              unitMinor: n.unitMinor,
                              totalMinor: n.totalMinor,
                            })),
                            ts: Date.now(),
                          })
                        )
                        localStorage.setItem('clear_cart', '1')
                      } catch {}
                      await postPending(true);
                      const toParams = new URLSearchParams({ ref: summary.refCode })
                      if (sessionId) toParams.set('sessionId', String(sessionId))
                      const to = `/private-services/weight-loss/checkout/success?${toParams.toString()}`
                      window.location.href = to
                      return
                    }
                    if (paymentSession?.lastError) {
                      const msg = Ryft.getUserFacingErrorMessage(paymentSession.lastError)
                      setError(msg || 'Payment declined')
                    }
                  })
                  .catch((err: any) => {
                    setError(err?.message || 'Payment failed')
                  })
              }}
            >
              <button
                id="ryft-pay-btn"
                type="submit"
                disabled={!sdkReady || !clientSecret || !cardValid || initialising}
                className="w-full px-4 py-3 rounded-full bg-black text-white disabled:opacity-50 justify-center"
              >
                {initialising ? 'Loading payment…' : `Pay ${totalDisplay}`}
              </button>
              <div id="ryft-pay-error" className="text-sm text-rose-600">{error}</div>
              <p className="text-xs text-zinc-500">
                Apple Pay / Google Pay buttons will appear automatically on compatible devices.
              </p>
            </form>
            
            <div className="pt-3 border-t mt-3 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={revealPay}
                disabled={!sdkReady || !clientSecret || initialising}
                className={`w-full sm:flex-1 px-4 py-2 rounded-full text-white ${(!sdkReady || !clientSecret || initialising) ? 'bg-gray-400 cursor-not-allowed' : 'bg-black hover:bg-zinc-900'}`}
                aria-label="Open payment form"
                title="Open payment form"
              >
                Pay
              </button>
              <button
                type="button"
                onClick={handleTestSuccess}
                className="w-full sm:flex-1 px-4 py-2 rounded-full border border-emerald-500 text-emerald-700 hover:bg-emerald-50"
              >
                Test success (skip card)
              </button>
            </div>
            
          </div>
        </div>
      </section>
    </main>
  )
}
