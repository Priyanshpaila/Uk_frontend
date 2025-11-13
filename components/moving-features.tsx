"use client"

import { Package, Home, ClipboardCheck, Settings, RotateCcw } from "lucide-react"

const features = [
  {
    icon: Package,
    title: "Fast, discreet delivery",
    description: "All orders sent in plain logo-free packaging",
  },
  {
    icon: Home,
    title: "No in-person appointments",
    description: "Check eligibility with a quick online consultation",
  },
  {
    icon: ClipboardCheck,
    title: "UK-licensed pharmacy",
    description: "Approved treatments and experienced clinical team",
  },
  {
    icon: Settings,
    title: "Fully regulated service",
    description: "Meeting the highest standards of patient safety",
  },
  {
    icon: RotateCcw,
    title: "Online convenience",
    description: "Treatment for 30+ common conditions available",
  },
]

export function MovingFeatures() {
  return (
    <div className="bg-blue-100 py-8 overflow-hidden">
      <div className="relative">
        <div className="flex animate-scroll gap-6">
          {/* First set of cards */}
          {features.map((feature, index) => (
            <div key={`first-${index}`} className="flex-shrink-0 bg-white rounded-lg p-6 shadow-sm w-80">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <feature.icon className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-sm text-gray-600">{feature.description}</p>
                </div>
              </div>
            </div>
          ))}
          {/* Duplicate set for seamless loop */}
          {features.map((feature, index) => (
            <div key={`second-${index}`} className="flex-shrink-0 bg-white rounded-lg p-6 shadow-sm w-80">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <feature.icon className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-sm text-gray-600">{feature.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        
        .animate-scroll {
          animation: scroll 30s linear infinite;
        }
      `}</style>
    </div>
  )
}
