import { NextRequest, NextResponse } from 'next/server'

// Helper types / utils
type Line = {
  sku?: string | null
  name?: string
  variations?: string | null
  strength?: string | null
  optionLabel?: string | null
  dose?: string | null
  variant?: string | null
  option?: string | null
  qty?: number
  unitMinor?: number
  priceMinor?: number
  amountMinor?: number
  totalMinor?: number
  [k: string]: any
}

const asInt = (v: any, d = 0) => {
  const n = Number(v)
  return Number.isFinite(n) ? Math.trunc(n) : d
}
const asQty = (v: any) => Math.max(1, asInt(v, 1))

const sumTotalMinor = (items: Line[]) => items.reduce((acc, it) => acc + (asInt(it.totalMinor, 0) || 0), 0)

// Coerce numbers or strings like "£149.99", "149.99", "149,99", "14999" to pence
function toMinor(v: any): number {
  if (v == null) return 0;

  // Already a number2
  if (typeof v === 'number' && Number.isFinite(v)) {
    // If integer and looks large, treat as already minor
    if (Number.isInteger(v) && Math.abs(v) >= 1000) return Math.trunc(v);
    // If integer but small (e.g., 99) we cannot be sure; prefer treating as minor if >= 100
    if (Number.isInteger(v) && Math.abs(v) >= 100) return Math.trunc(v);
    // Otherwise treat as major units
    return Math.round(v * 100);
  }

  // String: strip currency symbols and spaces
  if (typeof v === 'string') {
    let s = v.trim();
    if (!s) return 0;
    s = s.replace(/[£$\s]/g, '');
    // Handle thousands commas and European decimal commas
    // If there is both comma and dot, remove thousands separators
    const hasComma = s.includes(',');
    const hasDot = s.includes('.');
    if (hasComma && hasDot) {
      // remove thousands commas like "1,234.56"
      s = s.replace(/,/g, '');
    } else if (hasComma && !hasDot) {
      // treat comma as decimal
      s = s.replace(',', '.');
    }
    // Remove any leftover thousand separators
    s = s.replace(/,/g, '');

    // If it's now a float-like string
    if (/^-?\d+(\.\d{1,2})?$/.test(s)) {
      const f = Number(s);
      if (!Number.isFinite(f)) return 0;
      if (s.includes('.')) return Math.round(f * 100);
      // No decimals: if big assume already minor
      if (Math.abs(f) >= 1000) return Math.trunc(f);
      return Math.trunc(f * 100);
    }

    // Fallback: integer parse
    const intVal = parseInt(s, 10);
    if (Number.isFinite(intVal)) return intVal;
  }

  return 0;
}

export async function GET() {
  // Some clients prefetch/ping this route. Reply 200 so it doesn't show as an error.
  return NextResponse.json({ ok: true, hint: 'Use POST /api/orders/pending for writes' }, { status: 200 })
}

export async function HEAD() {
  return new NextResponse(null, { status: 200 })
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: { 'Access-Control-Allow-Methods': 'POST, GET, HEAD, OPTIONS' } })
}

