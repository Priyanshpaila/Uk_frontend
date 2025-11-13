import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import ProductCard, { Product as ListingProduct } from "@/components/product-card"

type PriceRow = { label: string; price: number; note?: string }
type FAQ = { q: string; a: string }

type ProductDetail = {
  name: string
  image: string
  intro: string
  why?: string[]
  howToBuy?: string[]
  priceTable?: PriceRow[]
  faqs?: FAQ[]
  outOfStock?: boolean
}

const money = (n: number) => `£${n.toFixed(2)}`

const PRODUCTS: Record<string, ProductDetail> = {
  "mounjaro": {
    name: "Mounjaro Tirzepatide",
    image: "/meds/mounjaro.jpg",
    intro:
      "Mounjaro is a weekly injection that helps regulate appetite and supports weight loss when combined with healthy eating and lifestyle changes",
    why: [
      "UK registered pharmacy team",
      "Support available after purchase",
      "Fast discreet delivery",
    ],
    howToBuy: [
      "Complete the online consultation",
      "Our prescribers review your answers and approve when safe",
      "We prepare and ship with tracked next day delivery",
    ],
    priceTable: [
      { label: "2.5mg Starter Pack Needles Swabs Sharps bin", price: 169.99 },
      { label: "2.5mg and 5mg Starter Pack", price: 338.0 },
      { label: "2.5mg", price: 159.99 },
      { label: "5mg", price: 173.99 },
      { label: "7.5mg", price: 229.99 },
      { label: "10mg", price: 254.99 },
      { label: "12.5mg", price: 269.99 },
      { label: "15mg", price: 294.99 },
    ],
    faqs: [
      {
        q: "How does it work",
        a: "It mimics gut hormones that help control blood sugar and fullness which can reduce hunger",
      },
      {
        q: "How do I use it",
        a: "One injection each week using the pre filled pen with simple self use guidance provided",
      },
      {
        q: "Who should not use it",
        a: "Not suitable for some medical histories including certain thyroid conditions and past pancreatitis Speak to our team for advice",
      },
    ],
  },


  "wegovy": {
    name: "Wegovy Semaglutide",
    image: "/meds/wegovy.jpg",
    intro:
      "Wegovy is a weekly injection used for weight management alongside diet and activity support",
    priceTable: [
      { label: "0.25mg", price: 99.49 },
      { label: "0.5mg", price: 104.49 },
      { label: "1mg", price: 114.49 },
      { label: "1.7mg", price: 159.99 },
      { label: "2.4mg", price: 209.99 },
    ],
  },

  "saxenda": {
    name: "Saxenda Liraglutide",
    image: "/meds/saxenda.jpg",
    intro:
      "Daily injection used for weight management with lifestyle support",
    priceTable: [{ label: "1 pen", price: 0.01, note: "currently out of stock" }],
    outOfStock: true,
  },

  "orlistat": {
    name: "Orlistat Xenical and generic",
    image: "/meds/orlistat.jpeg",
    intro:
      "Orlistat blocks some fat from being absorbed which can help reduce calorie intake when used with a balanced diet",
    priceTable: [
      { label: "Orlistat generic 120mg 84 capsules", price: 25.99 },
      { label: "Xenical 120mg 84 capsules", price: 49.99 },
    ],
  },

  "freestyle-libre": {
    name: "Freestyle Libre Plus 2 sensors pack of one",
    image: "/meds/libre.jpg",
    intro:
      "Flash glucose monitoring sensor to check sugar levels without finger pricks Useful for some patients during weight loss treatment",
    priceTable: [{ label: "One pack", price: 50.0 }],
  },

  "sharps-bin": {
    name: "Sharps bin one litre",
    image: "/meds/sharps.jpg",
    intro: "Safe disposal for used needles and sharps",
    priceTable: [{ label: "One litre bin", price: 4.99 }],
  },

  "valupak": {
    name: "Valupak multivitamins fifty tablets",
    image: "/meds/valupak.jpeg",
    intro: "Everyday multivitamin tablets",
    priceTable: [{ label: "One pack fifty tablets", price: 4.99 }],
  },

  "mounjaro-maintenance": {
    name: "Mounjaro maintenance plans",
    image: "/meds/mounjaro-maintenance.jpg",
    intro:
      "Flexible plans designed to help you sustain results after reaching your goal Change plan strength when your needs change",
    priceTable: [
      { label: "Mounjaro 2.5mg Maintenance", price: 144.99 },
      { label: "Mounjaro 5mg Maintenance", price: 164.99 },
      { label: "Mounjaro 7.5mg Maintenance", price: 224.99 },
      { label: "Mounjaro 10mg Maintenance", price: 244.99 },
      { label: "Mounjaro 12.5mg Maintenance", price: 264.99 },
      { label: "Mounjaro 15mg Maintenance", price: 284.99 },
    ],
    faqs: [
      {
        q: "Who should use a maintenance plan",
        a: "Patients who have completed the active weight loss phase and want structured support to maintain their new weight",
      },
      {
        q: "Can I switch strength later",
        a: "Yes plans are flexible and can be adjusted as your needs change",
      },
    ],
  },
}

