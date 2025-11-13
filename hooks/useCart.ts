// hooks/useCart.ts
'use client'
import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  apiGetCart,
  apiAddItem,
  apiRemoveItem,
  apiClearCart,
  guestAddItem,
  guestGetCart,
  mergeGuestIntoAccount,
} from '@/lib/cart'
import { readAuthFromStorage } from '@/lib/auth'

export function useCart() {
  const qc = useQueryClient()
  const { token } = readAuthFromStorage()

  const cartQuery = useQuery({
    queryKey: ['cart', Boolean(token)],
    queryFn: async () => {
      if (token) return apiGetCart()
      return { items: guestGetCart() }
    },
    staleTime: 0,
  })

  const addItem = useMutation({
    mutationFn: async (payload: any) => {
      if (token) return apiAddItem(payload)
      guestAddItem(payload)
      return { ok: true }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cart'] }),
  })

  const removeItem = useMutation({
    mutationFn: async (idOrSku: string) => {
      if (token) return apiRemoveItem(idOrSku)
      // guest remove by sku
      const items = guestGetCart().filter(i => i.sku !== idOrSku)
      localStorage.setItem('guest_cart_v1', JSON.stringify(items))
      return { ok: true }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cart'] }),
  })

  const clear = useMutation({
    mutationFn: async () => {
      if (token) return apiClearCart()
      localStorage.removeItem('guest_cart_v1')
      return { ok: true }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cart'] }),
  })

  useEffect(() => {
    if (!token) return
    mergeGuestIntoAccount().then(() => {
      qc.invalidateQueries({ queryKey: ['cart'] })
    })
  }, [token, qc])

  return {
    cart: cartQuery.data?.items || [],
    isLoading: cartQuery.isLoading,
    addItem: addItem.mutateAsync,
    removeItem: removeItem.mutateAsync,
    clear: clear.mutateAsync,
  }
}