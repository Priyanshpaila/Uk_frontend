// components/auth/RequireAuth.tsx
'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const search = useSearchParams()

  const [ok, setOk] = useState(false)

  useEffect(() => {
    // Your app currently stores the token in localStorage
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    if (!token) {
      const qs = search?.toString()
      const returnTo = encodeURIComponent(`${pathname}${qs ? `?${qs}` : ''}`)
      router.replace(`/auth?returnTo=${returnTo}`)
      return
    }
    setOk(true)
  }, [router, pathname, search])

  if (!ok) {
    return <div className="p-8 text-gray-500">Checking your session…</div>
  }

  return <>{children}</>
}