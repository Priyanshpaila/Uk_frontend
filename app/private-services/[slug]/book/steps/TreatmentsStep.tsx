"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import OptionSelect, { Option as SelectOption } from "@/components/option-select";
import { useCart } from "@/components/cart-context";

// ---------------- Types that mirror the API ----------------
type ApiVariation = {
  id: number;
  title: string;
  price: string | number | null;
  stock?: number | null;
  max_qty?: number | null;
  status?: string | null;
};

type ApiProduct = {
  id: number;
  slug: string;
  name: string;
  desc?: string | null;
  image?: string | null;
  variations: ApiVariation[];
};

type ApiResponse = {
  service: { slug: string; name: string };
  products: ApiProduct[];
};

// --------------- UI card (based on your ProductCard layout) ---------------
type ProductOption = { label: string; price: number; maxQty?: number };

type UIProduct = {
  name: string;
  desc?: string;
  slug: string;
  priceFrom: number;
  image: string;
  options?: ProductOption[];
  outOfStock?: boolean;
  maxQty?: number;
};

function CatalogProductCard({ product, serviceSlug, onAdded }: { product: UIProduct; serviceSlug: string; onAdded?: () => void }) {
  const hasOptions = !!product.options?.length;
  const [selectedOption, setSelectedOption] = useState("");
  const [qty, setQty] = useState(1);
  const { addItem } = useCart();

  const selectedOpt = useMemo(
    () => product.options?.find((o) => o.label === selectedOption),
    [product.options, selectedOption]
  );

  // option-level > product-level > unlimited
  const maxLimit = selectedOpt?.maxQty ?? product.maxQty ?? Infinity;

  const clamp = (v: number) => {
    const base = v || 1;
    return Number.isFinite(maxLimit)
      ? Math.max(1, Math.min(maxLimit as number, base))
      : Math.max(1, base);
  };

  const plainDesc = useMemo(
    () => (product.desc ? product.desc.replace(/<[^>]+>/g, "").trim() : ""),
    [product.desc]
  );

  const onAdd = () => {
    if (product.outOfStock) return;
    if (hasOptions && !selectedOption) return;

    const price =
      product.options?.find((o) => o.label === selectedOption)?.price ??
      product.priceFrom;

    const maxQty =
      product.options?.find((o) => o.label === selectedOption)?.maxQty ??
      product.maxQty ??
      null;

    const unitMinor = Math.round((price || 0) * 100);
    const totalMinor = unitMinor * qty;

    // Build a stable SKU from slug + option label
    const normalise = (s: string) =>
      s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const sku = selectedOption
      ? `${product.slug}:${normalise(selectedOption)}`
      : normalise(product.slug);

    addItem({
      sku,
      slug: product.slug,
      name: product.name,
      image: product.image,
      price, // keep for UI that expects pounds
      qty,
      optionLabel: selectedOption || undefined, // legacy/compat
      label: selectedOption || undefined, // explicit for API
      selectedLabel: selectedOption || undefined, // explicit for API
      variations: selectedOption || undefined, // canonical variation
      unitMinor, // per‑unit in minor (pence)
      priceMinor: unitMinor, // compat alias some code uses
      totalMinor, // line total in minor units
      maxQty,
    });
  };

  return (
    <div className="h-full w-full rounded-3xl border border-gray-200 bg-white shadow-sm hover:shadow-2xl transition p-7 flex flex-col items-center">
      {/* image area */}
      <div className="h-32 md:h-36 w-full flex items-center justify-center mb-5 px-3">
        <img
          src={product.image}
          alt={product.name}
          className="max-h-full object-contain"
        />
      </div>

      {/* header block with reserved heights for alignment */}
      <div className="text-center mb-2 w-full flex flex-col items-center">
        <h3 className="text-2xl font-semibold leading-snug min-h-[56px] flex items-center justify-center">
          {product.name}
        </h3>
        {/* separator */}
        <div className="w-12 h-0.5 bg-gray-200 my-2 rounded-full" />
        {/* short description */}
        {plainDesc ? (
          <p className="text-sm text-gray-600 leading-relaxed max-w-[320px] mx-auto min-h-[48px] flex items-center justify-center text-center">
            {plainDesc}
          </p>
        ) : (
          <div className="min-h-[48px]" />
        )}
      </div>

      <div className="h-px bg-gray-200 mt-2 mb-4 w-full" />

      {/* options */}
      {hasOptions && (
        <div className="mb-3 w-full">
          <OptionSelect
            options={(product.options as unknown as SelectOption[]) || []}
            value={selectedOption}
            onChange={(v) => {
              setSelectedOption(v);
              setQty(1); // reset so new max is respected
            }}
            placeholder="Choose an option"
          />
        </div>
      )}

      {/* qty + add */}
      <div className="mt-auto flex items-center gap-3 w-full">
        <input
          type="number"
          min={1}
          {...(Number.isFinite(maxLimit) ? { max: maxLimit as number } : {})}
          value={qty}
          onChange={(e) => {
            const raw = e.target.value;
            const parsed = Number.isFinite(parseInt(raw, 10))
              ? parseInt(raw, 10)
              : 1;
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
        <p className="mt-2 text-xs text-gray-500">
          Max {maxLimit as number} per order
        </p>
      )}
    </div>
  );
}

