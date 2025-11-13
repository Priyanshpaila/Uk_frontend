"use client"

import { Button } from "@/components/ui/button"
import { Facebook, Twitter, Youtube, Linkedin, ChevronUp } from "lucide-react"
import Image from "next/image"
import { Mail, MapPin, Phone } from "lucide-react"

export function Footer() {
  const directions =
    "https://www.google.com/maps/dir/?api=1&destination=53.6992647,-1.5105271"

  return (
    <>
      {/* Map above the footer with overlay */}
      <section className="bg-white">
        <div className="container mx-auto px-4 pt-12">
          <div className="relative w-full rounded-2xl overflow-hidden ring-1 ring-gray-200 shadow aspect-[16/9] md:h-96">
            <iframe
              title="Pharmacy Express location map"
              key="map-v2"
              src="https://www.google.com/maps?q=53.6992647,-1.5105271&z=17&output=embed"
              className="absolute inset-0 w-full h-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />

            {/* Soft top gradient for legibility */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/40 to-transparent" />

            {/* Overlay card with actions */}
            <div className="absolute inset-x-4 bottom-4 md:inset-x-auto md:left-6 md:bottom-6">
              <div className="mx-auto md:mx-0 w-full max-w-[520px] bg-white/95 backdrop-blur rounded-xl shadow p-4 md:p-5 ring-1 ring-gray-200">
                <p className="text-sm text-gray-700">
                  Pharmacy Express, Unit 4 The Office Campus Paragon Business Park Wakefield West Yorkshire WF1 2UY
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <a
                    href={directions}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-blue-700"
                  >
                    Open directions
                  </a>
                  <button
                    onClick={() =>
                      navigator.clipboard.writeText(
                        "Unit 4 The Office Campus Paragon Business Park Wakefield West Yorkshire WF1 2UY"
                      )
                    }
                    className="inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200"
                  >
                    Copy address
                  </button>
                  <a
                    href="tel:01924971414"
                    className="inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200"
                  >
                    Call 01924 971414
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-white border-t">
        <div className="py-12">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              {/* Logo and Description */}
              <div className="space-y-4">
                <Image
                  src="/pharmacy-express-logo.png"
                  alt="Pharmacy Express"
                  width={180}
                  height={60}
                  className="h-12 w-auto"
                />
                <p className="text-sm text-gray-600 leading-relaxed">
                  Experience personalised confidential care with our private pharmacy services tailored to your unique
                  needs. Book your appointment today for expert consultations and bespoke solutions in a comfortable
                  setting.
                </p>
                <div className="flex space-x-4">
                  <Facebook className="w-5 h-5 text-gray-600 hover:text-blue-600 cursor-pointer" />
                  <Twitter className="w-5 h-5 text-gray-600 hover:text-blue-600 cursor-pointer" />
                  <Youtube className="w-5 h-5 text-gray-600 hover:text-red-600 cursor-pointer" />
                  <Linkedin className="w-5 h-5 text-gray-600 hover:text-blue-600 cursor-pointer" />
                </div>
              </div>

              {/* Information */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-4">Information</h4>
                <ul className="space-y-3 text-sm text-gray-600">
                  <li>
                    <a href="#" className="hover:text-blue-600 flex items-center">
                      <span className="mr-2">✦</span> About Us
                    </a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-blue-600 flex items-center">
                      <span className="mr-2">✦</span> Contact Us
                    </a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-blue-600 flex items-center">
                      <span className="mr-2">✦</span> Terms and Conditions
                    </a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-blue-600 flex items-center">
                      <span className="mr-2">✦</span> Privacy Policy
                    </a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-blue-600 flex items-center">
                      <span className="mr-2">✦</span> Returns Policy
                    </a>
                  </li>
                </ul>
              </div>

              {/* Contact Us */}
               <div className="space-y-5 text-gray-700">
                  {/* Heading */}
                  <h4 className="font-semibold text-gray-900 text-lg">Contact Us</h4>
                  <p className="text-sm text-gray-500">Got questions? Call us</p>
                  <p className="text-2xl font-bold text-gray-900 tracking-tight">01924 971414</p>

                  {/* Email */}
                  <a
                    href="mailto:info@pharmacy-express.co.uk"
                    className="flex items-center gap-3 group"
                  >
                    <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-100 transition">
                      <Mail className="w-5 h-5" />
                    </div>
                    <span className="text-sm group-hover:text-blue-600">
                      info@pharmacy-express.co.uk
                    </span>
                  </a>

                  {/* Address */}
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-pink-50 text-pink-600">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <address className="not-italic text-sm leading-relaxed">
                      Unit 4, The Office Campus <br />
                      Paragon Business Park, Wakefield <br />
                      West Yorkshire WF1 2UY
                    </address>
                  </div>
                </div>

              {/* CEO and Superintendent */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-4">Ceo and Superintendent</h4>
                <div className="space-y-2 text-sm text-gray-600">
                  <p className="font-medium text-gray-900">Wasim Malik</p>
                  <p>GPHC No 2066988</p>
                  <a href="#" className="text-blue-600 hover:underline">
                    Registered Pharmacy 9012468
                  </a>
                </div>
              </div>
            </div>

            {/* Bottom Section */}
            <div className="mt-12 pt-8 border-t flex justify-between items-center">
              <p className="text-sm text-gray-600">© 2025 All Rights Reserved.</p>
              <Button
                size="sm"
                className="rounded-full bg-black hover:bg-gray-800 text-white p-2"
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              >
                <ChevronUp className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </footer>
    </>
  )
}
