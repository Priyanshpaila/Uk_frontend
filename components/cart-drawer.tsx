"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef } from "react";
import { usePathname, useSearchParams as useNextSearchParams, useRouter } from "next/navigation";
import useAuthStatus from "@/hooks/useAuthStatus";
import { useCart } from "./cart-context";

// --- Money helpers: prefer minor units (pence) when present ---
const minorToGBP = (m?: number | null) => `£${((m ?? 0) / 100).toFixed(2)}`
const getUnitMinor = (i: any) => {
  if (Number.isFinite(i?.unitMinor)) return Number(i.unitMinor)
  if (Number.isFinite(i?.priceMinor)) return Number(i.priceMinor)
  // fallback: derive from total if available
  if (Number.isFinite(i?.totalMinor) && Number.isFinite(i?.qty) && i.qty > 0) {
    return Math.round(Number(i.totalMinor) / Math.max(1, Number(i.qty)))
  }
  // last resort: use float price (£) and convert to pence
  if (Number.isFinite(i?.price)) return Math.round(Number(i.price) * 100)
  return 0
}
const getLineTotalMinor = (i: any) => {
  if (Number.isFinite(i?.totalMinor)) return Number(i.totalMinor)
  const u = getUnitMinor(i)
  const q = Number.isFinite(i?.qty) ? Number(i.qty) : 1
  return u * Math.max(1, q)
}