// -------------------- Treatments Step --------------------
export default function TreatmentsStep({
  serviceSlug: serviceSlugProp,
  onContinue,
}: {
  serviceSlug?: string;
  onContinue?: () => void;
}) {
  const params = useParams<{ slug: string }>();
  const serviceSlug = serviceSlugProp ?? params?.slug;

  // Track auth state (client-only)
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    // consider either cookie or localStorage token
    try {
      const hasToken = !!localStorage.getItem("token");
      const hasCookie = typeof document !== "undefined" && document.cookie.includes("logged_in=1");
      setIsLoggedIn(hasToken || hasCookie);
    } catch {
      setIsLoggedIn(false);
    }
  }, []);

  // Tell the cart drawer where to go when the user hits "Continue"
  useEffect(() => {
    if (!serviceSlug) return;
    const q = new URLSearchParams(searchParams?.toString() ?? "");
    q.set("step", isLoggedIn ? "raf" : "login"); // next step within the wizard
    const bookingNext = `/private-services/${serviceSlug}/book?${q.toString()}`;

    try {
      sessionStorage.setItem("booking_next", bookingNext);
      sessionStorage.setItem("booking_slug", String(serviceSlug));
    } catch {}
  }, [serviceSlug, isLoggedIn, searchParams]);

  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!serviceSlug) return;

    // Build API base safely — tolerate env values with or without trailing `/api`
    const rawBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
    const normalized = rawBase.replace(/\/+$/, "");
    const apiBase = /\/api$/.test(normalized) ? normalized : `${normalized}/api`;
    const url = `${apiBase}/services/${encodeURIComponent(serviceSlug)}/catalog`;

    let mounted = true;
    setLoading(true);
    setError(null);

    fetch(url, { headers: { Accept: "application/json" } })
      .then(async (res) => {
        if (!res.ok) {
          const txt = await res.text();
          throw new Error(
            `API ${res.status}: ${txt?.slice(0, 180) || "request failed"}`
          );
        }
        return res.json();
      })
      .then((json: ApiResponse) => {
        if (!mounted) return;
        setData(json);
      })
      .catch((err: any) => {
        if (!mounted) return;
        setError(`API error for ${url}: ${String(err?.message || err)}`);
        // Optional: also log to console for dev
        if (typeof window !== "undefined") {
          console.warn("TreatmentsStep fetch failed:", { url, err });
        }
      })
      .finally(() => mounted && setLoading(false));

    return () => {
      mounted = false;
    };
  }, [serviceSlug]);

  // Map API → UI model
  const uiProducts: UIProduct[] = useMemo(() => {
    if (!data?.products?.length) return [];

    const rawBase = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000").replace(/\/+$/, "");
    const apiOrigin = rawBase.endsWith("/api") ? rawBase.slice(0, -4) : rawBase; // remove `/api`

    return data.products.map((p) => {
      const opts: ProductOption[] = (p.variations || []).map((v) => ({
        label: v.title,
        price: Number(v.price ?? 0),
        maxQty: v.max_qty ?? undefined,
      }));

      const priceFrom = opts.length
        ? Math.min(...opts.map((o) => o.price || 0))
        : 0;

      return {
        name: p.name,
        desc: p.desc ?? undefined,
        slug: p.slug,
        priceFrom,
        image:
          p.image
            ? (p.image.startsWith("http") ? p.image : `${apiOrigin}${p.image}`)
            : "/images/product-placeholder.svg",
        options: opts,
        outOfStock: opts.length
          ? opts.every((o) => (o.maxQty ?? 0) <= 0)
          : false,
        maxQty: undefined,
      };
    });
  }, [data]);

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
      <header className="space-y-1">
        <h2 className="text-2xl font-semibold text-center">Available treatments</h2>
        {data?.service?.name && (
          <p className="text-gray-500 text-center">
            Select a treatment to add it to your basket.
          </p>
        )}
      </header>

      {loading && (
        <div className="text-gray-600 text-center">Loading available treatments…</div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-700 text-sm text-center">
          {error}
        </div>
      )}

      {!loading && !error && uiProducts.length === 0 && (
        <div className="text-gray-500 text-center">No treatments are available yet.</div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 justify-items-center">
        {uiProducts.map((p) => (
          <CatalogProductCard key={p.slug} product={p} serviceSlug={(serviceSlug as string) || ""} onAdded={onContinue} />
        ))}
      </div>
    </section>
  );
}