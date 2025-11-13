"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/* ---------------- Types ---------------- */
type HomeAddress = {
  line1?: string;
  line2?: string;
  city?: string;
  postcode?: string;
  country?: string;
};

type ShippingAddress = {
  line1?: string;
  line2?: string;
  city?: string;
  postcode?: string;
  country?: string;
};

type Patient = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  dateOfBirth?: string; // ISO yyyy-mm-dd
  home?: HomeAddress;
  shipping?: ShippingAddress;
};

type Order = {
  id: string;
  createdAt: string; // ISO
  status: "Paid" | "Dispatched" | "Delivered" | "Cancelled" | "Pending";
  bookingStatus?: "pending" | "approved" | "rejected" | string;
  totalMinor: number; // pence
  items: Array<{
    sku: string;
    name: string;
    qty: number;
    unitMinor: number;
    variations?: string;
  }>;
};

/* ---------------- Helpers ---------------- */
const fmtMoney = (minor: number) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(
    (minor || 0) / 100
  );

const cls = (...xs: (string | false | null | undefined)[]) =>
  xs.filter(Boolean).join(" ");

/** GET with mock fallback */
async function getJSON<T>(url: string, mock: T): Promise<T> {
  const fullUrl = buildApiUrl(url);
  try {
    const { token } = readAuthFromStorage();
    const headers: Record<string, string> = { Accept: "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const r = await fetch(fullUrl, {
      method: "GET",
      headers,
      cache: "no-store",
      credentials: "omit",
    });

    if (!r.ok) throw new Error(await r.text());
    return (await r.json()) as T;
  } catch {
    return mock;
  }
}

/** POST JSON helper */
async function postJSON<T>(
  url: string,
  body: any
): Promise<{ ok: boolean; data?: T; error?: string }> {
  const fullUrl = buildApiUrl(url);
  try {
    const { token } = readAuthFromStorage();
    const headers: Record<string, string> = {
      Accept: "application/json",
      "Content-Type": "application/json",
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const r = await fetch(fullUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(body ?? {}),
      credentials: "omit",
    });

    const text = await r.text();
    if (!r.ok) return { ok: false, error: text || `${r.status}` };
    return { ok: true, data: text ? (JSON.parse(text) as T) : ({} as T) };
  } catch (e: any) {
    return { ok: false, error: e?.message || String(e) };
  }
}

/* ---------------- Auth helpers (populate patient from register/login) ---------------- */
const API_BASE = (() => {
  // Prefer a dedicated backend URL if provided, otherwise fall back to public one
  const envServer = (process.env.BACKEND_API_URL || "").trim();
  const envClient = (
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_BASE ||
    ""
  ).trim();

  // Start with whichever is set; prefer backend env
  let base = envServer || envClient;

  // Default to local Laravel if nothing is set
  if (!base) {
    base =
      typeof window !== "undefined"
        ? `${window.location.protocol}//${window.location.hostname}:8000/api`
        : "http://192.168.13.75:8000/api";
  }

  // If someone accidentally pointed to the Next dev server (3000/3001), fall back to Laravel
  if (/:(3000|3001)\b/.test(base)) {
    base =
      envServer && !/:(3000|3001)\b/.test(envServer)
        ? envServer
        : "http://192.168.13.75:8000/api";
  }

  // Normalize: ensure trailing "/api" exactly once
  base = base.replace(/\/+$/, "");
  if (!/\/api$/.test(base)) base = `${base}/api`;

  return base;
})();

function readAuthFromStorage() {
  try {
    const token = localStorage.getItem("token");
    const userRaw = JSON.parse(localStorage.getItem("user") || "null");
    return { token, userRaw };
  } catch {
    return { token: null, userRaw: null };
  }
}

// Build absolute URL against API_BASE when a relative /api/... path is provided

function buildApiUrl(url: string) {
  if (!url) return API_BASE;
  if (url.startsWith("/")) return `${API_BASE}${url}`;
  return url;
}

function mapServerOrder(o: any): Order {
  const id = String(o?.reference ?? o?.id ?? "");
  const createdAt = o?.created_at || o?.createdAt || new Date().toISOString();

  // Normalise payment-based status first (used as a fallback for display only)
  const payment = (o?.payment_status || o?.paymentStatus || "")
    .toString()
    .toLowerCase();
  const status: Order["status"] =
    payment === "paid"
      ? "Paid"
      : payment === "refunded"
      ? "Cancelled"
      : "Pending";

  // Items normalisation – collect from multiple possible shapes
  let items: Array<{
    sku: string;
    name: string;
    qty: number;
    unitMinor: number;
    variations?: string;
  }> = [];

  // Helper to push an item safely
  const pushItem = (i: any) => {
    if (!i) return;
    const qty = Math.max(1, Number(i.qty ?? i.quantity ?? 1) || 1);
    const opt = (
      i.variations ??
      i.opt ??
      i.optionLabel ??
      i.option ??
      i.variant_title ??
      i.strength ??
      i.dose ??
      ""
    )
      .toString()
      .trim();
    const base = (i.name ?? i.title ?? i.product_name ?? i.treatment ?? "Item")
      .toString()
      .trim();
    const name = opt ? `${base} ${opt}` : base;
    const unitMinor = Number(
      i.unitMinor ??
        i.priceMinor ??
        i.unit_price_minor ??
        i.price_minor ??
        i.price ??
        0
    );
    const sku = String(i.sku ?? i.product_id ?? i.id ?? "item");
    items.push({ sku, name, qty, unitMinor, variations: opt || undefined });
  };

  const collectArray = (arr: any) => {
    if (Array.isArray(arr)) for (const i of arr) pushItem(i);
  };

  // 1) direct fields commonly used
  collectArray(o?.items);
  collectArray(o?.order_items);
  collectArray(o?.products);
  collectArray(o?.line_items);

  // 2) meta variants
  try {
    const meta =
      typeof o?.meta === "string" ? JSON.parse(o.meta) || {} : o?.meta || {};
    if (items.length === 0) {
      if (Array.isArray(meta.items)) collectArray(meta.items);
      else if (Array.isArray(meta.cart?.items)) collectArray(meta.cart.items);
      else if (Array.isArray(meta.order?.items)) collectArray(meta.order.items);
      else if (meta && typeof meta.items === "object" && meta.items !== null)
        collectArray(Object.values(meta.items));
      else if (typeof meta?.items === "string") {
        const parts = meta.items
          .split(/\r?\n|,|·|•/)
          .map((s: string) => s.trim())
          .filter(Boolean);
        for (const name of parts) pushItem({ name, qty: 1 });
      }
    }
  } catch {}

  // 3) If we still have nothing but we know totals and treatment name from a recent local payment
  if (items.length === 0) {
    const amountMinor = Number(o?.totalMinor ?? o?.amountMinor ?? 0);
    const base = (o?.treatment || o?.title || "Order").toString();
    items.push({
      sku: "order",
      name: base,
      qty: 1,
      unitMinor: amountMinor || 0,
    });
  }

  const totalMinor = Number(o?.totalMinor ?? o?.amountMinor ?? 0);

  // Try to read booking status from multiple places
  let bookingStatus = (o?.booking_status || o?.bookingStatus || "").toString();
  // Sometimes APIs embed extra fields inside meta
  try {
    const meta =
      typeof o?.meta === "string" ? JSON.parse(o.meta) || {} : o?.meta || {};
    if (!bookingStatus)
      bookingStatus = String(meta.booking_status || meta.bookingStatus || "");
  } catch {}

  // If still empty, infer a sensible default:
  // when payment is paid and no explicit decision, treat as pending approval for UI purposes
  if (!bookingStatus) {
    const s = (o?.status || "").toString().toLowerCase();
    if (s === "pending" || s === "processing") bookingStatus = "pending";
    else if (payment === "paid") bookingStatus = "pending";
  }

  return { id, createdAt, status, bookingStatus, totalMinor, items };
}