export default function CartDrawer({
  proceedHref = "/auth",
  proceedLabel = "Continue",
  addMoreLabel = "Add items",
  searchParams,
}: {
  proceedHref?: string;
  proceedLabel?: string;
  addMoreLabel?: string;
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const router = useRouter();
  const { items, isOpen, close, updateQty, remove, subtotal } = useCart();
  const pathname = usePathname();

  // Derive treatments from cart (one entry per item: name + option)
  const treatments = useMemo(() => {
    if (!items || items.length === 0) return [] as string[]
    return items
      .map((row: any) => {
        const name = String(row?.name || '').trim()
        const optLabel = String((row?.variations ?? row?.optionLabel ?? '')).trim()
        const full = optLabel ? `${name} ${optLabel}` : name
        return full
      })
      .filter(Boolean)
  }, [items])

  // Persist treatments so downstream pages can read them
  useEffect(() => {
    try {
      if (treatments.length) {
        // Back-compat single name (first item)
        const first = treatments[0]
        localStorage.setItem('treatment_name', first)
        localStorage.setItem('selected_treatment', first)
        // New: full list for multi-item flows
        sessionStorage.setItem('pe_selected_treatments', JSON.stringify(treatments))
      } else {
        localStorage.removeItem('treatment_name')
        localStorage.removeItem('selected_treatment')
        sessionStorage.removeItem('pe_selected_treatments')
      }
    } catch { /* ignore storage errors */ }
  }, [treatments])

  const urlParams = useNextSearchParams();
  const typeFromUrl = urlParams?.get("type") || undefined;

  const getFirst = (v?: string | string[]) => (Array.isArray(v) ? v[0] : v);
  const rawType = getFirst(searchParams?.type) ?? typeFromUrl;
  const t = rawType ? String(rawType).toLowerCase() : undefined;

  // Robust auth check (listens to login/logout via event/storage in the hook)
  const loggedIn = useAuthStatus(`${isOpen}-${t}`);

  const nextHref = useMemo(() => {
    const origin =
      typeof window !== 'undefined' ? window.location.origin : 'http://localhost';

    // helper: add shared params
    const withParams = (base: string) => {
      const u = new URL(base, origin);
      if (t) u.searchParams.set('type', t);
      if (treatments.length) {
        treatments.forEach((tr) => u.searchParams.append('treatment', tr));
      }
      return `${u.pathname}?${u.searchParams.toString()}`;
    };

    // --- Booking flow detection: /private-services/[slug]/book ---
    // If we're in the booking app, "Continue" should progress to the next step
    // instead of sending people to the standalone /auth page.
    const m = pathname?.match(/^\/private-services\/([^/]+)\/book/i);
    if (m) {
      const slug = m[1];
      const step = loggedIn ? 'raf' : 'login';
      const u = new URL(`/private-services/${slug}/book`, origin);
      u.searchParams.set('step', step);
      if (t) u.searchParams.set('type', t);
      if (treatments.length) {
        treatments.forEach((tr) => u.searchParams.append('treatment', tr));
      }
      return `${u.pathname}?${u.searchParams.toString()}`;
    }

    // --- Weight-loss intake shortcut when a type is specified ---
    if (t === 'new' || t === 'transfer') {
      const target = loggedIn
        ? '/private-services/weight-loss/intake'
        : '/auth';
      return withParams(target);
    }

    // --- Fallback: honour the provided proceedHref ---
    return proceedHref;
  }, [t, proceedHref, loggedIn, treatments, pathname]);

  const searchKey = useMemo(() => JSON.stringify(searchParams ?? {}), [searchParams]);

  // Only auto-close if the cart is open *and* the route/search changed after opening.
  const prevRef = useRef({ pathname, searchKey });
  useEffect(() => {
    if (!isOpen) {
      // When closed, just record the latest route/search.
      prevRef.current = { pathname, searchKey };
      return;
    }
    const changed =
      pathname !== prevRef.current.pathname || searchKey !== prevRef.current.searchKey;

    if (changed) {
      close();
    }
    // Always update the ref to the latest observed values
    prevRef.current = { pathname, searchKey };
  }, [pathname, searchKey, isOpen, close]);

  // (Optional) close on Esc key
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, close]);

  useEffect(() => {
    // Best-effort ensure the drawer is closed on first paint of any route that mounts this
    if (isOpen) close()
    // Also dismiss via Escape in case another overlay is listening
    try { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })) } catch {}
  }, []) // run once

  const subtotalMinor = useMemo(() => {
    try {
      return items.reduce((acc: number, it: any) => acc + getLineTotalMinor(it), 0);
    } catch {
      return 0;
    }
  }, [items]);

  // Proceed handler: minimal version that just routes to next page
  const onProceed = (e: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => {
    // Intake will auto-create the session now. Cart just routes.
    try {
      if (e && typeof e.preventDefault === 'function') e.preventDefault();
    } catch {}
    try { sessionStorage.setItem('booking_next', nextHref); } catch {}
    close();
    router.push(nextHref);
  };

  // console.debug("[CartDrawer] t:", t, "loggedIn:", loggedIn, "nextHref:", nextHref);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/40 transition-opacity z-40 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={close}
      />

      {/* Panel */}
      <aside
        className={`fixed right-0 top-0 h-full w-full sm:w-[420px] bg-white z-50 shadow-2xl
                    transition-transform duration-300 ${isOpen ? "translate-x-0" : "translate-x-full"}`}
        aria-hidden={!isOpen}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="text-lg font-semibold">Your basket</h2>
          <button onClick={close} aria-label="Close" className="p-2 rounded-full hover:bg-gray-100">
            ✕
          </button>
        </div>

        {/* Items */}
        <div className="p-5 space-y-4 overflow-auto h-[calc(100%-210px)]">
          {items.length === 0 ? (
            <p className="text-gray-600">Your basket is empty.</p>
          ) : (
            items.map((i) => (
              <div key={i.key} className="flex gap-3 border rounded-xl p-3">
                <img src={i.image} alt={i.name} className="h-14 w-14 object-contain rounded-md border" />
                <div className="flex-1">
                  <p className="font-medium">{i.name}</p>
                  {(i.variations ?? i.optionLabel) && (
                    <p className="text-sm text-gray-500">{i.variations ?? i.optionLabel}</p>
                  )}
                  <div className="mt-2 flex items-center gap-3">
                    <input
                      type="number"
                      min={1}
                      {...(Number.isFinite(i.maxQty as number) ? { max: i.maxQty as number } : {})}
                      value={i.qty}
                      onChange={(e) => {
                        const raw = e.target.value;
                        const parsed = Number.parseInt(raw || '1', 10);
                        const max = Number.isFinite(i.maxQty as number) ? (i.maxQty as number) : 999;
                        const clamped = Math.min(Math.max(parsed || 1, 1), max);
                        updateQty(i.key, clamped);
                      }}
                      onBlur={(e) => {
                        const parsed = Number.parseInt(e.target.value || '1', 10);
                        const max = Number.isFinite(i.maxQty as number) ? (i.maxQty as number) : 999;
                        const clamped = Math.min(Math.max(parsed || 1, 1), max);
                        if (clamped !== parsed) {
                          e.target.value = String(clamped);
                          updateQty(i.key, clamped);
                        }
                      }}
                      className="w-16 border rounded-full p-2 text-center"
                    />
                    <button onClick={() => remove(i.key)} className="text-sm text-gray-600 hover:text-red-600">
                      Remove
                    </button>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium" aria-label="Line total">{minorToGBP(getLineTotalMinor(i))}</div>
                  <div className="text-xs text-gray-500" aria-label="Unit price">{minorToGBP(getUnitMinor(i))} each</div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 border-t p-5 space-y-3 bg-white">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Subtotal</span>
            <span className="text-lg font-semibold" aria-live="polite">{minorToGBP(subtotalMinor)}</span>
          </div>

          <div className="flex gap-3">
            <button onClick={close} className="flex-1 rounded-full border px-4 py-2 text-gray-800 hover:bg-gray-50">
              {addMoreLabel}
            </button>
            <Link
              href={nextHref}
              onClick={onProceed}
              className="flex-1 text-center rounded-full bg-emerald-500 text-white px-4 py-2 hover:bg-emerald-600"
            >
              {proceedLabel}
            </Link>
          </div>

          <p className="text-xs text-gray-500">You can add more items or proceed to complete the form.</p>
        </div>
      </aside>
    </>
  );
}