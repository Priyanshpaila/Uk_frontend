// lib/auth.ts
// Read a bearer token from localStorage if you are using client-side auth.
// If your API reads an httpOnly cookie instead, this will simply return null on the client.
export function readAuthFromStorage(): { token: string | null } {
  try {
    const token = localStorage.getItem('auth_token') || null
    return { token }
  } catch {
    return { token: null }
  }
}

// lib/urls.ts
// Build an API URL. If NEXT_PUBLIC_API_URL is defined, prefix paths with it; otherwise use same-origin paths.
const API_BASE =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL) ||
  ''

export function buildApiUrl(path: string) {
  if (!path.startsWith('/')) path = '/' + path
  if (!API_BASE) return path
  return API_BASE.replace(/\/$/, '') + path
}