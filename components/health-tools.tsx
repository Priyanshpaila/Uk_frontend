import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Search, Plus, Calculator, Pill } from "lucide-react"

export function HealthTools() {
  return (
    <section className="py-16 bg-sky-100">
      <div className="container mx-auto px-4">
        <h2 className="text-4xl font-bold text-center text-gray-900 mb-12 text-balance">
          Putting you in control with our free health tools
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Health Hub */}
          <Card className="p-8 bg-white">
            <div className="mb-6">
              <img
                src="/person-exercising-with-yoga-mat.png"
                alt="Health and wellness"
                className="w-full h-48 object-cover rounded-lg"
              />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Health Hub</h3>
            <p className="text-gray-600 mb-6">
              Access reliable health advice and guidance reviewed by our healthcare professionals
            </p>
            <div className="flex flex-wrap gap-2 mb-6">
              <Button variant="outline" size="sm">
                Heart Health
              </Button>
              <Button variant="outline" size="sm">
                Weight Loss
              </Button>
              <Button variant="outline" size="sm">
                Digestive Health
              </Button>
              <Button variant="outline" size="sm">
                Mental Health
              </Button>
              <Button variant="outline" size="sm">
                Women's Health
              </Button>
              <Button variant="outline" size="sm">
                Men's Health
              </Button>
            </div>
            <Button className="w-full">Visit Health Hub</Button>
          </Card>

          {/* Medicine Stock Checker */}
          <Card className="p-8 bg-white">
            <div className="flex items-center mb-4">
              <div className="w-6 h-6 bg-green-500 rounded-full mr-3"></div>
              <h3 className="text-xl font-bold text-gray-900">Medicine Stock Checker</h3>
            </div>
            <p className="text-gray-600 mb-6">
              See if we have the medicine you need before you place a prescription request.
            </p>
            <Button className="w-full mb-8">Check stock now</Button>

            {/* Additional tools */}
            <div className="space-y-6">
              <div className="flex items-center space-x-4">
                <Search className="w-8 h-8 text-gray-600" />
                <div>
                  <h4 className="font-semibold text-gray-900">Local services finder</h4>
                  <Button variant="outline" size="sm" className="mt-2 bg-transparent">
                    Search now
                  </Button>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <Plus className="w-8 h-8 text-gray-600" />
                <div>
                  <h4 className="font-semibold text-gray-900">Health Conditions A-Z Directory</h4>
                  <Button variant="outline" size="sm" className="mt-2 bg-transparent">
                    Explore conditions
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {/* Medicines Directory & BMI Calculator */}
          <div className="space-y-8">
            <Card className="p-6 bg-white">
              <div className="flex items-center justify-center mb-4">
                <Pill className="w-12 h-12 text-gray-600" />
              </div>
              <h3 className="text-xl font-bold text-center text-gray-900 mb-4">Medicines A-Z Directory</h3>
              <Button variant="outline" className="w-full bg-transparent">
                Browse medicines
              </Button>
            </Card>

            <Card className="p-6 bg-white">
              <div className="flex items-center justify-center mb-4">
                <Calculator className="w-12 h-12 text-gray-600" />
              </div>
              <h3 className="text-xl font-bold text-center text-gray-900 mb-4">BMI Calculator</h3>
              <Button variant="outline" className="w-full bg-transparent">
                Calculate my BMI
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </section>
  )
}
