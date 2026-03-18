import type { ReactNode } from 'react'
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'

interface WishlistContextValue {
  followedCampaignIds: string[]
  isFollowed: (campaignId: string) => boolean
  toggleFollow: (campaignId: string) => void
}

const GUEST_WISHLIST_KEY = 'pedulichain.wishlist.guest.v1'

const WishlistContext = createContext<WishlistContextValue | null>(null)

const readWishlist = (storageKey: string) => {
  if (typeof window === 'undefined') {
    return []
  }

  const raw = window.localStorage.getItem(storageKey)
  if (!raw) {
    return []
  }

  try {
    const parsed = JSON.parse(raw) as string[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const storageKey = user?.email ? `pedulichain.wishlist.${user.email}` : GUEST_WISHLIST_KEY
  const [followedCampaignIds, setFollowedCampaignIds] = useState<string[]>(() => readWishlist(storageKey))

  useEffect(() => {
    setFollowedCampaignIds(readWishlist(storageKey))
  }, [storageKey])

  const value = useMemo<WishlistContextValue>(() => ({
    followedCampaignIds,
    isFollowed: (campaignId) => followedCampaignIds.includes(campaignId),
    toggleFollow: (campaignId) => {
      setFollowedCampaignIds((current) => {
        const next = current.includes(campaignId)
          ? current.filter((item) => item !== campaignId)
          : [campaignId, ...current]

        if (typeof window !== 'undefined') {
          window.localStorage.setItem(storageKey, JSON.stringify(next))
        }

        return next
      })
    }
  }), [followedCampaignIds, storageKey])

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  )
}

export const useWishlist = () => {
  const context = useContext(WishlistContext)

  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider')
  }

  return context
}