export async function POST(req: NextRequest) {
  const body = await req.json()

  // Pull token from body (success page sends it), or Authorization header
  const tokenFromBody: string | undefined = body?.token
  const headerAuth = req.headers.get('authorization') || ''
  const tokenFromHeader = headerAuth?.toLowerCase().startsWith('bearer ')
    ? headerAuth.slice(7)
    : undefined
  const token = tokenFromBody || tokenFromHeader

  // Normalize a product line from many possible shapes
  const b: any = body || {}

  const url = new URL(req.url);
  const slug =
    b.service_slug ??
    b.slug ??
    url.searchParams.get('slug') ??
    null;

  const sessionIdRaw =
    b.session_id ??
    b.sessionId ??
    url.searchParams.get('session_id') ??
    url.searchParams.get('sessionId') ??
    null;

  const session_id = sessionIdRaw ? Number(sessionIdRaw) : undefined;

  // Appointment timestamps passed from client (keep raw; API will persist to order meta)
  const appointment_start_at: string | undefined = (
    b.appointment_start_at ??
    b.appointment_at ??
    b.start_at ??
    b.appointment?.start_at ??
    url.searchParams.get('appointment_start_at') ??
    url.searchParams.get('appointment_at') ??
    undefined
  )?.toString();

  const appointment_end_at: string | undefined = (
    b.appointment_end_at ??
    b.end_at ??
    b.appointment?.end_at ??
    url.searchParams.get('appointment_end_at') ??
    undefined
  )?.toString();

  // Order-level amount (used only to detect bad per-line totals that equal the whole order)
  const orderAmountMinor: number | null = Number.isFinite(Number(b.amountMinor ?? b.totalMinor)) ? asInt(b.amountMinor ?? b.totalMinor) : null

  const coerceInt = (v: any, d = 0) => v
  const coerceQty = (v: any) => v

  // Prefer explicit selectedProduct or product objects
  const selected = b.selectedProduct || b.product || null

  // Normalize items coming from the client; prefer explicit array
  const rawItems: Line[] = Array.isArray(b.items) ? (b.items as Line[]) : []
  const itemsCount = rawItems.length

  // Map to a consistent shape — do NOT split names or derive variations; trust provided fields only
  let itemsNormalized: Line[] = rawItems.map((it) => {
    const qty = asQty(it.qty ?? it.quantity)
    const name = String(it.name ?? it.title ?? it.product_name ?? 'Item').trim()
    const variations = ((): string | null => {
      const v = (
        it.variations ?? it.variation ?? it.optionLabel ?? it.label ??
        it.variant_title ?? it.variant ?? it.strength ?? it.dose ?? it.option ?? null
      ) as string | null;
      const s = (v ?? '').toString().trim();
      return s.length > 0 ? s : null;
    })()

    const unitMinor = (() => {
      // Prefer explicit per-line unit price in many possible fields.
      // We keep the key names so we can handle totals vs units correctly.
      const candidates: Array<[any, string]> = [
        [it.unitMinor, 'unitMinor'],
        [it.priceMinor, 'priceMinor'],
        [it.unit_price_minor, 'unit_price_minor'],
        [it.unit_price, 'unit_price'],
        [it.unitPriceMinor, 'unitPriceMinor'],
        [it.unitPrice, 'unitPrice'],
        [it.unit_price_pence, 'unit_price_pence'],
        [it.price_pence, 'price_pence'],
        [it.pricePence, 'pricePence'],
        [it.unitPence, 'unitPence'],
        [it.unit, 'unit'],
        [it.price, 'price'], // major units
        // Additional common aliases
        [it.unitAmountMinor, 'unitAmountMinor'],
        [it.unit_amount_minor, 'unit_amount_minor'],
        [it.lineUnitMinor, 'lineUnitMinor'],
        [it.line_unit_minor, 'line_unit_minor'],
        [it.priceEachMinor, 'priceEachMinor'],
        [it.price_each_minor, 'price_each_minor'],
        [it.priceEach, 'priceEach'],
        [it.price_each, 'price_each'],
        [it.perUnitMinor, 'perUnitMinor'],
        [it.per_unit_minor, 'per_unit_minor'],
      ];

      for (const [cand, key] of candidates) {
        const m = toMinor(cand);
        if (m > 0) {
          // If this equals the whole order amount while there are many items, it's probably bogus.
          if (orderAmountMinor !== null && itemsCount > 1 && m === orderAmountMinor) {
            continue;
          }

          // If the key looks like a total (not a unit), derive per-unit by dividing by qty.
          const looksLikeTotal = /total|subtotal|amountMinor|line_?total/i.test(key);
          if (looksLikeTotal) {
            const q = qty > 0 ? qty : 1;
            const perUnit = Math.floor(m / q);
            if (perUnit > 0) return asInt(perUnit, 0);
            continue;
          }

          // Otherwise treat the candidate as a true unit price.
          return asInt(m, 0);
        }
      }

      // NOTE: Do NOT use amountMinor here — it's order-level, not a per-line total.
      // As a final fallback: derive from sensible per-line total fields (again divide by qty)
      const rawLineTotal = toMinor(
        it.totalMinor ?? it.lineTotalMinor ?? it.subtotal ?? it.total
      );
      if (rawLineTotal > 0) {
        if (orderAmountMinor !== null && itemsCount > 1 && rawLineTotal === orderAmountMinor) {
          return 0; // looks like order-level total copied to line
        }
        const q = qty > 0 ? qty : 1;
        return asInt(Math.floor(rawLineTotal / q), 0);
      }

      return 0;
    })()

    const totalMinor = (() => {
      const rawLineTotal = toMinor(
        it.totalMinor ??
        it.lineTotalMinor ??
        it.subtotalMinor ??
        it.line_total_minor ??
        it.line_total ??
        it.lineTotalPriceMinor ??
        it.line_total_price_minor ??
        it.priceTotalMinor ??
        it.price_total_minor ??
        it.subtotal ??
        it.total
      );
      if (rawLineTotal > 0) {
        if (orderAmountMinor !== null && itemsCount > 1 && rawLineTotal === orderAmountMinor) {
          return unitMinor > 0 ? unitMinor * qty : 0;
        }
        return rawLineTotal;
      }
      if (unitMinor > 0) return unitMinor * qty;
      return 0;
    })()

    return {
      sku: it.sku ?? it.key ?? it.id ?? 'item',
      name,
      variations,
      qty,
      unitMinor,
      totalMinor,
    } as Line
  })

  // Clean up whitespace in name/variations
  itemsNormalized = itemsNormalized.map((it) => {
    const clean = (s?: string | null) =>
      (s ?? '')
        .toString()
        .replace(/\s*([,•])\s*/g, ' $1 ') // tidy spaces around separators
        .replace(/\s+/g, ' ')
        .trim() || null;

    return {
      ...it,
      name: clean(it.name) ?? 'Item',
      variations: clean(it.variations),
    };
  });

  // If single item and variation is still missing, try structured sources from the request (no name parsing)
  if (itemsNormalized.length === 1 && (!itemsNormalized[0].variations || itemsNormalized[0].variations === '')) {
    let candidate = (
      b.variations ?? b.variation ??
      selected?.variations ?? selected?.optionLabel ?? selected?.label ?? selected?.option_text ?? selected?.optionText ??
      selected?.variant ?? selected?.dose ?? selected?.strength ??
      // checkout-level structured labels
      b.selectedLabel ?? b.optionLabel ?? b.option_label ?? b.optionText ?? b.option_text ??
      (Array.isArray(b.treatmentsFromCart) && b.treatmentsFromCart.length ? b.treatmentsFromCart[0] : null) ??
      b.summary?.treatment ?? b.treatment ??
      null
    ) as string | null

    if (candidate && String(candidate).trim() !== '') {
      itemsNormalized[0].variations = String(candidate).trim()
    }
  }

  // Decide whether to include selectedProduct: only when there is a single item
  const hasMultiple = itemsNormalized.length > 1;
  const selectedBase = (!hasMultiple && selected) ? selected : null;

  const selectedVariationsClean = (() => {
    if (!selectedBase) return undefined;
    const raw = (
      (selectedBase as any)?.variations ?? (selectedBase as any)?.optionLabel ?? (selectedBase as any)?.label ??
      (selectedBase as any)?.option_text ?? (selectedBase as any)?.optionText ??
      (selectedBase as any)?.strength ?? (selectedBase as any)?.dose ?? null
    ) as string | null;
    const s = (raw ?? '').toString().trim();
    // If it looks concatenated (contains separators), drop it to avoid joined summaries downstream
    if (!s || /[•,]\s/.test(s)) return undefined;
    return s;
  })();

  const selectedClean = selectedBase ? {
    name: String((selectedBase as any)?.name ?? 'Item'),
    variations: selectedVariationsClean,
    qty: asQty((selectedBase as any)?.qty),
    unitMinor: asInt(toMinor((selectedBase as any)?.unitMinor ?? (selectedBase as any)?.priceMinor ?? (selectedBase as any)?.price), 0),
    totalMinor: asInt((selectedBase as any)?.totalMinor, 0),
  } : null;

  // Guard: reject obviously concatenated names (joined summaries)
  const looksJoined = (s: string) => /(^|.+)\s*[•,]\s+.+/.test(s)
  if (itemsNormalized.some((it) => looksJoined(String(it.name || '')))) {
    return NextResponse.json({
      ok: false,
      error: 'Item name appears to contain multiple products (e.g. separated by commas or •). Send each product as a separate object in items[].'
    }, { status: 422 })
  }

  if (!itemsNormalized.length) {
    return NextResponse.json({
      ok: false,
      error: 'No items provided. Please send an items[] array with name, variations, qty, unitMinor.'
    }, { status: 422 })
  }

  const itemsTotalMinor = itemsNormalized.reduce((sum, it) => {
    const q = asQty(it.qty)
    const u = asInt(it.unitMinor, 0)
    if (it.totalMinor && asInt(it.totalMinor, 0) > 0) return sum + asInt(it.totalMinor, 0)
    return sum + (u * q)
  }, 0)

  const payload = {
    ref: b.ref,
    type: b.type,
    amountMinor: Number.isFinite(Number(b.amountMinor)) ? asInt(b.amountMinor) : itemsTotalMinor,
    createdAt: b.createdAt || new Date().toISOString(),
    items: itemsNormalized,
    // appointment info (forward to API)
    ...(appointment_start_at ? { appointment_start_at } : {}),
    ...(appointment_start_at ? { appointment_at: appointment_start_at } : {}), // legacy alias
    ...(appointment_end_at ? { appointment_end_at } : {}),
    ...(selectedClean ? { selectedProduct: selectedClean } : {}),
    ...(session_id ? { session_id } : {}),          // pass session id to backend
    ...(slug ? { service_slug: slug } : {}),        // pass canonical slug to backend
    meta: {
      // deliberately NOT stamping a fallback service here
      lines: itemsNormalized.map((it, index) => ({
        index,
        name: it.name,
        qty: asQty(it.qty),
        variation: it.variations ?? null,
        unitMinor: asInt(it.unitMinor, 0) || undefined,
        totalMinor: asInt(it.totalMinor, 0) || undefined,
      })),
    },
  }

  try { console.log('[orders/pending] slug:', slug, 'session_id:', session_id); } catch {}

  // Debug logs (visible in Next server console)
  try {
    console.log('[orders/pending] incoming body:', JSON.stringify(b))
    console.log('[orders/pending] normalized payload:', JSON.stringify(payload))
  } catch {}

  if (!token) {
    return NextResponse.json({ message: 'Missing patient token' }, { status: 401 })
  }

  const apiBase = process.env.API_BASE || process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'

  // Optional tenancy host override for local dev
  const hostOverride = (body?.host as string) 
    || process.env.API_HOST_HEADER 
    || req.headers.get('x-tenant-host') 
    || undefined

  try {
    const res = await fetch(`${apiBase}/api/account/orders/pending`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(hostOverride ? { Host: hostOverride } : {}),
        ...(req.headers.get('host') ? { 'X-Forwarded-Host': req.headers.get('host')! } : {}),
      },
      body: JSON.stringify(payload),
    })

    const data = await res.json().catch(() => ({}))
    return NextResponse.json(data, { status: res.status })
  } catch (err: any) {
    console.error('[orders/pending] fetch error:', err?.message || err)
    return NextResponse.json({ message: 'Upstream unavailable', error: String(err?.message || err) }, { status: 502 })
  }
}