function paymentBadge(o: Order): { text: string; cls: string } {
  // Map the display 'o.status' to a pill; this is *payment / shipment* status only
  switch (o.status) {
    case "Paid":
      return {
        text: "Paid",
        cls: "bg-amber-50 text-amber-700 border border-amber-200",
      };
    case "Dispatched":
      return {
        text: "Dispatched",
        cls: "bg-sky-50 text-sky-700 border border-sky-200",
      };
    case "Delivered":
      return {
        text: "Delivered",
        cls: "bg-emerald-50 text-emerald-700 border border-emerald-200",
      };
    case "Cancelled":
      return {
        text: "Refunded",
        cls: "bg-rose-50 text-rose-700 border border-rose-200",
      };
    default:
      return {
        text: "Pending",
        cls: "bg-gray-50 text-gray-700 border border-gray-200",
      };
  }
}

function bookingText(o: Order): string {
  // Prefer explicit booking status (both cases)
  let raw: any = (o as any).bookingStatus ?? (o as any).booking_status;

  // Try to read from meta if missing
  if (!raw && (o as any).meta) {
    try {
      const meta =
        typeof (o as any).meta === "string"
          ? JSON.parse((o as any).meta)
          : (o as any).meta;
      raw = meta?.booking_status ?? meta?.bookingStatus ?? raw;
    } catch {}
  }

  const b = String(raw || "").toLowerCase();
  if (b === "pending") return "Pending";
  if (b === "approved") return "Confirmed";
  if (b === "rejected") return "Rejected";

  // Strong fallback: if we know payment is complete but no decision yet, show Pending
  if (o.status === "Paid") return "Pending";

  // Soft fallback: if the payment/overall status contains 'pending', mirror it
  const derived = String((o as any).status || "").toLowerCase();
  if (derived.includes("pending")) return "Pending";

  return "";
}

// --- Normalisers for server orders (items can live in many shapes) ---
function normaliseItemsFromAny(o: any): Array<{
  sku: string;
  name: string;
  qty: number;
  unitMinor: number;
  variations?: string;
}> {
  const items: Array<{
    sku: string;
    name: string;
    qty: number;
    unitMinor: number;
    variations?: string;
  }> = [];

  const push = (i: any) => {
    if (!i) return;
    const qty = Math.max(1, Number(i.qty ?? i.quantity ?? 1) || 1);
    const opt = (
      i.variations ??
      i.variation ??
      i.variant ??
      i.opt ??
      i.optionLabel ??
      i.option ??
      i.variant_title ??
      i.strength ??
      i.dose ??
      ""
    )
      .toString()
      .trim();
    const base = (i.name ?? i.title ?? i.product_name ?? i.treatment ?? "Item")
      .toString()
      .trim();
    // Keep brand/treatment name separate from variation
    const name = base;
    const unitMinor = Number(
      i.unitMinor ??
        i.priceMinor ??
        i.unit_price_minor ??
        i.price_minor ??
        i.price ??
        0
    );
    const sku = String(i.sku ?? i.product_id ?? i.id ?? "item");
    items.push({ sku, name, qty, unitMinor, variations: opt || undefined });
  };

  const collect = (arr: any) => {
    if (Array.isArray(arr)) for (const it of arr) push(it);
  };

  // deep collector over arbitrary meta shapes
  const collectDeep = (node: any) => {
    try {
      if (!node) return;
      if (Array.isArray(node)) {
        for (const v of node) {
          if (typeof v === "string") push({ name: v, qty: 1 });
          else if (v && typeof v === "object") push(v);
        }
        return;
      }
      if (typeof node === "object") {
        // common keys that may contain items
        for (const key of Object.keys(node)) {
          const v: any = (node as any)[key];
          if (!v) continue;
          const k = key.toLowerCase();
          if (
            k.includes("items") ||
            k.includes("lines") ||
            k.includes("products") ||
            k.includes("components")
          ) {
            if (Array.isArray(v)) collect(v);
            else if (typeof v === "object") {
              for (const [name, qty] of Object.entries(v)) push({ name, qty });
            } else if (typeof v === "string") {
              const parts = v
                .split(/\r?\n|,|·|•/)
                .map((s: string) => s.trim())
                .filter(Boolean);
              for (const name of parts) push({ name, qty: 1 });
            }
          } else if (typeof v === "object" || Array.isArray(v)) {
            collectDeep(v);
          }
        }
      }
    } catch {}
  };

  // direct
  collect(o?.items);
  collect(o?.order_items);
  collect(o?.products);
  collect(o?.line_items);

  // meta-based
  try {
    const meta =
      typeof o?.meta === "string" ? JSON.parse(o.meta) || {} : o?.meta || {};
    if (items.length === 0) {
      if (Array.isArray(meta.items)) collect(meta.items);
      else if (Array.isArray(meta.cart?.items)) collect(meta.cart.items);
      else if (Array.isArray(meta.order?.items)) collect(meta.order.items);
      else if (
        meta &&
        typeof meta.items === "object" &&
        meta.items !== null &&
        !Array.isArray(meta.items)
      ) {
        for (const [name, qty] of Object.entries(meta.items))
          push({ name, qty });
      } else if (
        meta?.cart &&
        typeof meta.cart.items === "object" &&
        meta.cart.items !== null &&
        !Array.isArray(meta.cart.items)
      ) {
        for (const [name, qty] of Object.entries(meta.cart.items))
          push({ name, qty });
      } else if (typeof meta?.items === "string") {
        const parts = meta.items
          .split(/\r?\n|,|·|•/)
          .map((s: string) => s.trim())
          .filter(Boolean);
        for (const name of parts) push({ name, qty: 1 });
      }

      // If still nothing, scan meta deeply for any likely item containers
      if (items.length === 0) collectDeep(meta);
    }
  } catch {}

  return items;
}

