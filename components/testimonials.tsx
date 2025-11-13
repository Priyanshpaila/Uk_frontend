"use client"

import { useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel"

const testimonials = [
  {
    title: "100% Excellent Service from Pharmacy Express",
    content:
      "My experience of Pharmacy Express has been absolutely excellent. I was privileged to deal mostly with Wasim who was thorough, professional, responsive and helpful. Prices were very competitive too. I switched providers and my only regret is that I didn't do it sooner. Thank you.",
    author: "Aine D",
    rating: 5,
  },
  {
    title: "Top notch service everytime!!",
    content:
      "I have been using Pharmacy Express for a few months now and have only ever had an extremely positive experience! Even amidst all of the recent changes with new pricing and surge in orders, Pharmacy Express have continued to deliver an excellent service. I have never waited longer than 24 hours for dispatch and they personally check your order arrives safely. Emails are answered quickly. Every order has been correct and perfectly packaged.",
    author: "Nicola Sharpe",
    rating: 5,
  },
  {
    title: "Customer service that goes above and beyond",
    content:
      "The team at Pharmacy Express have been brilliant, very efficient, with excellent communication and I feel really well supported. They always check to ensure I’ve received my order and it’s always very well packaged too. Best decision I’ve made switching to them as a provider!",
    author: "Carrie Fouche",
    rating: 5,
  },
  {
    title: "Worry free service",
    content:
      "This service has taken all the worry out of ordering repeat prescriptions. They remind you when prescriptions are due and within a couple of days they arrive through the letterbox. Exemplary service.",
    author: "Hester Pendino",
    rating: 5,
  },
  {
    title: "Excellent customer service",
    content:
      "Excellent customer service. Always very responsive to all my questions. Would highly recommend.",
    author: "Josh Preecel",
    rating: 5,
  },
  {
    title: "Really impressed",
    content:
      "I honestly can’t rate Pharmacy Express enough. They’re so responsive, really quick to get in touch and I received my order the next day. The follow up message to see if I’ve received my order and the offer to answer any questions is a lovely touch. I will recommend them to everyone.",
    author: "Tamson Pengelly",
    rating: 5,
  },
]

function Stars({ value }: { value: number }) {
  const full = Math.max(0, Math.min(5, Math.round(value)))
  return (
    <span aria-label={`${full} stars`} className="text-emerald-600">
      {"★★★★★".slice(0, full)}
      <span className="text-neutral-300">{"★★★★★".slice(full)}</span>
    </span>
  )
}

declare global {
  interface Window {
    Trustpilot?: { loadFromDom: () => void }
  }
}

export function Testimonials() {
  useEffect(() => {
    // In some browsers (Safari), the Trustpilot script may load before this widget mounts.
    // Force a scan of the DOM to initialise widgets.
    const load = () => {
      try {
        window.Trustpilot?.loadFromDom()
      } catch {}
    }
    load()
    const t = setTimeout(load, 300) // second pass after layout
    return () => clearTimeout(t)
  }, [])
  return (
    <section className="py-16 bg-white">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header row */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3 text-sm">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-sm bg-emerald-600 grid place-items-center text-white text-sm font-bold">★</div>
              <span className="font-semibold text-neutral-900">Trustpilot</span>
            </div>
            <Stars value={5} />
            <span className="hidden sm:inline text-neutral-600">Rated Excellent with 322 reviews</span>
          </div>
        </div>

        <Carousel
          opts={{
            align: "start",
            loop: true,
          }}
          className="w-full"
        >
          <CarouselContent className="-ml-2 md:-ml-4">
            {testimonials.map((t, index) => (
              <CarouselItem key={index} className="pl-2 md:pl-4 md:basis-1/2 lg:basis-1/3">
                <Card className="h-full rounded-2xl ring-1 ring-neutral-200 bg-white shadow-sm p-6">
                  <div className="flex h-full flex-col">
                    <h3 className="text-lg sm:text-xl font-semibold text-neutral-900 mb-3 text-balance">{t.title}</h3>
                    <p className="text-sm sm:text-base text-neutral-600 leading-relaxed line-clamp-8">{t.content}</p>
                    <div className="mt-6 flex items-center justify-between">
                      <span className="text-sm font-medium text-neutral-800">{t.author}</span>
                      <Stars value={t.rating} />
                    </div>
                  </div>
                </Card>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="hidden lg:flex" />
          <CarouselNext className="hidden lg:flex" />
        </Carousel>

        {/* Trustpilot Review Collector widget */}
        <div className="mt-10">
          <div
            className="trustpilot-widget min-h-[52px]"
            data-locale="en-GB"
            data-template-id="56278e9abfbbba0bdcd568bc"
            data-businessunit-id="67e17f679821aeb44d3f25f5"
            data-style-height="52px"
            data-style-width="100%"
            data-token="24dddbf8-4411-4a47-826a-9e6e04597f93"
          >
            <a href="https://uk.trustpilot.com/review/pharmacy-express.co.uk" target="_blank" rel="noopener">
              Trustpilot
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
