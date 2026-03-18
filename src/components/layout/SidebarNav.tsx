import { Link, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAccount } from 'wagmi'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useWishlist } from '@/contexts/WishlistContext'
import { useMockWallet } from '@/contexts/MockWalletContext'
import { getTrackedCampaigns } from '@/lib/campaigns'
import { IS_MOCK_BACKEND } from '@/lib/web3'
import { FolderHeart, Heart, Home, LayoutDashboard, Plus } from 'lucide-react'

const navItems = [
  { path: '/', label: 'Homepage', icon: Home },
  { path: '/create', label: 'Create Campaign', icon: Plus },
  { path: '/my-campaigns', label: 'My Campaigns', icon: FolderHeart },
  { path: '/wishlist', label: 'Wishlist', icon: Heart },
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }
]

export default function SidebarNav({ mobile = false }: { mobile?: boolean }) {
  const location = useLocation()
  const { followedCampaignIds } = useWishlist()
  const { address } = useAccount()
  const { wallet } = useMockWallet()
  const currentAddress = (wallet?.address ?? address)?.toLowerCase() ?? ''
  const { data: trackedCampaigns = [] } = useQuery({
    queryKey: ['tracked-campaigns'],
    queryFn: getTrackedCampaigns
  })
  const createdCampaignCount = currentAddress
    ? trackedCampaigns.filter((campaign) => campaign.coordinator.toLowerCase() === currentAddress).length
    : 0

  return (
    <div className={cn('space-y-2', mobile && 'flex gap-2 overflow-x-auto space-y-0 pb-1')}>
      {navItems.map((item) => {
        const Icon = item.icon
        const isActive = location.pathname === item.path

        return (
          <Link key={item.path} to={item.path} className={cn(mobile && 'shrink-0')}>
            <Button
              variant={isActive ? 'secondary' : 'ghost'}
              className={cn(
                'w-full justify-start gap-3 rounded-xl px-4 py-6 text-sm',
                mobile && 'py-3',
                isActive && 'shadow-charity'
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
              {item.path === '/wishlist' && (
                <Badge variant="outline" className="ml-auto">
                  {followedCampaignIds.length}
                </Badge>
              )}
              {item.path === '/my-campaigns' && (
                <Badge variant="outline" className="ml-auto">
                  {createdCampaignCount}
                </Badge>
              )}
            </Button>
          </Link>
        )
      })}
    </div>
  )
}
