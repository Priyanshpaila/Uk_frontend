import type React from "react"
import type { Metadata, Viewport } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { Suspense } from "react"
import Script from "next/script"
import "./globals.css"

import { Header } from "@/components/header"            // default export
import { Footer } from "@/components/footer"            // default export
import { CartProvider } from "@/components/cart-context"  // named export
import CartDrawer from "@/components/cart-drawer"   // default export

export const metadata: Metadata = {
  title: "Pharmacy Express - Online Pharmacy",
  description:
    "Your trusted online pharmacy for NHS prescriptions, health services, and wellness products. Serving 1.6 million patients nationwide.",
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body suppressHydrationWarning className={`flex flex-col min-h-screen antialiased bg-white text-neutral-900 font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <a href="#content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:rounded-md focus:bg-black focus:px-3 focus:py-2 focus:text-white">Skip to content</a>
        <CartProvider>
          {/* Header on all pages */}
          <Suspense fallback={null}>
            <Header />
          </Suspense>

          {/* Page content */}
          <main id="content" className="flex-grow">
            <Suspense fallback={null}>{children}</Suspense>
          </main>

          {/* Footer on all pages */}
          <Footer />

          {/* Basket drawer available globally */}
          <Suspense fallback={null}>
            <CartDrawer
              proceedHref="/auth"
              proceedLabel="Continue"
              addMoreLabel="Add items"
            />
          </Suspense>
          <Analytics />
          <Script id="trustpilot-bootstrap" src="https://widget.trustpilot.com/bootstrap/v5/tp.widget.bootstrap.min.js" strategy="afterInteractive" />
        </CartProvider>
      </body>
    </html>
  )
}
