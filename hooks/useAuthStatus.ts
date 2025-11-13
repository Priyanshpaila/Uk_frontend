import { useState, useEffect } from "react"

const apiBase =
  (process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_BASE ||
    "")
    .replace(/\/$/, "");

function useAuthStatus(trigger: unknown) {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const token =
          typeof window !== "undefined" ? localStorage.getItem("token") : null

        const res = await fetch(`${apiBase}/users/me`, {
          headers: {
            Accept: "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          cache: "no-store",
        })

        if (!cancelled) setLoggedIn(res.ok)
      } catch {
        if (!cancelled) setLoggedIn(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [trigger])

  return loggedIn
}

export default useAuthStatus