function mapServerOrderSimple(o: any): Order {
  // Payment-derived status (kept for the Payment column / fallbacks)
  const payment = String(
    o?.payment_status ?? o?.paymentStatus ?? ""
  ).toLowerCase();
  const status: Order["status"] =
    payment === "paid"
      ? "Paid"
      : payment === "refunded"
      ? "Cancelled"
      : "Pending";

  // Booking/approval status from API or meta
  let booking = String(
    o?.booking_status ?? o?.bookingStatus ?? ""
  ).toLowerCase();
  if (!booking) {
    try {
      const meta =
        typeof o?.meta === "string" ? JSON.parse(o.meta) : o?.meta || {};
      booking = String(meta?.booking_status ?? meta?.bookingStatus ?? "");
    } catch {}
  }

  // Total from API or meta fallback
  let totalMinor = Number(o?.totalMinor ?? o?.amountMinor ?? 0);
  if (!totalMinor) {
    try {
      const meta =
        typeof o?.meta === "string" ? JSON.parse(o.meta) : o?.meta || {};
      const mTotal = Number(meta?.totalMinor ?? meta?.order?.totalMinor ?? 0);
      if (mTotal) totalMinor = mTotal;
    } catch {}
  }

  return {
    id: String(o?.reference ?? o?.id ?? ""),
    createdAt: o?.created_at || o?.createdAt || new Date().toISOString(),
    status, // keep for payment/other UI bits
    bookingStatus: booking || undefined, // <-- this is the key for your badge/Order Status
    totalMinor,
    items: normaliseItemsFromAny(o),
  };
}
// Live orders fetcher bypassing cache and sending Authorization or cookies
async function fetchOrdersFromApi(): Promise<Order[]> {
  try {
    const { token } = readAuthFromStorage();

    // If no token, avoid a 401 fetch and just return empty
    if (!token) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[orders] no token – skipping /api/account/orders fetch");
      }
      return [];
    }

    const res = await fetch("/api/account/orders", {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    if (process.env.NODE_ENV !== "production") {
      console.log("[orders] /api/account/orders status", res.status);
    }

    const text = await res.text();
    let data: any;
    try {
      data = text ? JSON.parse(text) : [];
    } catch {
      data = [];
    }

    const arr = Array.isArray(data)
      ? data
      : Array.isArray(data?.data)
      ? data.data
      : Array.isArray(data?.orders)
      ? data.orders
      : [];

    return (arr as any[]).map(mapServerOrderSimple);
  } catch (e) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[orders] fetch failed", e);
    }
    return [];
  }
}

function splitNameAndVariation(fullName: string): {
  base: string;
  opt: string;
} {
  if (!fullName) return { base: "", opt: "" };
  const full = String(fullName).trim();
  let opt = "";
  let base = full;

  // Try several patterns (first match wins)
  const patterns: RegExp[] = [
    // e.g. "2.5mg", "0.25 mg", "120mg 84 capsules"
    /\b\d+(?:[.,]\d+)?\s?(?:mg|mcg|ml|units?)\b(?:[^\w].*)?$/i,
    // starter packs / maintenance / needles/swabs/sharps bin / pack of X
    /\b(?:starter\s*pack(?:[^,]*)?|maintenance(?:\s*plan[s]?)?|needles|swabs|sharps\s*bin|pack(?:\s*of\s*\w+)?(?:[^,]*)?)$/i,
    // freestyle libre endings
    /\b(?:freestyle\s+libre(?:\s+plus)?\s*\d*)$/i,
  ];

  for (const rx of patterns) {
    const m = full.match(rx);
    if (m && m[0]) {
      opt = m[0].trim();
      break;
    }
  }

  if (opt) {
    const esc = opt.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    base = full
      .replace(new RegExp(`\\s*${esc}\\s*`, "i"), " ")
      .replace(/\s{2,}/g, " ")
      .trim();
  }
  return { base, opt };
}

function cleanVariation(opt: string, base?: string): string {
  if (!opt) return "";
  let v = String(opt).trim();

  // If the variation accidentally repeats the base name, strip it
  if (base) {
    const b = String(base).trim();
    if (b) {
      const bLower = b.toLowerCase();
      if (v.toLowerCase().includes(bLower)) {
        const esc = b.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        v = v.replace(new RegExp(`\\b${esc}\\b`, "ig"), "").trim();
      }
    }
  }

  // Cut at common separators so a variation doesn't swallow following items
  // e.g. "2.5mg, Mounjaro Maintenance Plan, Swabs" -> take only "2.5mg"
  v = v.split(/(?:\s*[•·|]\s*|,\s*|\s{2,}—\s*|\s+-\s+)/)[0];

  // Remove leading punctuation/separators
  v = v.replace(/^[\s,:;–—-]+/, "").trim();

  // Collapse excess spaces
  v = v.replace(/\s{2,}/g, " ");

  // Guard against extremely long strings
  if (v.length > 80) v = v.slice(0, 77) + "…";

  return v;
}

