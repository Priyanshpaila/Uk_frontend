"use client"

import { useState, useRef, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Search, ShoppingCart, MessageCircle, ChevronDown, LogOut, User, Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { useCart } from "@/components/cart-context"

// Lightweight client-side product index for suggestions
const PRODUCT_INDEX: Array<{ name: string; slug: string; aliases?: string[] }> = [
  { name: 'Mounjaro', slug: 'mounjaro', aliases: ['tirzepatide'] },
  { name: 'Wegovy', slug: 'wegovy', aliases: ['semaglutide'] },
  { name: 'Saxenda', slug: 'saxenda', aliases: ['liraglutide'] },
  { name: 'Mounjaro Maintenance Plans', slug: 'mounjaro-maintenance' },
  { name: 'Orlistat Xenical', slug: 'orlistat' },
  { name: 'Freestyle Libre 2 Plus', slug: 'libre' },
  { name: 'Alcohol Swabs', slug: 'alvita-swabs' },
  { name: 'Pen Needles', slug: 'pen-needles' },
  { name: 'Sharps Bin', slug: 'sharps' },
  { name: 'Valupak Multivitamins', slug: 'valupak-multivitamins' },
]

export function Header({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const [showMenu, setShowMenu] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const router = useRouter()
  const [query, setQuery] = useState("")

  const [showSug, setShowSug] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  const getFirst = (v?: string | string[]) => (Array.isArray(v) ? v[0] : v)
  const typeParam = getFirst(searchParams?.type)

  const qLower = query.trim().toLowerCase()
  const suggestions = useMemo(() => {
    if (!qLower) return [] as typeof PRODUCT_INDEX
    const starts = PRODUCT_INDEX.filter(p =>
      p.name.toLowerCase().startsWith(qLower) || (p.aliases || []).some(a => a.toLowerCase().startsWith(qLower))
    )
    const contains = PRODUCT_INDEX.filter(p =>
      !starts.includes(p) && (p.name.toLowerCase().includes(qLower) || (p.aliases || []).some(a => a.toLowerCase().includes(qLower)))
    )
    return [...starts, ...contains].slice(0, 8)
  }, [qLower])

  const goToProduct = (slug: string) => {
    const type = typeParam
    const url = type ? `/private-services/weight-loss/treatments/${slug}?type=${encodeURIComponent(type)}` : `/private-services/weight-loss/treatments/${slug}`
    setShowSug(false)
    setActiveIdx(-1)
    router.push(url)
  }

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const q = query.trim()
    if (!q) return
    // exact match by name or alias
    const exact = PRODUCT_INDEX.find(p => p.name.toLowerCase() === q.toLowerCase() || (p.aliases || []).some(a => a.toLowerCase() === q.toLowerCase()))
    if (exact) {
      goToProduct(exact.slug)
      return
    }
    // if we have a top suggestion, go there
    if (suggestions.length > 0) {
      goToProduct(suggestions[0].slug)
      return
    }
    // otherwise fall back to products search page
    const type = typeParam
    const url = type ? `/private-services/weight-loss/treatments?q=${encodeURIComponent(q)}&type=${encodeURIComponent(type)}` : `/private-services/weight-loss/treatments?q=${encodeURIComponent(q)}`
    router.push(url)
  }

  const { open: openCart, items } = useCart()
  const totalQty = items.reduce((n, i) => n + (i.qty || 0), 0)

  // auth state (token + user saved to localStorage by auth flow)
  const [authed, setAuthed] = useState(false)
  const [account, setAccount] = useState<any | null>(null)
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)

  const readAuthFromStorage = () => {
    try {
      const t = localStorage.getItem('token')
      const u = localStorage.getItem('user')
      setAuthed(!!t)
      setAccount(u ? JSON.parse(u) : null)
    } catch {}
  }

  useEffect(() => {
    readAuthFromStorage()
    const onAuthChanged = () => readAuthFromStorage()
    window.addEventListener('storage', readAuthFromStorage)
    window.addEventListener('pe-auth-changed', onAuthChanged as any)
    return () => {
      window.removeEventListener('storage', readAuthFromStorage)
      window.removeEventListener('pe-auth-changed', onAuthChanged as any)
    }
  }, [])

  const logout = () => {
    try {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    } catch {}
    setAuthed(false)
    setAccount(null)
    setAccountMenuOpen(false)
    router.push('/')
  }

  const goToAuth = () => {
    router.push('/auth?next=/account')
  }

  const initials = (name?: string) => {
    const n = (name || '').trim()
    if (!n) return 'ME'
    return n
      .split(/\s+/)
      .map((p) => p[0]?.toUpperCase() || '')
      .slice(0, 2)
      .join('') || 'ME'
  }

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setShowMenu(true)
  }

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setShowMenu(false), 200) // small delay
  }

  return (
    <header className="bg-white border-b" suppressHydrationWarning>
      <div className="container mx-auto px-4">
        {/* Top bar with logo and actions */}
        <div className="flex items-center justify-between py-4">
          <div className="flex items-center">
            <button
              className="md:hidden mr-2 p-2 rounded-md border border-gray-200"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5 text-gray-700" />
            </button>
            <Link href="/" aria-label="Pharmacy Express Home" className="block relative z-50">
              <img
                src="/pharmacy-express-logo.png"
                alt="Pharmacy Express"
                className="h-12 w-auto cursor-pointer"
                suppressHydrationWarning
              />
            </Link>
          </div>

          <div className="hidden md:block flex-1 max-w-md mx-8">
            <form
              className="relative"
              onSubmit={onSearchSubmit}
              role="search"
              aria-label="Product search"
              onFocus={() => setShowSug(true)}
              onBlur={(e) => {
                // Delay to allow click on suggestions
                setTimeout(() => setShowSug(false), 120)
              }}
            >
              <Input
                placeholder="Search for treatments e.g. Mounjaro Wegovy"
                className="pr-10"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setShowSug(true)
                  setActiveIdx(-1)
                }}
                onKeyDown={(e) => {
                  if (!showSug || suggestions.length === 0) return
                  if (e.key === 'ArrowDown') {
                    e.preventDefault()
                    setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1))
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault()
                    setActiveIdx((i) => Math.max(i - 1, 0))
                  } else if (e.key === 'Enter') {
                    if (activeIdx >= 0 && activeIdx < suggestions.length) {
                      e.preventDefault()
                      goToProduct(suggestions[activeIdx].slug)
                    }
                  }
                }}
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1"
                aria-label="Search"
              >
                <Search className="text-gray-400 w-4 h-4" />
              </button>

              {showSug && suggestions.length > 0 && (
                <ul className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg overflow-hidden">
                  {suggestions.map((s, i) => (
                    <li key={s.slug}>
                      <button
                        type="button"
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${i === activeIdx ? 'bg-gray-50' : ''}`}
                        onMouseEnter={() => setActiveIdx(i)}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => goToProduct(s.slug)}
                      >
                        {s.name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </form>
          </div>

          <div className="flex items-center space-x-4 relative">
            <button
              onClick={openCart}
              aria-label="Open cart"
              className="relative rounded-md p-2 hover:bg-gray-100"
            >
              <ShoppingCart className="w-6 h-6 text-gray-600" />
              {mounted && totalQty > 0 && (
                <span
                  className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-emerald-600 text-white text-[10px] leading-[18px] text-center font-semibold"
                >
                  {totalQty}
                </span>
              )}
            </button>

            {!authed ? (
              <Button
                onClick={goToAuth}
                style={{ backgroundColor: '#00d1b2' }}
                className="hover:bg-white-600 text-black font-semibold"
              >
                Log in
              </Button>
            ) : (
              <div className="relative">
                <button
                  onClick={() => setAccountMenuOpen((v) => !v)}
                  className="flex items-center gap-2 px-3 py-2 rounded-md border border-gray-200 hover:bg-gray-50"
                >
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-700 text-sm font-semibold">
                    {initials(
                      (account?.name as string) ||
                        `${account?.first_name || ''} ${account?.last_name || ''}`
                    )}
                  </span>
                  <ChevronDown className="w-4 h-4" />
                </button>

                {accountMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white border rounded-md shadow-lg z-50">
                    <a
                      href="/account"
                      className="block px-4 py-2 hover:bg-gray-50 text-sm"
                      onClick={() => setAccountMenuOpen(false)}
                    >
                      Profile
                    </a>
                    <button
                      onClick={logout}
                      className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm flex items-center gap-2"
                    >
                      <LogOut className="w-4 h-4" /> Logout
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="pb-4 hidden md:block">
          <ul className="flex justify-center space-x-8 text-gray-800 font-medium">
            <li>
              <a href="/nhs-services" className="hover:text-gray-600">
                NHS Services
              </a>
            </li>

            {/* Private Services with hover menu */}
            <li
              className="relative"
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              <button className="flex items-center hover:text-gray-600">
                Private Services <ChevronDown className="w-4 h-4 ml-1" />
              </button>

              {showMenu && (
                <div className="absolute left-0 mt-2 w-[1000px] bg-white border shadow-lg rounded-lg p-8 grid grid-cols-4 gap-8 z-50">
                  {/* Digestive Health */}
                  <div>
                    <h4 className="font-semibold text-gray-900 border-b pb-1 mb-2">
                      Digestive Health
                    </h4>
                    <ul className="space-y-1 text-sm">
                      <li>
                        <a href="#" className="hover:underline">
                          Acid Reflux
                        </a>
                      </li>
                    </ul>
                  </div>

                  {/* Skin & Nails */}
                  <div>
                    <h4 className="font-semibold text-gray-900 border-b pb-1 mb-2">
                      Skin & Nails
                    </h4>
                    <ul className="space-y-1 text-sm">
                      <li>
                        <a href="#" className="hover:underline">
                          Acne
                        </a>
                      </li>
                      <li>
                        <a href="#" className="hover:underline">
                          Hives
                        </a>
                      </li>
                    </ul>
                  </div>

                  {/* Vaccinations */}
                  <div>
                    <h4 className="font-semibold text-gray-900 border-b pb-1 mb-2">
                      Vaccinations
                    </h4>
                    <ul className="space-y-1 text-sm">
                      <li><a href="#" className="hover:underline">Altitude Sickness</a></li>
                      <li><a href="#" className="hover:underline">Anti Malaria</a></li>
                      <li><a href="#" className="hover:underline">Chickenpox Vaccine</a></li>
                      <li><a href="#" className="hover:underline">Hajj and Umrah Vaccine</a></li>
                      <li><a href="#" className="hover:underline">HPV Vaccine</a></li>
                      <li><a href="#" className="hover:underline">Pertussis Vaccine</a></li>
                      <li><a href="#" className="hover:underline">Private Covid Vaccination</a></li>
                      <li><a href="#" className="hover:underline">Private Flu</a></li>
                      <li><a href="#" className="hover:underline">Respiratory Syncytial Virus</a></li>
                      <li><a href="#" className="hover:underline">Shingles Vaccine</a></li>
                      <li><a href="#" className="hover:underline">Travel Vaccination</a></li>
                      <li><a href="#" className="hover:underline">Vitamin B12 Injection</a></li>
                    </ul>
                  </div>

                  {/* Other Services */}
                  <div>
                    <h4 className="font-semibold text-gray-900 border-b pb-1 mb-2">
                      Other Services
                    </h4>
                    <ul className="space-y-1 text-sm">
                      <li><a href="#" className="hover:underline">Back Pain</a></li>
                      <li><a href="#" className="hover:underline">Erectile Dysfunction</a></li>
                      <li><a href="#" className="hover:underline">Weight Management</a></li>
                    </ul>
                  </div>
                </div>
              )}
            </li>

            <li>
              <a
                href="https://api.whatsapp.com/message/S3W272ZN4QM7O1?autoload=1&app_absent=0"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-gray-600 flex items-center space-x-1"
              >
                <MessageCircle className="w-4 h-4" />
                <span>WhatsApp</span>
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-gray-600">
                Help & Support
              </a>
            </li>
          </ul>
        </nav>
        {/* Mobile menu overlay */}
        {mobileOpen && (
          <div className="fixed inset-0 z-[70]">
            <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
            <div className="absolute left-0 top-0 h-full w-[90%] max-w-sm bg-white shadow-xl overflow-y-auto">
              <div className="flex items-center justify-between p-4 border-b">
                <span className="flex items-center">
                  <img src="/pharmacy-express-logo.png" alt="Pharmacy Express" className="h-8 w-auto" />
                </span>
                <button aria-label="Close menu" onClick={() => setMobileOpen(false)} className="p-2 rounded-md border border-gray-200">
                  <X className="w-5 h-5 text-gray-700" />
                </button>
              </div>

              <div className="p-4 space-y-6">
                {/* Mobile search */}
                <form
                  className="relative"
                  onSubmit={(e) => { onSearchSubmit(e); setMobileOpen(false); }}
                  role="search"
                  aria-label="Product search mobile"
                  onFocus={() => setShowSug(true)}
                  onBlur={() => setTimeout(() => setShowSug(false), 120)}
                >
                  <Input
                    placeholder="Search for treatments e.g. Mounjaro Wegovy"
                    className="pr-10"
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value)
                      setShowSug(true)
                      setActiveIdx(-1)
                    }}
                    onKeyDown={(e) => {
                      if (!showSug || suggestions.length === 0) return
                      if (e.key === 'ArrowDown') {
                        e.preventDefault()
                        setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1))
                      } else if (e.key === 'ArrowUp') {
                        e.preventDefault()
                        setActiveIdx((i) => Math.max(i - 1, 0))
                      } else if (e.key === 'Enter') {
                        if (activeIdx >= 0 && activeIdx < suggestions.length) {
                          e.preventDefault()
                          goToProduct(suggestions[activeIdx].slug)
                          setMobileOpen(false)
                        }
                      }
                    }}
                  />
                  <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 p-1" aria-label="Search">
                    <Search className="text-gray-400 w-4 h-4" />
                  </button>

                  {showSug && suggestions.length > 0 && (
                    <ul className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg overflow-hidden">
                      {suggestions.map((s, i) => (
                        <li key={s.slug}>
                          <button
                            type="button"
                            className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${i === activeIdx ? 'bg-gray-50' : ''}`}
                            onMouseEnter={() => setActiveIdx(i)}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => { goToProduct(s.slug); setMobileOpen(false) }}
                          >
                            {s.name}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </form>

                {/* Mobile nav links */}
                <nav className="space-y-6">
                  <a href="/nhs-services" className="block text-gray-900 font-medium">NHS Services</a>

                  <div>
                    <h4 className="text-gray-900 font-semibold mb-2">Private Services</h4>
                    <div className="space-y-4 text-sm">
                      <div>
                        <h5 className="text-gray-800 font-medium mb-1">Digestive Health</h5>
                        <ul className="space-y-1">
                          <li><a href="#" className="text-gray-700 hover:underline" onClick={() => setMobileOpen(false)}>Acid Reflux</a></li>
                        </ul>
                      </div>
                      <div>
                        <h5 className="text-gray-800 font-medium mb-1">Skin & Nails</h5>
                        <ul className="space-y-1">
                          <li><a href="#" className="text-gray-700 hover:underline" onClick={() => setMobileOpen(false)}>Acne</a></li>
                          <li><a href="#" className="text-gray-700 hover:underline" onClick={() => setMobileOpen(false)}>Hives</a></li>
                        </ul>
                      </div>
                      <div>
                        <h5 className="text-gray-800 font-medium mb-1">Vaccinations</h5>
                        <ul className="space-y-1">
                          <li><a href="#" className="text-gray-700 hover:underline" onClick={() => setMobileOpen(false)}>Altitude Sickness</a></li>
                          <li><a href="#" className="text-gray-700 hover:underline" onClick={() => setMobileOpen(false)}>Anti Malaria</a></li>
                          <li><a href="#" className="text-gray-700 hover:underline" onClick={() => setMobileOpen(false)}>Chickenpox Vaccine</a></li>
                          <li><a href="#" className="text-gray-700 hover:underline" onClick={() => setMobileOpen(false)}>Hajj and Umrah Vaccine</a></li>
                          <li><a href="#" className="text-gray-700 hover:underline" onClick={() => setMobileOpen(false)}>HPV Vaccine</a></li>
                          <li><a href="#" className="text-gray-700 hover:underline" onClick={() => setMobileOpen(false)}>Pertussis Vaccine</a></li>
                          <li><a href="#" className="text-gray-700 hover:underline" onClick={() => setMobileOpen(false)}>Private Covid Vaccination</a></li>
                          <li><a href="#" className="text-gray-700 hover:underline" onClick={() => setMobileOpen(false)}>Private Flu</a></li>
                          <li><a href="#" className="text-gray-700 hover:underline" onClick={() => setMobileOpen(false)}>Respiratory Syncytial Virus</a></li>
                          <li><a href="#" className="text-gray-700 hover:underline" onClick={() => setMobileOpen(false)}>Shingles Vaccine</a></li>
                          <li><a href="#" className="text-gray-700 hover:underline" onClick={() => setMobileOpen(false)}>Travel Vaccination</a></li>
                          <li><a href="#" className="text-gray-700 hover:underline" onClick={() => setMobileOpen(false)}>Vitamin B12 Injection</a></li>
                        </ul>
                      </div>
                      <div>
                        <h5 className="text-gray-800 font-medium mb-1">Other Services</h5>
                        <ul className="space-y-1">
                          <li><a href="#" className="text-gray-700 hover:underline" onClick={() => setMobileOpen(false)}>Back Pain</a></li>
                          <li><a href="#" className="text-gray-700 hover:underline" onClick={() => setMobileOpen(false)}>Erectile Dysfunction</a></li>
                          <li><a href="/private-services/weight-loss" className="text-gray-700 hover:underline" onClick={() => setMobileOpen(false)}>Weight Management</a></li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <a
                    href="https://api.whatsapp.com/message/S3W272ZN4QM7O1?autoload=1&app_absent=0"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-gray-900 font-medium"
                    onClick={() => setMobileOpen(false)}
                  >
                    WhatsApp
                  </a>
                  <a href="#" className="block text-gray-900 font-medium" onClick={() => setMobileOpen(false)}>
                    Help & Support
                  </a>

                  <div className="pt-2 border-t space-y-3">
                    {!authed ? (
                      <Button
                        onClick={() => { goToAuth(); setMobileOpen(false) }}
                        style={{ backgroundColor: '#00d1b2' }}
                        className="w-full hover:bg-white-600 text-black font-semibold"
                      >
                        Log in / Register
                      </Button>
                    ) : (
                      <>
                        <a href="/account" className="block text-gray-900" onClick={() => setMobileOpen(false)}>My Account</a>
                        <button onClick={() => { logout(); setMobileOpen(false) }} className="text-left text-gray-900">Logout</button>
                      </>
                    )}
                  </div>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
