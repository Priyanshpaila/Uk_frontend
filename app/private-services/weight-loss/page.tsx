'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

type Item = {
  id: string
  title: string
  body: string
  ctaLabel: string
  href: string
}

const items: Item[] = [
  {
    id: 'new',
    title: 'New patients',
    body:
      'Start a quick safety check then give us your details. We will review and guide the next step for you.',
    ctaLabel: 'Start now',
    href: '/private-services/weight-loss/treatments?type=new',
  },
  {
    id: 'transfer',
    title: 'Transfer patients',
    body:
      'Already on treatment elsewhere. Share your current plan and we will help you transfer safely.',
    ctaLabel: 'Start Now',
    href: '/private-services/weight-loss/treatments?type=transfer',
  },
  {
    id: 'existing',
    title: 'Existing patients',
    body: 'Log in to view your plan reorder or message the team.',
    ctaLabel: 'Login / Rorder',
    href: '/private-services/weight-loss/treatments/reorder',
  },
  {
    id: 'book',
    title: 'Book a consultation',
    body:
      'Prefer a scheduled slot. Pick a time and complete the form for our clinician.',
    ctaLabel: 'Book now',
    href: '/private-services/weight-loss/booking',
  },
]

function Row({
  item,
  openId,
  setOpenId,
}: {
  item: Item
  openId: string | null
  setOpenId: (id: string | null) => void
}) {
  const isOpen = openId === item.id

  const innerRef = useRef<HTMLDivElement>(null)
  const [panelH, setPanelH] = useState(0)

  const router = useRouter()
  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    try {
      // Prefer a real auth check so a stale token doesn't count as logged in
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      let loggedIn = false

      if (token) {
        try {
          const resp = await fetch('http://192.168.13.75:8000/api/users/me', {
            headers: {
              Accept: 'application/json',
              Authorization: `Bearer ${token}`,
            },
            method: 'GET',
          })
          loggedIn = resp.ok
        } catch {
          // network error — fall back to cookie
          loggedIn = typeof document !== 'undefined' && /(?:^|; )logged_in=1(?:;|$)/.test(document.cookie)
        }
      } else {
        // no token — fall back to cookie
        loggedIn = typeof document !== 'undefined' && /(?:^|; )logged_in=1(?:;|$)/.test(document.cookie)
      }

      if (item.id === 'existing') {
        if (loggedIn) {
          router.push('/private-services/weight-loss/reorder')
        } else {
          router.push('/auth?type=existing')
        }
      } else {
        router.push(item.href)
      }
    } catch {
      router.push(item.href)
    }
  }

  useEffect(() => {
    const el = innerRef.current
    if (!el) return
    const measure = () => setPanelH(isOpen ? el.scrollHeight : 0)
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [isOpen])

  return (
    <div className="bg-black text-white rounded-none overflow-hidden">
      <button
        type="button"
        onClick={() => setOpenId(isOpen ? null : item.id)}
        aria-expanded={isOpen}
        aria-controls={`panel-${item.id}`}
        className="w-full px-6 py-5 flex items-center justify-between select-none"
      >
        <span className="text-lg md:text-xl font-semibold">{item.title}</span>
        <span className="relative inline-flex h-6 w-6 items-center justify-center" aria-hidden="true">
          <span className="absolute h-0.5 w-4 bg-white transition-transform" />
          <span className={`absolute h-4 w-0.5 bg-white transition-transform ${isOpen ? 'scale-y-0' : 'scale-y-100'}`} />
        </span>
      </button>

      <div
        id={`panel-${item.id}`}
        style={{ height: panelH, transition: 'height 300ms ease-out, opacity 300ms ease-out' }}
        className={(isOpen ? 'opacity-100' : 'opacity-0') + ' overflow-hidden'}
        aria-hidden={!isOpen}
      > 
        <div ref={innerRef} className="px-6 pb-6 leading-7">
          <p className="text-sm text-gray-200 mb-4">{item.body}</p>
          <a
            href={item.href}
            onClick={handleClick}
            className="inline-flex items-center justify-center bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-none font-medium"
          >
            {item.ctaLabel}
          </a>
        </div>
      </div>
    </div>
  )
}

