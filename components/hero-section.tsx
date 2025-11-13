import { Button } from "@/components/ui/button"
import { ArrowUpRight } from "lucide-react"
import Link from "next/link" 

export function HeroSection() {
  const TRUSTPILOT_URL = "https://www.trustpilot.com/review/pharmacy-express.co.uk" // replace with your real URL

  return (
    <section className="py-8 sm:py-12 lg:py-16 bg-gradient-to-r from-teal-100 via-teal-50 to-white">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 items-start lg:items-center gap-8 lg:gap-12">
          
          {/* Left side - text */}
          <div className="max-w-xl text-center lg:text-left mx-auto"> 
            <div className="bg-red-500 text-white px-4 py-2 rounded-md inline-block mb-6 text-sm font-semibold tracking-wide shadow-md mx-auto lg:mx-0">
              £20 off consultations with code W7X3DL
            </div>
            <h1 className="text-h1 lg:text-[clamp(2.5rem,3.5vw,3.75rem)] xl:text-[clamp(2.75rem,3vw,4rem)] font-semibold text-gray-900 mb-4 leading-[1.1] text-center lg:text-left">
              Lose up to <span className="text-emerald-600 font-extrabold">22.5%</span> of your body weight
            </h1>
            <p className="text-base sm:text-fluid lg:text-[1.125rem] text-gray-700 mb-6 text-center lg:text-left">
              with our clinically proven weight loss programmes
            </p>
            <p className="text-base sm:text-fluid text-gray-600 mb-4 italic font-light text-center lg:text-left">Trusted by 1000+ patients across the UK</p>

            {/* Buttons side by side */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 justify-center lg:justify-start mb-4 min-w-0">
              <Button
                asChild
                className="w-full sm:w-auto flex-none bg-emerald-600 text-white text-md rounded-full shadow-md px-6 py-3 flex items-center justify-center transform transition-transform hover:scale-105"
              >
                <Link href="/private-services/weight-loss">
                  Book Now <ArrowUpRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>

              {/* Trustpilot rating */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 text-sm text-gray-600 mt-2 sm:mt-0 w-full sm:w-auto min-w-0">
                <img src="/trustpilot-logo.svg" alt="Trustpilot" className="h-5 w-auto align-middle" />
                <span className="inline-flex items-center gap-1 whitespace-nowrap">
                  <span className="text-green-600 leading-none" aria-hidden="true">★★★★★</span>
                  <a
                    href={TRUSTPILOT_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    Rated 5 stars by our patients
                  </a>
                </span>
                <span className="sr-only">Trustpilot five star rating</span>
              </div>
            </div>

            {/* Trust badges */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-4 gap-y-2 text-xs sm:text-sm text-gray-700 mt-4">
              <span>GPhC Registered</span>
              <span>Clinically Proven</span>
              <span>UK Based</span>
              <span>Trusted Service</span>
            </div>
          </div>

          {/* Right side - image */}
          <div className="flex justify-center lg:justify-end relative">
            <div className="relative w-full max-w-[390px] aspect-[5/5] md:max-w-[360px] lg:max-w-[420px] xl:max-w-[460px] sm:h-[340px] md:h-[360px] lg:h-[420px] xl:h-[460px] rounded-xl shadow-xl ring-1 ring-gray-200 overflow-hidden">
              <img
                src="/before-and-after-weight-loss-transformation-fat-to.png"
                alt="Weight loss transformation"
                className="absolute inset-0 h-full w-full object-cover"
              />
              {/* Before/After pills */}
              <span className="absolute bottom-3 left-3 px-3 py-1 rounded-full text-[11px] sm:text-xs text-white/95" style={{background: 'linear-gradient(90deg, rgba(0,0,0,0.65), rgba(0,0,0,0.25))'}}>
                Before
              </span>
              <span className="absolute bottom-3 right-3 px-3 py-1 rounded-full text-[11px] sm:text-xs text-white/95" style={{background: 'linear-gradient(90deg, rgba(0,0,0,0.65), rgba(0,0,0,0.25))'}}>
                After
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