export default async function ProductDetail({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const product = PRODUCTS[slug]
  if (!product) return notFound()

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      {/* header */}
      <div className="grid md:grid-cols-2 gap-8 items-start mb-10">
        <div className="relative w-full h-64 md:h-80">
          <Image
            src={product.image}
            alt={product.name}
            fill
            className="object-contain"
            priority
          />
        </div>

        <div>
          <h1 className="text-3xl font-semibold mb-3">{product.name}</h1>
          <p className="text-gray-700 mb-6">{product.intro}</p>

          <div className="flex gap-3">
            <Link
              href="/private-services/weight-loss/treatments"
              className="px-6 py-2 rounded-md bg-gray-100 hover:bg-gray-200"
            >
              Back to treatments
            </Link>
          </div>
        </div>
      </div>

      {/* quick purchase block */}
      <div className="mb-10">
        <h2 className="text-2xl font-semibold mb-3">Buy {product.name}</h2>
        {product.priceTable && (
          <ProductCard
            product={{
              name: product.name,
              slug,
              image: product.image,
              priceFrom: product.priceTable[0]?.price || 0,
              options: product.priceTable.map((r) => ({ label: r.label, price: r.price })),
              note: undefined,
              maxQty: 1,
              outOfStock: product.outOfStock,
            } as ListingProduct}
          />
        )}
      </div>

      {/* why choose us */}
      {product.why && product.why.length > 0 && (
        <div className="mb-10">
          <h2 className="text-2xl font-semibold mb-3">Why choose us</h2>
          <ul className="list-disc pl-6 space-y-1 text-gray-700">
            {product.why.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </div>
      )}

      {/* how to buy */}
      {product.howToBuy && product.howToBuy.length > 0 && (
        <div className="mb-10">
          <h2 className="text-2xl font-semibold mb-3">How to buy</h2>
          <ol className="list-decimal pl-6 space-y-1 text-gray-700">
            {product.howToBuy.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ol>
        </div>
      )}

      {/* prices */}
      {product.priceTable && (
        <div className="mb-12">
          <h2 className="text-2xl font-semibold mb-3">Prices</h2>
          <table className="w-full border rounded-md overflow-hidden">
            <tbody>
              {product.priceTable.map((row, i) => (
                <tr key={i} className="border-t">
                  <td className="p-3">{row.label}</td>
                  <td className="p-3 w-40">{money(row.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* FAQ */}
      {product.faqs && product.faqs.length > 0 && (
        <>
          <h2 className="text-2xl font-semibold mb-4">Frequently asked questions</h2>
          <div className="space-y-3">
            {product.faqs.map((f, i) => (
              <details key={i} className="border rounded-md p-4">
                <summary className="cursor-pointer font-medium">{f.q}</summary>
                <p className="mt-2 text-gray-700">{f.a}</p>
              </details>
            ))}
          </div>
        </>
      )}

      {/* how it works summary */}
      <div className="mt-12 grid md:grid-cols-3 gap-6 text-center">
        <div className="p-4 bg-emerald-50 rounded-md">
          Complete a quick consultation
        </div>
        <div className="p-4 bg-emerald-50 rounded-md">
          Clinician reviews and prescribes when safe
        </div>
        <div className="p-4 bg-emerald-50 rounded-md">
          Tracked next day delivery to your door
        </div>
      </div>
    </div>
  )
}