// Pending orders fetcher (lightweight entries created on success page)
async function fetchPendingOrdersFromApi(): Promise<Order[]> {
  try {
    const { token } = readAuthFromStorage();
    const url = `/api/orders/pending?_=${Date.now()}`;
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      cache: "no-store",
      credentials: token ? "omit" : "include",
    });
    const text = await res.text();
    let data: any;
    try {
      data = text ? JSON.parse(text) : [];
    } catch {
      data = [];
    }
    const arr = Array.isArray(data)
      ? data
      : Array.isArray(data?.data)
      ? data.data
      : Array.isArray(data?.orders)
      ? data.orders
      : [];
    // Normalize into Order shape (status defaults to Pending)
    return (arr as any[]).map((o) => ({
      id: String(o.id || o.ref || ""),
      createdAt: o.createdAt || o.created_at || new Date().toISOString(),
      status: (o.status || "Pending") as Order["status"],
      bookingStatus: "pending",
      totalMinor: Number(o.totalMinor ?? o.amountMinor ?? 0),
      items:
        Array.isArray(o.items) && o.items.length
          ? o.items.map((it: any) => {
              const rawName = String(
                it.name || it.title || it.product_name || it.treatment || "Item"
              ).trim();

              // Prefer explicit variation field first
              let opt = String(
                it.variations ??
                  it.optionLabel ??
                  it.opt ??
                  it.variant_title ??
                  it.strength ??
                  it.dose ??
                  ""
              ).trim();

              // Derive from name only if missing
              let base = rawName;
              if (!opt) {
                const parsed = splitNameAndVariation(rawName);
                base = parsed.base;
                opt = parsed.opt || "";
              }

              // ✅ keep the display name as the base only; show variation on the next line
              // and clean the variation so it doesn't swallow other items or duplicate the name
              opt = cleanVariation(opt, base);
              const name = base;

              return {
                sku: String(it.sku || "item"),
                name,
                qty: Math.max(1, Number(it.qty) || 1),
                unitMinor: Number(it.unitMinor || 0),
                variations: opt || undefined,
              };
            })
          : normaliseItemsFromAny(o),
    }));
  } catch {
    return [];
  }
}

function getLocalOrders(): Order[] {
  try {
    const arr = JSON.parse(localStorage.getItem("local_orders") || "[]");
    return Array.isArray(arr) ? (arr as Order[]) : [];
  } catch {
    return [];
  }
}

function getLastPayment() {
  try {
    return JSON.parse(localStorage.getItem("last_payment") || "null") || null;
  } catch {
    return null;
  }
}

function enrichTotalsWithLastPayment(server: Order[]): Order[] {
  const last = getLastPayment();
  if (!last || !last.ref || !last.amountMinor) return server;
  return server.map((o) => {
    if (String(o.id) === String(last.ref) && !(o as any).totalMinor) {
      return { ...o, totalMinor: Number(last.amountMinor) };
    }
    return o;
  });
}

function enrichItemsWithLastPayment(server: Order[]): Order[] {
  const last = getLastPayment();
  if (!last || !last.ref) return server;

  return server.map((o) => {
    const noItems =
      !Array.isArray((o as any).items) || (o as any).items.length === 0;

    if (String(o.id) === String(last.ref) && noItems) {
      const amountMinor =
        Number(last.amountMinor) || Number((o as any).totalMinor) || 0;

      const items =
        Array.isArray(last.items) && last.items.length
          ? last.items.map((i: any) => {
              const qty = Math.max(1, Number(i?.qty) || 1);

              // ✅ prefer cart-sent variations, with robust fallbacks
              const opt = String(
                i?.variations ??
                  i?.optionLabel ??
                  i?.opt ??
                  i?.option ??
                  i?.variant_title ??
                  i?.strength ??
                  i?.dose ??
                  ""
              ).trim();

              const base = String(i?.name || last?.treatment || "Item").trim();
              const name = base;

              // if total available but unit not provided, estimate unit
              const unitMinor =
                Number(i?.unitMinor) ||
                (amountMinor && qty ? Math.round(amountMinor / qty) : 0);

              return {
                sku: i?.sku || "item",
                name,
                qty,
                unitMinor,
                // ✅ preserve for the table’s Variations column
                variations: opt || undefined,
              };
            })
          : [
              {
                sku: "order",
                name: String(last.treatment || "Order"),
                qty: 1,
                unitMinor: amountMinor || 0,
              },
            ];

      return { ...o, items };
    }

    return o;
  });
}

function pruneLocalWithServer(server: Order[]) {
  try {
    const serverIds = new Set(server.map((o) => String(o.id)));
    const keep = getLocalOrders().filter((o) => {
      const id = String(o.id);
      if (serverIds.has(id)) return false;
      // If any server orders exist, drop temp-* placeholders to avoid duplicates
      if (id.startsWith("temp-") && server.length > 0) return false;
      return true;
    });
    localStorage.setItem("local_orders", JSON.stringify(keep));
  } catch {}
}

