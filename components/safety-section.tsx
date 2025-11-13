import { Shield, CheckCircle, FileCheck } from "lucide-react"
import { Button } from "@/components/ui/button"

export function SafetySection() {
  return (
    <section className="py-16 sm:py-20 bg-gradient-to-b from-neutral-50 to-white/80">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-start gap-8 lg:gap-16 lg:grid-cols-2">
          {/* Left side - Safety features */}
          <div>
            <h2 className="text-h2 font-semibold text-neutral-900 mb-6">Safe and secure</h2>

            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="bg-white p-3 rounded-xl shadow-sm ring-1 ring-neutral-200">
                  <Shield className="h-6 w-6 text-neutral-700" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-neutral-900 mb-1">
                    Registered UK pharmacy
                  </h3>
                  <p className="text-sm sm:text-base text-neutral-600 leading-relaxed">
                    Fully licensed and regulated by the General Pharmaceutical Council
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="bg-white p-3 rounded-xl shadow-sm ring-1 ring-neutral-200">
                  <CheckCircle className="h-6 w-6 text-neutral-700" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-neutral-900 mb-1">
                    Fully inspected and regulated service
                  </h3>
                  <p className="text-sm sm:text-base text-neutral-600 leading-relaxed">
                    Regular inspections ensure we meet the highest safety standards
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="bg-white p-3 rounded-xl shadow-sm ring-1 ring-neutral-200">
                  <FileCheck className="h-6 w-6 text-neutral-700" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-neutral-900 mb-1">
                    Approved UK-licensed treatments
                  </h3>
                  <p className="text-sm sm:text-base text-neutral-600 leading-relaxed">
                    Only genuine, MHRA-approved medications from trusted suppliers
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right side - GPhC card */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-xl ring-1 ring-neutral-200">
            <div className="mb-6">
              <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 ring-1 ring-blue-200">
                <span className="inline-block h-2 w-2 rounded-full bg-blue-500" />
                GPhC Registered
              </span>
            </div>

            <h4 className="text-2xl font-semibold text-neutral-900">General Pharmaceutical Council</h4>
            <div className="h-0.5 w-12 bg-blue-200 my-3" />

            <p className="text-neutral-600 mb-6 leading-relaxed">
              The GPhC is the official body that regulates and inspects all pharmacies in the UK. They ensure we
              prioritise your safety and meet the highest standards.
            </p>

            <a
              href="https://www.pharmacyregulation.org/registers/pharmacy/registrationnumber/9012468"
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <Button
                variant="outline"
                className="w-full border-2 border-blue-600 text-blue-700 hover:bg-blue-50 font-semibold py-3 bg-transparent"
              >
                Verify now
              </Button>
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
