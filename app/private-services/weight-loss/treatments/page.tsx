import Link from "next/link"
import ProductCard, { Product } from "@/components/product-card"
import OpenCartOnQuery from "@/components/open-cart-on-query"
 

export const metadata = {
  title: "Available Treatments",
}

const products: Product[] = [
  {
    name: "Mounjaro",
    slug: "mounjaro",
    priceFrom: 144.99,
    image: "/meds/mounjaro.jpg",
    note: "Needles swabs and a sharps bin must be purchased separately or included in a starter pack",
    maxQty: 2,
    options: [
      { label: "2.5mg Plus 1L Sharps Bin (Starter Pack)", price: 149.99, maxQty: 1 },
      { label: "2.5mg", price: 144.99 },
      { label: "5mg", price: 164.99 },
      { label: "7.5mg", price: 224.99 },
      { label: "10mg", price: 244.99 },
      { label: "12.5mg", price: 264.99 },
      { label: "15mg", price: 284.99 },
    ],
  },
  {
    name: "Mounjaro Maintenance Plans",
    slug: "mounjaro-maintenance",
    priceFrom: 144.99,
    image: "/meds/mounjaro-maintenance.jpg",
    note: "Only select if you are already on our maintenance plan",
    maxQty: 2,
    options: [
      { label: "2.5mg Maintenance", price: 144.99 },
      { label: "5mg Maintenance", price: 164.99 },
      { label: "7.5mg Maintenance", price: 224.99 },
      { label: "10mg Maintenance", price: 244.99 },
      { label: "12.5mg Maintenance", price: 264.99 },
      { label: "15mg Maintenance", price: 284.99 },
    ],
  },
  {
    name: "Wegovy",
    slug: "wegovy",
    priceFrom: 99.49,
    image: "/meds/wegovy.jpg",
    note: "In stock and available now",
    maxQty: 1,
    options: [
      { label: "0.25mg", price: 99.49 },
      { label: "0.5mg", price: 104.49 },
      { label: "1mg", price: 114.49 },
      { label: "1.7mg", price: 159.99 },
      { label: "2.4mg", price: 209.99 },
    ],
  },
  {
    name: "Saxenda",
    slug: "saxenda",
    priceFrom: 0.01,
    image: "/meds/saxenda.jpg",
    note: "Currently out of stock",
    maxQty: 1,
    options: [{ label: "1 pen", price: 0.01 }],
    outOfStock: true,
  },
  {
    name: "Orlistat Xenical",
    slug: "orlistat",
    priceFrom: 25.99,
    image: "/meds/orlistat.jpeg",
    maxQty: 1,
    options: [
      { label: "Orlistat (generic) 120mg 84 capsules", price: 50.0 },
      { label: "Xenical 120mg 84 capsules", price: 50.0 },
    ],
  },
  {
    name: "Freestyle Libre Plus 2",
    slug: "freestyle-libre",
    priceFrom: 50.0,
    image: "/meds/libre.jpg",
    options: [{ label: "1 Sensor (Pack of One)", price: 50.0 }],
  },
  {
    name: "Alcohol Swabs",
    slug: "alcohol-swabs",
    priceFrom: 4.99,
    image: "/meds/alvita-swabs.png",
    options: [{ label: "100 Sachets", price: 4.99 }],
  },
  {
    name: "Pen Needles",
    slug: "pen-needles",
    priceFrom: 4.99,
    image: "/meds/pen-needles.png",
    options: [{ label: "Pack of Pen Needles", price: 4.99 }],
  },
  {
    name: "Sharps Bin",
    slug: "sharps-bin",
    priceFrom: 4.99,
    image: "/meds/sharps.jpg",
    options: [{ label: "1 Litre Bin", price: 4.99 }],
  },
  {
    name: "Valupak Multivitamins",
    slug: "valupak",
    priceFrom: 4.99,
    image: "/meds/valupak.jpeg",
    options: [{ label: "50 Tablets", price: 4.99 }],
  },
]

export default async function ProductListing({
  searchParams,
}: {
  searchParams?: Promise<{ type?: string; openCart?: string; q?: string }>
}) {
  const params = (await searchParams) ?? {}

  const type = typeof params.type === 'string' ? params.type : undefined
  const q = typeof params.q === 'string' ? params.q.trim() : ''
  const qLower = q.toLowerCase()

  const filtered = q
    ? products.filter((p) => {
        const name = p.name.toLowerCase()
        const opts = Array.isArray(p.options) ? p.options.map((o) => (o.label || '')).join(' ').toLowerCase() : ''
        return name.includes(qLower) || opts.includes(qLower)
      })
    : products

  const banner =
    type === "new" ? "You selected new patient" :
    type === "transfer" ? "You selected transfer patient" :
    type === "current" ? "You are a current patient" : null

  const kindForJS = JSON.stringify(type ?? 'new')

  return (
    <div className="bg-emerald-50/10">
      <script
        dangerouslySetInnerHTML={{
          __html: `try{sessionStorage.setItem('pe_intake_kind', ${kindForJS});}catch(e){}`,
        }}
      />
      <OpenCartOnQuery searchParams={params} />
      <div className="max-w-6xl mx-auto px-4 py-6 sm:py-12">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <h1 className="text-2xl sm:text-4xl font-semibold tracking-tight">Available Treatments</h1>
          <Link href="/private-services/weight-loss" className="self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2 rounded-full border border-emerald-600 text-emerald-700 hover:bg-emerald-50">
            ← Back
          </Link>
        </div>

        {banner && (
          <div className="mb-6 rounded-md bg-emerald-50 text-emerald-900 p-3 text-sm">
            {banner}. Browse treatments and pick an option to continue
          </div>
        )}

        {q && (
          <p className="mb-2 text-sm text-gray-600">Found {filtered.length} result{filtered.length === 1 ? '' : 's'} for "{q}"</p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-7">
          {filtered.map((p) => (
            <ProductCard key={p.slug} product={p} />
          ))}
        </div>
      </div>
    </div>
  )
}