function mergeOrdersWithLocal(server: Order[]): Order[] {
  const enrichedTotals = enrichTotalsWithLastPayment(server);
  const enriched = enrichItemsWithLastPayment(enrichedTotals);
  const local = getLocalOrders();
  const serverIds = new Set(enriched.map((o) => String(o.id)));
  const merged = [...enriched];
  for (const o of local) {
    const id = String(o.id);
    // Hide temp placeholders whenever we have any server orders
    if (id.startsWith("temp-") && enriched.length > 0) continue;
    if (!serverIds.has(id)) merged.push(o);
  }
  return merged.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

function mergeWithPending(server: Order[], pending: Order[]): Order[] {
  if (!Array.isArray(pending) || pending.length === 0) return server;
  const serverIds = new Set(server.map((o) => String(o.id)));
  const merged = [...server];
  for (const p of pending) {
    const id = String(p.id);
    if (!id) continue;
    if (serverIds.has(id)) continue; // skip if real order exists
    merged.push(p);
  }
  return merged.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

function normalizeCountry(c?: string) {
  if (!c) return "";
  const up = String(c).toUpperCase();
  if (up === "GB" || up === "UK" || up === "GBR") return "United Kingdom";
  return c;
}

function toDateOnly(input: any) {
  if (!input) return "";
  const d = new Date(input);
  if (isNaN(d.getTime())) return String(input).slice(0, 10);
  return d.toISOString().slice(0, 10);
}

function mapUserToPatient(u: any): Patient {
  return {
    id: String(u?.id ?? u?._id ?? u?.userId ?? ""),
    firstName: u?.firstName ?? "",
    lastName: u?.lastName ?? "",
    email: u?.email ?? "",
    phone: u?.phone ?? "",
    dateOfBirth: toDateOnly(u?.dob),

    // HOME ADDRESS (backend uses address_line1, postalcode)
    home: {
      line1: u?.address_line1 ?? u?.line1 ?? "",
      line2: u?.address_line2 ?? u?.line2 ?? "",
      city: u?.city ?? "",
      postcode: u?.postalcode ?? u?.postcode ?? "",
      country: u?.country ?? "",
    },

    // SHIPPING ADDRESS (optional — fallback to home)
    shipping: {
      line1: u?.shipping_line1 ?? u?.address_line1 ?? "",
      line2: u?.shipping_line2 ?? u?.address_line2 ?? "",
      city: u?.shipping_city ?? u?.city ?? "",
      postcode: u?.shipping_postcode ?? u?.postalcode ?? "",
      country: u?.shipping_country ?? u?.country ?? "",
    },
  };
}


function storeUserToStorage(u: any) {
  try {
    localStorage.setItem("user", JSON.stringify(u));
  } catch {}
}

/* ---------------- Page ---------------- */
function PatientPageWrapper() {
  const router = useRouter();
  const search = useSearchParams();
  const tabParam = search?.get("tab") || undefined;
  const refreshParam = search?.get("refresh") || undefined;
  const wantOrders = tabParam === "orders" || refreshParam === "1";
  const [active, setActive] = useState<"profile" | "orders" | "reorder">(
    wantOrders ? "orders" : "profile"
  );

  // Data state
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<Patient | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  // Editable copies
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [dateOfBirth, setDob] = useState("");
  const [addr, setAddr] = useState<ShippingAddress>({});
  const [homeAddr, setHomeAddr] = useState<HomeAddress>({});
  const [savingHome, setSavingHome] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);

  // Edit mode state per section
  const [editingProfile, setEditingProfile] = useState(false);
  const [editingHome, setEditingHome] = useState(false);
  const [editingShipping, setEditingShipping] = useState(false);

  // Toggle for shipping same as home
  const [sameAsHome, setSameAsHome] = useState(false);

  // Password state
  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [newPw2, setNewPw2] = useState("");
  const [changingPw, setChangingPw] = useState(false);

  // Load initial data
  // Load initial data
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);

      const { token } = readAuthFromStorage();
      let meData: Patient | null = null;

      if (token) {
        try {
          const r = await fetch(`${API_BASE}/users/me`, {
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
            cache: "no-store",
          });

          if (r.ok) {
            const raw = await r.json();
            const u = raw?.user || raw;
            meData = mapUserToPatient(u);

            // Always update localStorage with fresh backend full user
            storeUserToStorage(u);
          }
        } catch {}
      }

      // If API failed, fallback to empty fields
      if (!meData) {
        meData = {
          id: "",
          firstName: "",
          lastName: "",
          email: "",
          phone: "",
          dateOfBirth: "",
          home: { line1: "", line2: "", city: "", postcode: "", country: "" },
          shipping: {
            line1: "",
            line2: "",
            city: "",
            postcode: "",
            country: "",
          },
        };
      }

      if (cancelled) return;

      // Set React state
      setMe(meData);

      // Auto-populate form inputs
      setFirstName(meData.firstName || "");
      setLastName(meData.lastName || "");
      setEmail(meData.email || "");
      setPhone(meData.phone || "");
      setDob(meData.dateOfBirth || "");
      setHomeAddr(meData.home || {});
      setAddr(meData.shipping || {});

      // same-as-home toggle logic
      const shippingEmpty =
        !meData.shipping ||
        !(
          meData.shipping.line1 ||
          meData.shipping.city ||
          meData.shipping.postcode
        );

      const homeHasData = !!(
        meData.home &&
        (meData.home.line1 || meData.home.city || meData.home.postcode)
      );

      if (shippingEmpty && homeHasData) {
        setSameAsHome(true);
      }

      // load orders
      const serverOrders = await fetchOrdersFromApi();
      const pendingData = await fetchPendingOrdersFromApi();

      setOrders(
        mergeWithPending(
          mergeOrdersWithLocal(serverOrders),
          Array.isArray(pendingData) ? pendingData : []
        )
      );

      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    // If a recent checkout marked orders as dirty, refresh and jump to Orders tab
    try {
      if (localStorage.getItem("orders_dirty") === "1") {
        localStorage.removeItem("orders_dirty");
        setActive("orders");
        refetchOrders();
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!wantOrders) return;
    setActive("orders");

    let cancelled = false;
    let tries = 0;

    const poll = async () => {
      tries++;
      const server = await fetchOrdersFromApi();
      if (cancelled) return;
      const serverArr = Array.isArray(server) ? server : [];
      const pendingArr = await fetchPendingOrdersFromApi();
      pruneLocalWithServer(serverArr);
      setOrders(
        mergeWithPending(
          mergeOrdersWithLocal(serverArr),
          Array.isArray(pendingArr) ? pendingArr : []
        )
      );
      // If still empty, try a few more times (covers webhook delay)
      if (serverArr.length === 0 && tries < 5) {
        setTimeout(poll, 800);
      }
    };

    // if refresh=1, force an immediate poll; otherwise still run once
    poll();

    return () => {
      cancelled = true;
    };
    // run only once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (active === "orders") {
      refetchOrders();
    }
  }, [active]);

  useEffect(() => {
    const onFocus = () => {
      if (active === "orders") refetchOrders();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [active]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "orders_dirty" && e.newValue === "1") {
        try {
          localStorage.removeItem("orders_dirty");
        } catch {}
        if (active === "orders") refetchOrders();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [active]);

  useEffect(() => {
    if (sameAsHome) {
      setAddr({
        line1: homeAddr.line1 || "",
        line2: homeAddr.line2 || "",
        city: homeAddr.city || "",
        postcode: homeAddr.postcode || "",
        country: homeAddr.country || "",
      });
    }
  }, [sameAsHome, homeAddr]);

  const fullName = useMemo(
    () => [firstName, lastName].filter(Boolean).join(" "),
    [firstName, lastName]
  );

  const reorderOptions = useMemo(
    () => [
      { label: "Select a service…", href: "" },
      // Add more services here as you enable them
      { label: "Weight loss", href: "/private-services/weight-loss/reorder" },
    ],
    []
  );

  async function refetchOrders() {
    try {
      setOrdersLoading(true);
      const list = await fetchOrdersFromApi();
      const server = Array.isArray(list) ? list : [];
      const pending = await fetchPendingOrdersFromApi();
      pruneLocalWithServer(server);
      setOrders(
        mergeWithPending(
          mergeOrdersWithLocal(server),
          Array.isArray(pending) ? pending : []
        )
      );
    } finally {
      setOrdersLoading(false);
    }
  }

  /* ---------- actions ---------- */
  async function saveProfile() {
    const { token } = readAuthFromStorage();

    if (!me?.id) {
      alert("User ID missing — cannot update profile.");
      return;
    }

    if (!token) {
      alert("You are not logged in — cannot update profile.");
      return;
    }

    setSavingProfile(true);

    const url = `${API_BASE}/users/${me.id}`;

    const payload = {
      firstName,
      lastName,
      email,
      phone,
      dob: dateOfBirth,

      // home
      line1: homeAddr.line1 || "",
      line2: homeAddr.line2 || "",
      city: homeAddr.city || "",
      postcode: homeAddr.postcode || "",
      country: homeAddr.country || "",

      // shipping
      shipping_line1: addr.line1 || "",
      shipping_line2: addr.line2 || "",
      shipping_city: addr.city || "",
      shipping_postcode: addr.postcode || "",
      shipping_country: addr.country || "",
    };

    try {
      const r = await fetch(url, {
        method: "PUT",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const text = await r.text();
      if (!r.ok) {
        setSavingProfile(false);
        return alert(`Could not save profile:\n${text}`);
      }

      const updated = JSON.parse(text);

      // Update UI
      setMe((m) => (m ? { ...m, ...updated } : updated));

      // Update localStorage as well
      storeUserToStorage({
        ...updated,
        userId: updated.id || updated.userId,
      });

      setSavingProfile(false);
      setEditingProfile(false);
      alert("Profile updated.");
    } catch (e: any) {
      setSavingProfile(false);
      alert(`Error: ${e.message || e}`);
    }
  }

  async function saveHomeAddress() {
    const { token } = readAuthFromStorage();

    if (!me?.id) {
      alert("User ID missing — cannot update home address.");
      return;
    }

    if (!token) {
      alert("You are not logged in.");
      return;
    }

    setSavingHome(true);

    const url = `${API_BASE}/users/${me.id}`;

    const payload = {
      address_line1: homeAddr.line1 || "",
      address_line2: homeAddr.line2 || "",
      city: homeAddr.city || "",
      postalcode: homeAddr.postcode || "",
      country: homeAddr.country || "",
    };

    try {
      const r = await fetch(url, {
        method: "PUT",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const text = await r.text();

      if (!r.ok) {
        setSavingHome(false);
        return alert(`Could not save home address:\n${text}`);
      }

      const updated = JSON.parse(text);

      setMe((m) => (m ? { ...m, home: updated } : m));

      // update localStorage
      storeUserToStorage({
        ...updated,
      });

      setSavingHome(false);
      setEditingHome(false);
      alert("Home address saved.");
    } catch (e: any) {
      setSavingHome(false);
      alert(`Error: ${e.message || e}`);
    }
  }

  async function saveAddress() {
    const { token } = readAuthFromStorage();

    if (!me?.id) {
      alert("User ID missing — cannot update shipping address.");
      return;
    }

    if (!token) {
      alert("You are not logged in.");
      return;
    }

    setSavingAddress(true);

    const url = `${API_BASE}/users/${me.id}`;

    const payload = {
      shipping_line1: addr.line1 || "",
      shipping_line2: addr.line2 || "",
      shipping_city: addr.city || "",
      shipping_postcode: addr.postcode || "",
      shipping_country: addr.country || "",
    };

    try {
      const r = await fetch(url, {
        method: "PUT",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const text = await r.text();

      if (!r.ok) {
        setSavingAddress(false);
        return alert(`Could not save shipping address:\n${text}`);
      }

      const updated = JSON.parse(text);

      setMe((m) => (m ? { ...m, shipping: updated } : m));

      // store it
      storeUserToStorage({
        ...updated,
      });

      setSavingAddress(false);
      setEditingShipping(false);
      alert("Shipping address saved.");
    } catch (e: any) {
      setSavingAddress(false);
      alert(`Error: ${e.message || e}`);
    }
  }

  async function changePassword() {
    // Basic client-side checks
    if (!curPw) return alert("Please enter your current password.");
    if (!newPw || newPw.length < 8)
      return alert("New password must be at least 8 characters.");
    if (newPw !== newPw2) return alert("New passwords do not match.");

    const { token } = readAuthFromStorage();
    if (!token) {
      alert("You must be logged in to change your password.");
      return;
    }

    if (!me?.id) {
      alert("User ID missing — cannot change password.");
      return;
    }

    setChangingPw(true);

    // strip potential HTML errors
    const stripHtml = (s: string) =>
      s
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    // NEW ENDPOINT
    const url = `${API_BASE}/users/changePassword/${me.id}`;

    const payload = {
      currentPassword: curPw,
      newPassword: newPw,
      confirmPassword: newPw2,
    };

    console.debug("[account/changePassword] POST", url);

    try {
      const r = await fetch(url, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const text = await r.text();

      if (!r.ok) {
        const msg = stripHtml(text || `HTTP ${r.status}`);
        throw new Error(msg);
      }

      setChangingPw(false);
      setCurPw("");
      setNewPw("");
      setNewPw2("");

      alert("Password updated successfully.");
    } catch (e: any) {
      setChangingPw(false);
      alert(`Could not change password: ${e?.message || "Unknown error"}`);
    }
  }

  /* ---------- UI ---------- */
  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-semibold mb-6">My Account</h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b">
        <Tab
          label="Profile"
          active={active === "profile"}
          onClick={() => setActive("profile")}
        />
        <Tab
          label="Orders"
          active={active === "orders"}
          onClick={() => setActive("orders")}
        />
        <Tab
          label="Reorder"
          active={active === "reorder"}
          onClick={() => setActive("reorder")}
        />
      </div>

      {loading ? (
        <div className="animate-pulse text-gray-500">Loading…</div>
      ) : (
        <>
          {/* PROFILE TAB */}
          {active === "profile" && (
            <div className="space-y-8">
              <Card>
                <SectionTitle>Profile</SectionTitle>
                <div className="grid md:grid-cols-2 gap-4">
                  <LabeledInput
                    label="First name"
                    value={firstName}
                    onChange={setFirstName}
                    disabled={!editingProfile}
                  />
                  <LabeledInput
                    label="Last name"
                    value={lastName}
                    onChange={setLastName}
                    disabled={!editingProfile}
                  />
                  <LabeledInput
                    label="Email"
                    type="email"
                    value={email}
                    onChange={setEmail}
                    disabled={!editingProfile}
                  />
                  <LabeledInput
                    label="Phone"
                    value={phone}
                    onChange={setPhone}
                    disabled={!editingProfile}
                  />
                  <LabeledInput
                    label="Date of birth"
                    type="date"
                    value={dateOfBirth}
                    onChange={setDob}
                    disabled={!editingProfile}
                  />
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <Button
                    onClick={() => setEditingProfile(true)}
                    disabled={editingProfile}
                  >
                    Edit
                  </Button>
                  <Button
                    onClick={saveProfile}
                    loading={savingProfile}
                    disabled={!editingProfile}
                  >
                    Save
                  </Button>
                </div>
              </Card>

              <Card>
                <SectionTitle>Home address</SectionTitle>
                <div className="grid md:grid-cols-2 gap-4">
                  <LabeledInput
                    label="Address line 1"
                    value={homeAddr.line1 || ""}
                    onChange={(v) => setHomeAddr((a) => ({ ...a, line1: v }))}
                    disabled={!editingHome}
                  />
                  <LabeledInput
                    label="Address line 2"
                    value={homeAddr.line2 || ""}
                    onChange={(v) => setHomeAddr((a) => ({ ...a, line2: v }))}
                    disabled={!editingHome}
                  />
                  <LabeledInput
                    label="City"
                    value={homeAddr.city || ""}
                    onChange={(v) => setHomeAddr((a) => ({ ...a, city: v }))}
                    disabled={!editingHome}
                  />
                  <LabeledInput
                    label="Postcode"
                    value={homeAddr.postcode || ""}
                    onChange={(v) =>
                      setHomeAddr((a) => ({ ...a, postcode: v }))
                    }
                    disabled={!editingHome}
                  />
                  <LabeledInput
                    label="Country"
                    value={homeAddr.country || ""}
                    onChange={(v) => setHomeAddr((a) => ({ ...a, country: v }))}
                    disabled={!editingHome}
                  />
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <Button
                    onClick={() => setEditingHome(true)}
                    disabled={editingHome}
                  >
                    Edit
                  </Button>
                  <Button
                    onClick={saveHomeAddress}
                    loading={savingHome}
                    disabled={!editingHome}
                  >
                    Save
                  </Button>
                </div>
              </Card>

              <Card>
                <SectionTitle>Shipping address</SectionTitle>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={sameAsHome}
                      onChange={(e) => setSameAsHome(e.target.checked)}
                      className="h-4 w-4"
                    />
                    <span>Use home address for shipping</span>
                  </label>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <LabeledInput
                    label="Address line 1"
                    value={addr.line1 || ""}
                    onChange={(v) => setAddr((a) => ({ ...a, line1: v }))}
                    disabled={!editingShipping || sameAsHome}
                    placeholder="House number and street"
                  />
                  <LabeledInput
                    label="Address line 2"
                    value={addr.line2 || ""}
                    onChange={(v) => setAddr((a) => ({ ...a, line2: v }))}
                    disabled={!editingShipping || sameAsHome}
                    placeholder="Apartment, suite, etc. optional"
                  />
                  <LabeledInput
                    label="City"
                    value={addr.city || ""}
                    onChange={(v) => setAddr((a) => ({ ...a, city: v }))}
                    disabled={!editingShipping || sameAsHome}
                    placeholder="Town or city"
                  />
                  <LabeledInput
                    label="Postcode"
                    value={addr.postcode || ""}
                    onChange={(v) => setAddr((a) => ({ ...a, postcode: v }))}
                    disabled={!editingShipping || sameAsHome}
                    placeholder="e.g. LS1 4JF"
                  />
                  <LabeledInput
                    label="Country"
                    value={addr.country || ""}
                    onChange={(v) => setAddr((a) => ({ ...a, country: v }))}
                    disabled={!editingShipping || sameAsHome}
                    placeholder="e.g. United Kingdom"
                  />
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <Button
                    onClick={() => setEditingShipping(true)}
                    disabled={editingShipping}
                  >
                    Edit
                  </Button>
                  <Button
                    onClick={saveAddress}
                    loading={savingAddress}
                    disabled={!editingShipping}
                  >
                    Save
                  </Button>
                </div>
              </Card>

              <Card>
                <SectionTitle>Change password</SectionTitle>
                <div className="grid md:grid-cols-2 gap-4">
                  <LabeledInput
                    label="Current password"
                    type="password"
                    value={curPw}
                    onChange={setCurPw}
                  />
                  <div className="hidden md:block" />
                  <LabeledInput
                    label="New password"
                    type="password"
                    value={newPw}
                    onChange={setNewPw}
                  />
                  <LabeledInput
                    label="Confirm new password"
                    type="password"
                    value={newPw2}
                    onChange={setNewPw2}
                  />
                </div>
                <div className="mt-4 flex justify-end">
                  <Button onClick={changePassword} loading={changingPw}>
                    Update password
                  </Button>
                </div>
              </Card>
            </div>
          )}

          {/* ORDERS TAB */}
          {active === "orders" && (
            <Card>
              <div className="flex items-center justify-between mb-2">
                <SectionTitle>Order history</SectionTitle>
                <div className="flex items-center gap-2">
                  {ordersLoading && (
                    <span className="text-xs text-gray-500">Refreshing…</span>
                  )}
                  <Button onClick={refetchOrders} disabled={ordersLoading}>
                    Refresh
                  </Button>
                </div>
              </div>
              {ordersLoading ? (
                <p className="text-sm text-gray-600">Loading orders…</p>
              ) : !Array.isArray(orders) || orders.length === 0 ? (
                <p className="text-sm text-gray-600">No orders yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full table-fixed text-sm">
                    <colgroup>
                      <col className="w-[140px]" /> {/* Order # */}
                      <col className="w-[110px]" /> {/* Date */}
                      <col className="w-[130px]" /> {/* Payment */}
                      <col /> {/* Items */}
                      <col className="w-[60px]" /> {/* Qty */}
                      <col className="w-[120px]" /> {/* Total */}
                      <col className="w-[160px]" /> {/* Status */}
                    </colgroup>

                    <thead>
                      <tr className="border-b text-xs uppercase text-zinc-500 bg-zinc-50">
                        <th className="py-2 px-4 text-left">Order #</th>
                        <th className="py-2 px-2 text-left">Date</th>
                        <th className="py-2 px-2 text-left">Payment</th>
                        <th className="py-2 px-2 text-left">Items</th>
                        <th className="py-2 px-2 text-right">Qty</th>
                        <th className="py-2 px-4 text-right">Total</th>
                        <th className="py-2 px-4 text-left">Status</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-zinc-200">
                      {orders.map((o) => {
                        const lines = Array.isArray(o.items)
                          ? o.items.map((it: any) => {
                              const rawName = String(
                                it.name ||
                                  it.title ||
                                  it.product_name ||
                                  it.treatment ||
                                  it.sku ||
                                  "Item"
                              ).trim();

                              // Prefer explicit variation fields first
                              let opt = String(
                                it.variations ??
                                  it.variation ??
                                  it.variant ??
                                  it.optionLabel ??
                                  it.opt ??
                                  it.variant_title ??
                                  it.strength ??
                                  it.dose ??
                                  ""
                              ).trim();

                              let name = rawName;

                              if (opt) {
                                // If the explicit variation already appears in the name, strip it out
                                if (
                                  name.toLowerCase().includes(opt.toLowerCase())
                                ) {
                                  const parsed = splitNameAndVariation(name);
                                  name = parsed.base;
                                }
                              } else {
                                // Derive variation from the name when not explicitly provided
                                const parsed = splitNameAndVariation(name);
                                name = parsed.base;
                                opt = parsed.opt || "";
                              }

                              return {
                                name,
                                variation: opt || "",
                                qty: Math.max(
                                  1,
                                  Number(it.qty ?? it.quantity) || 1
                                ),
                              };
                            })
                          : [];

                        // For the Qty column, show either a single number (sum) or a per-line list aligned right
                        const qtySum = lines.reduce(
                          (n, it) => n + (Number(it.qty) || 0),
                          0
                        );

                        return (
                          <tr key={o.id} className="align-top">
                            <td className="py-3 px-4 text-left font-medium">
                              {o.id}
                            </td>
                            <td className="py-3 px-2 text-left">
                              {new Date(o.createdAt).toLocaleDateString(
                                "en-GB"
                              )}
                            </td>
                            <td className="py-3 px-2 text-left">
                              {(() => {
                                const p = paymentBadge(o);
                                return (
                                  <span
                                    className={cls(
                                      "px-2 py-1 rounded-full text-xs inline-flex items-center ring-1",
                                      p.cls
                                    )}
                                  >
                                    {p.text}
                                  </span>
                                );
                              })()}
                            </td>
                            <td className="py-3 px-2 text-left">
                              {lines.length > 0 ? (
                                <ul className="space-y-0.5 leading-5">
                                  {lines.map((it, idx) => (
                                    <li
                                      key={idx}
                                      title={
                                        it.variation
                                          ? `${it.name} ${it.variation}`
                                          : it.name
                                      }
                                    >
                                      <div className="text-zinc-900">
                                        {it.name}
                                      </div>
                                      {it.variation ? (
                                        <div className="text-xs text-zinc-500">
                                          {it.variation}
                                        </div>
                                      ) : null}
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td className="py-3 px-2 text-right align-top tabular-nums">
                              {lines.length <= 1 ? (
                                <span className="font-mono">
                                  {qtySum || (lines[0]?.qty ?? 1)}
                                </span>
                              ) : (
                                <ul className="space-y-0.5">
                                  {lines.map((it, idx) => (
                                    <li key={idx} className="font-mono">
                                      {it.qty}
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right font-medium">
                              {fmtMoney(o.totalMinor)}
                            </td>
                            <td className="py-3 px-4 text-left">
                              {(() => {
                                const t = bookingText(o);
                                // Color logic for Order Status badge
                                let badgeCls =
                                  "bg-gray-50 text-gray-700 border border-gray-200";
                                if (t === "Pending") {
                                  badgeCls =
                                    "bg-amber-50 text-amber-700 border border-amber-200";
                                } else if (
                                  t === "Approved" ||
                                  t === "Confirmed"
                                ) {
                                  badgeCls =
                                    "bg-emerald-50 text-emerald-700 border border-emerald-200";
                                } else if (
                                  t === "Rejected" ||
                                  t === "Refunded"
                                ) {
                                  badgeCls =
                                    "bg-rose-50 text-rose-700 border border-rose-200";
                                }
                                return t ? (
                                  <span
                                    className={cls(
                                      "px-2 py-1 rounded-full text-xs inline-flex items-center ring-1",
                                      badgeCls
                                    )}
                                  >
                                    {t}
                                  </span>
                                ) : (
                                  "—"
                                );
                              })()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}

          {/* REORDER TAB */}
          {active === "reorder" && (
            <div className="space-y-4">
              <Card>
                <SectionTitle>Quick reorder</SectionTitle>
                <p className="text-sm text-gray-600 mb-4">
                  Choose a service to reorder from. Each service has its own
                  flow.
                </p>
                <div className="inline-flex items-center rounded-full border border-emerald-600 text-emerald-700 px-3 py-2">
                  <svg
                    aria-hidden
                    className="mr-2 h-4 w-4"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path d="M7 7l3-3 3 3M7 13l3 3 3-3" />
                  </svg>
                  <select
                    aria-label="Select service to reorder"
                    className="appearance-none bg-transparent outline-none pr-6"
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v) router.push(v);
                    }}
                    defaultValue=""
                  >
                    {reorderOptions.map((opt) => (
                      <option key={opt.label} value={opt.href}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </Card>

              <Card>
                <SectionTitle>Recent items</SectionTitle>
                {orders.length === 0 ? (
                  <p className="text-sm text-gray-600">
                    No previous items yet.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-3">
                    {uniqueRecentItems(orders).map((it) => (
                      <div
                        key={it.sku}
                        className="border rounded-xl p-3 w-[280px]"
                      >
                        <div className="font-medium">{it.name}</div>
                        <div className="text-sm text-gray-600 mt-1">
                          Last ordered {it.lastDate}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function PatientPage() {
  return (
    <Suspense
      fallback={<div className="max-w-5xl mx-auto px-4 py-8">Loading…</div>}
    >
      <PatientPageWrapper />
    </Suspense>
  );
}

/* ---------------- little components ---------------- */
function Tab({
  label,
  active,
  onClick,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={cls(
        "px-4 py-2 -mb-px border-b-2",
        active
          ? "border-emerald-600 text-emerald-700"
          : "border-transparent text-gray-600 hover:text-gray-800"
      )}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5">
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg font-semibold mb-4">{children}</h2>;
}

function Button(props: {
  children: React.ReactNode;
  onClick?: () => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  const isDisabled = props.loading || props.disabled;
  return (
    <button
      onClick={props.onClick}
      disabled={isDisabled}
      className={cls(
        "px-5 py-2 rounded-full border text-sm",
        isDisabled
          ? "opacity-60 cursor-not-allowed border-gray-300 text-gray-600"
          : "border-emerald-600 text-emerald-700 hover:bg-emerald-50"
      )}
    >
      {props.loading ? "Please wait…" : props.children}
    </button>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm text-gray-700">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="mt-1 w-full border rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-gray-300 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed"
      />
    </label>
  );
}

/* Unique recent items helper */
function uniqueRecentItems(
  orders: Order[]
): Array<{ sku: string; name: string; lastDate: string }> {
  const list: Array<{ sku: string; name: string; date: number }> = [];
  for (const o of orders) {
    const ts = new Date(o.createdAt).getTime();
    for (const it of o.items) {
      list.push({ sku: it.sku, name: it.name, date: ts });
    }
  }
  return list
    .sort((a, b) => b.date - a.date)
    .slice(0, 20)
    .map((x) => ({
      sku: x.sku,
      name: x.name,
      lastDate: new Date(x.date).toLocaleDateString("en-GB"),
    }));
}
