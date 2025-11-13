import React from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

const services = [
  { title: "Acid Reflux", icon: "/icons/acid-reflux.png", bgColor: "bg-cyan-400" },
  { title: "Acne", icon: "/icons/acne.png", bgColor: "bg-pink-400" },
  { title: "Altitude Sickness", icon: "/icons/altitude.png", bgColor: "bg-gray-400" },
  { title: "Anti Malaria", icon: "/icons/malaria.png", bgColor: "bg-green-400" },
  { title: "Back Pain", icon: "/icons/back-pain.png", bgColor: "bg-red-400" },
  { title: "Chickenpox Vaccine", icon: "/icons/chickenpox.png", bgColor: "bg-yellow-400" },
  { title: "Erectile Dysfunction", icon: "/icons/erectile.png", bgColor: "bg-purple-400" },
  { title: "Hajj and Umrah Vaccine", icon: "/icons/hajj-umrah.png", bgColor: "bg-emerald-400" },
  { title: "Hives", icon: "/icons/hives.png", bgColor: "bg-orange-400" },
  { title: "HPV Vaccine", icon: "/icons/hpv.png", bgColor: "bg-indigo-400" },
  { title: "Pertussis (Whooping Cough Vaccine)", icon: "/icons/pertussis.png", bgColor: "bg-teal-400" },
  { title: "Private Covid Vaccination", icon: "/icons/covid.png", bgColor: "bg-blue-500" },
  { title: "Private Flu", icon: "/icons/flu.png", bgColor: "bg-cyan-400" },
  { title: "Respiratory Syncytial Virus", icon: "/icons/rsv.png", bgColor: "bg-lime-400" },
  { title: "Shingles Vaccine", icon: "/icons/shingles.png", bgColor: "bg-amber-400" },
  { title: "Travel Vaccination", icon: "/icons/travel.png", bgColor: "bg-sky-400" },
  { title: "Vitamin B12 Injection", icon: "/icons/b12.png", bgColor: "bg-rose-400" },
  { title: "Weight Management Service", icon: "/icons/weight.png", bgColor: "bg-violet-400" },
]

export function ServiceCards() {
  return (
    <section className="py-12 sm:py-16 bg-gray-50">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4 text-balance">
            Your trusted online pharmacy for fast, expert care
          </h2>
          <p className="text-xl text-gray-600">
            How can we help with your health today?
          </p>
        </div>

        <div
          className="sticky-stack flex flex-col gap-4 sm:grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 sm:gap-6"
          style={{ ['--stack-top' as any]: '128px', ['--overlap' as any]: '12px' }}
        >
          {services.map((service, index) => (
            <Card
              key={index}
              className="sticky-card p-6 text-center border-0 shadow-lg hover:shadow-x1 transition-shadow flex flex-col items-center h-full rounded-2xl bg-white/95 backdrop-blur-sm"
              style={{ ['--stack-i' as any]: index } as React.CSSProperties}
            >
              <div className={`w-14 h-14 sm:w-16 sm:h-16 ${service.bgColor} rounded-2xl flex items-center justify-center mx-auto mb-4`}>
                <img
                  src={service.icon}
                  alt={service.title}
                  className="w-18 h-18 object-contain"
                />
              </div>

              {/* keep titles a consistent height */}
              <h3 className="text-sm font-semibold text-gray-900 mb-4 text-balance leading-tight min-h-[30px]">
                {service.title}
              </h3>

              {/* pin the button to the bottom */}
              <div className="mt-auto w-full">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-black-600 border-blue-600 hover:bg-blue-50 bg-transparent text-xs"
                >
                  Learn More
                </Button>
              </div>
            </Card>

          ))}
        </div>
      </div>
    </section>
  )
}
