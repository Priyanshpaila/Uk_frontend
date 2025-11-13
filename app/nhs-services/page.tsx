// app/nhs-services/page.tsx
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { Heart, Clock, Star, Stethoscope, Truck } from 'lucide-react'

export const metadata: Metadata = {
  title: 'NHS Services',
  description: 'NHS services at Pharmacy Express with delivery, Pharmacy First, blood pressure checks, contraception and easy registration'
}

export default function NhsServicesPage() {
  return (
    <main className="min-h-screen">
      {/* hero */}
      <section className="relative">
        <div className="absolute inset-0 bg-gradient-to-b from-white-600/20 to-white pointer-events-none" />
        <div className="max-w-6xl mx-auto px-4 pt-10 pb-4 text-center">   {/* was pb-10 */}
            <h1 className="text-4xl md:text-5xl text-black-600 font-semibold tracking-tight">NHS Services</h1>
            <p className="mt-3 text-gray-600">
            Our NHS pharmacy in Wakefield supports you with convenient care and expert advice
            </p>
        </div><br/>
        <div className="max-w-5xl mx-auto px-4 pb-4">                     {/* was pb-10 */}
            <div className="relative rounded-3xl overflow-hidden shadow-sm ring-1 ring-gray-200">
            <Image
                src="/images/nhs-hero.jpg"
                alt="NHS prescription bag on a counter"
                width={1000}
                height={500}
                className="w-full h-[200px] md:h-[300px] object-cover"
                priority
            />
            </div>
        </div>
        </section><br/>

        <section className="max-w-4xl mx-auto px-4 pt-2 pb-6 text-center">   {/* was py-10 md:py-14 */}
        <Link
            href="/auth?from=nhs&next=/account"
            className="inline-flex items-center justify-center mt-3 px-8 py-5 rounded-full bg-emerald-600 text-white hover:bg-emerald-700 transition shadow-sm"  // was mt-6
        >
            Register now
        </Link>
        </section><br/><br/>


      {/* quick feature row */}
      <section className="max-w-6xl mx-auto px-4">
        <div className="grid gap-4 md:grid-cols-4">
          <Feature icon={<Stethoscope />} title="We are healthcare experts" text="Pharmacists here to diagnose and prescribe" />
          <Feature icon={<Clock />} title="Open 5 days a week" text="Monday to Friday 9AM to 6PM" />
          <Feature icon={<Star />} title="Highly rated" text="Countless five star reviews on Trustpilot" />
          <Feature icon={<Heart />} title="Here for our community" text="We care about our patients" />
        </div>
      </section>

      {/* services */}
      <ServiceSection
        id="free-delivery"
        title="Free prescription delivery"
        text="We deliver repeats to your door across Wakefield and the rest of the UK via Royal Mail. Order online from your phone or laptop using our simple service"
        img="/images/nhs-delivery.jpg"
        icon={<Truck />}
        flip={false}
      />

      <ServiceSection
        id="pharmacy-first"
        title="Pharmacy First"
        text="Avoid long waits and get treatment for common conditions such as ear infection sinusitis sore throat impetigo infected insect bites shingles and urinary tract infections in women. Our pharmacists can advise and prescribe where appropriate"
        img="/images/nhs-first.jpg"
        icon={<Stethoscope />}
        flip
      />

      <ServiceSection
        id="bp-checks"
        title="Blood pressure checks"
        text="Monitor your blood pressure as you age to reduce the risk of cardiovascular problems. Quick checks in store with friendly guidance"
        img="/images/nhs-bp.png"
        icon={<Stethoscope />}
        flip={false}
      />

      <ServiceSection
        id="contraception"
        title="Pharmacy contraceptive service"
        text="Accessible and convenient support for contraception. We ensure you have the information and resources you need"
        img="/images/nhs-contraception.png"
        icon={<Heart />}
        flip
      />

      {/* eligibility */}
      <section id="eligibility" className="max-w-4xl mx-auto px-4 pt-6 md:pt-10">
        <h2 className="text-3xl font-semibold text-center">Who is eligible to use these NHS services</h2>
        <div className="mt-4 space-y-4 text-gray-700 leading-relaxed">
          <p>
            Anyone living in the UK can register with an NHS pharmacy to access NHS services and prescriptions. There are no specific eligibility requirements
          </p>
          <p>
            Simply choose a pharmacy that offers NHS services and complete a quick registration. We provide NHS prescriptions expert advice and a range of health services
          </p>
        </div>
        <div className="mt-6 md:mt-10">
          <div className="relative rounded-3xl overflow-hidden shadow-sm ring-1 ring-gray-200">
            <Image
              src="/images/nhs-card.jpg"
              alt="NHS card and model torso used in health education"
              width={1400}
              height={900}
              className="w-full h-[300px] md:h-[420px] object-cover"
            />
          </div>
        </div>
      </section>

      {/* register cta */}
      <section className="max-w-4xl mx-auto px-4 py-10 md:py-14 text-center">
        <h3 className="text-3xl md:text-4xl font-semibold">
          Register with our NHS pharmacy in Wakefield
        </h3>
        <p className="mt-3 text-gray-600">
          Registration is free and only takes a moment. Click below and we will take care of your repeats
        </p>
        <Link
          href="/auth?from=nhs&next=/account"
          className="inline-flex items-center justify-center mt-6 px-6 py-3 rounded-full bg-emerald-600 text-white hover:bg-emerald-700 transition shadow-sm"
        >
          Register now
        </Link>
      </section>
    </main>
  )
}

/* components inside file for convenience */

function Feature({
  icon,
  title,
  text
}: {
  icon: React.ReactNode
  title: string
  text: string
}) {
  return (
    <div className="flex gap-3 items-start rounded-2xl bg-gray-50 p-4 ring-1 ring-gray-200">
      <div className="p-2 rounded-xl bg-white ring-1 ring-gray-200">{icon}</div>
      <div>
        <div className="font-medium">{title}</div>
        <div className="text-sm text-gray-600">{text}</div>
      </div>
    </div>
  )
}

function ServiceSection({
  id,
  title,
  text,
  img,
  icon,
  flip
}: {
  id: string
  title: string
  text: string
  img: string
  icon: React.ReactNode
  flip?: boolean
}) {
  return (
    <section id={id} className="max-w-6xl mx-auto px-4 pt-10 md:pt-14">
      <div className={`grid md:grid-cols-2 gap-8 items-center ${flip ? 'md:[&>div:first-child]:order-2' : ''}`}>
        <div className="relative rounded-3xl overflow-hidden shadow-sm ring-1 ring-gray-200">
          <Image
            src={img}
            alt={title}
            width={1200}
            height={900}
            className="w-full h-[260px] md:h-[360px] object-cover"
          />
        </div>
        <div>
          <div className="inline-flex items-center gap-2 text-emerald-700">
            <span className="p-2 rounded-xl bg-emerald-50 ring-1 ring-emerald-100">{icon}</span>
            <span className="text-sm font-medium">NHS service</span>
          </div>
          <h2 className="mt-2 text-3xl font-semibold">{title}</h2>
          <p className="mt-3 text-gray-700 leading-relaxed">{text}</p>
        </div>
      </div>
    </section>
  )
}