function TopSteps() {
  const [openId, setOpenId] = useState<string | null>(null)
  return (
    <section className="w-full">
      <div className="mx-auto max-w-6xl px-4 md:px-6 py-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 items-start">
          <div className="md:col-span-6">
            <h1 className="text-4xl font-semibold leading-tight text-gray-900">
              What do the next steps look like for your weight loss journey
            </h1>
            <p className="mt-4 text-gray-600">
              Before you begin please choose the right path. This helps us gather the information we need to review your case quickly and safely.
            </p>
            <div className="mt-8 space-y-4">
              {items.map((it) => (
                <Row key={it.id} item={it} openId={openId} setOpenId={setOpenId} />
              ))}
            </div>
          </div>

          <div className="md:col-span-6">
            <div className="relative h-[460px] md:h-[550px] w-full overflow-hidden shadow-sm rounded-none">
              <Image
                src="/weight-journey.jpg"
                alt="Happy group on a weight health journey"
                fill
                className="object-cover"
                priority
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function HowItWorks() {
  return (
    <div className="max-w-4xl mx-auto px-4 mb-12">
      <h2 className="text-2xl font-bold text-center mb-6">How our weight loss service works</h2>

      <div className="bg-emerald-500 text-white p-6 rounded-none mb-6">
        <h3 className="text-xl font-semibold mb-3">How to order</h3>
        <ol className="list-decimal pl-6 space-y-1">
          <li>Complete online consultation</li>
          <li>Our prescribing pharmacists approve</li>
          <li>Free delivery to your door via Royal Mail tracked twenty four hours</li>
        </ol>
      </div>

      <div className="bg-emerald-500 text-white p-6 rounded-none mb-6">
        <h3 className="text-xl font-semibold mb-3">Personalised weight loss plan</h3>
        <p>
          Based on your consultation we will develop a personalised plan with NHS dietary recommendations
          physical activity guidance and behavioural strategies to help you achieve sustainable results
        </p>
      </div>

      <div className="bg-emerald-500 text-white p-6 rounded-none mb-0">
        <h3 className="text-xl font-semibold mb-3">Maintenance plans</h3>
        <p>
          Flexible plans designed to fit your lifestyle. We recommend a follow up every three to six months to
          track progress and make adjustments with expert support
        </p>
      </div>
    </div>
  )
}

export default function BookPage() {
  return (
    <div className="bg-gray-50">
      <TopSteps />

      <div className="max-w-3xl mx-auto bg-white shadow-md rounded-none p-8 mb-12 text-center">
        <h2 className="text-2xl font-bold mb-3">Switching from Mounjaro to Wegovy</h2>
        <p className="text-gray-600 mb-6">
          Learn more about the transition process guidance and considerations when switching from Mounjaro to Wegovy
        </p>
        <div className="flex justify-center gap-4">
          <a href="#" className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-none">
            Read Full Guide
          </a>
          <a href="#" className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-6 py-2 rounded-none">
            Patient Brochure PDF
          </a>
        </div>
      </div>

      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-6 text-center mb-12 px-4">
        <div className="p-4 bg-white rounded-none shadow">
          <p className="font-semibold">We are healthcare experts</p>
          <p className="text-gray-600 text-sm">Our pharmacists are here to diagnose and prescribe</p>
        </div>
        <div className="p-4 bg-white rounded-none shadow">
          <p className="font-semibold">We are open five days a week</p>
          <p className="text-gray-600 text-sm">From nine to six Monday to Friday</p>
        </div>
        <div className="p-4 bg-white rounded-none shadow">
          <p className="font-semibold">We are highly rated</p>
          <p className="text-gray-600 text-sm">Many five star reviews on Trustpilot</p>
        </div>
        <div className="p-4 bg-white rounded-none shadow">
          <p className="font-semibold">Here for our community</p>
          <p className="text-gray-600 text-sm">We care about our patients</p>
        </div>
      </div>

      {/* added section */}
      <HowItWorks />

      <div className="max-w-6xl mx-auto px-4 mb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
            <iframe
              className="absolute top-0 left-0 w-full h-full rounded-none"
              src="https://www.youtube.com/embed/vPYe04kjMdA?rel=0&modestbranding=1&playsinline=1"
              title="YouTube video 1"
              frameBorder={0}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
          <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
            <iframe
              className="absolute top-0 left-0 w-full h-full rounded-none"
              src="https://www.youtube.com/embed/BPUqAJzaFAs?rel=0&modestbranding=1&playsinline=1"
              title="YouTube video 2"
              frameBorder={0}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      </div>

      <div className="text-center pb-12">
        <Link href="/" className="text-emerald-600 hover:underline">
          ← Back to home
        </Link>
      </div>
    </div>
  )
}
