import { useDeferredValue, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import Globe from '@/components/3d/Globe'
import CampaignCard from '@/components/campaign/CampaignCard'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ArrowDown, Compass, DollarSign, Heart, Plus, TrendingUp, Users } from 'lucide-react'
import { getTrackedCampaigns } from '@/lib/campaigns'
import { DEMO_CAMPAIGNS } from '@/lib/demoCampaigns'
import { formatEther, IS_MOCK_BACKEND } from '@/lib/web3'
import { useAuth } from '@/contexts/AuthContext'
import { useMockWallet } from '@/contexts/MockWalletContext'
import { useWishlist } from '@/contexts/WishlistContext'

type SortOption = 'trending' | 'ending-soon' | 'goal-high' | 'progress'
type StatusFilter = 'all' | 'active' | 'ending-soon' | 'funded' | 'expired'

export default function Dashboard() {
  const navigate = useNavigate()
  const exploreSectionRef = useRef<HTMLElement | null>(null)
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const { isAuthenticated, openAuthDialog } = useAuth()
  const { wallet, openWalletDialog } = useMockWallet()
  const { followedCampaignIds } = useWishlist()
  const { data: trackedCampaigns = [] } = useQuery({
    queryKey: ['tracked-campaigns'],
    queryFn: getTrackedCampaigns
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>('all')
  const [sortBy, setSortBy] = useState<SortOption>('trending')
  const deferredSearchQuery = useDeferredValue(searchQuery)
  const campaigns = IS_MOCK_BACKEND ? trackedCampaigns : [...trackedCampaigns, ...DEMO_CAMPAIGNS]

  const totalRaised = campaigns.reduce((sum, campaign) => sum + campaign.raised, 0n)
  const totalDonors = campaigns.reduce((sum, campaign) => sum + campaign.donorCount, 0)
  const categories = ['All', ...new Set(campaigns.map((campaign) => campaign.category).filter(Boolean))]

  const stats = [
    { label: 'Active Campaigns', value: String(campaigns.length), icon: TrendingUp, change: trackedCampaigns.length ? 'Updated now' : '+12%' },
    { label: 'Total Donors', value: totalDonors.toLocaleString(), icon: Users, change: '+8%' },
    { label: 'Funds Raised', value: `${Number(formatEther(totalRaised)).toFixed(1)} ETH`, icon: DollarSign, change: trackedCampaigns.length ? 'Live activity' : '+23%' }
  ]

  const normalizedQuery = deferredSearchQuery.trim().toLowerCase()
  const visibleCampaigns = [...campaigns]
    .filter((campaign) => {
      if (!normalizedQuery) {
        return true
      }

      return [
        campaign.title,
        campaign.description,
        campaign.category,
        campaign.coordinator
      ]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalizedQuery))
    })
    .filter((campaign) => selectedCategory === 'All' || campaign.category === selectedCategory)
    .filter((campaign) => {
      const progress = Number(campaign.raised) / Number(campaign.goal) * 100
      const daysLeft = Math.max(0, Math.ceil((campaign.deadline * 1000 - Date.now()) / (1000 * 60 * 60 * 24)))
      const isExpired = daysLeft === 0 && progress < 100
      const isFunded = progress >= 100

      if (selectedStatus === 'all') {
        return true
      }

      if (selectedStatus === 'active') {
        return !isExpired && !isFunded
      }

      if (selectedStatus === 'ending-soon') {
        return !isExpired && !isFunded && daysLeft <= 7
      }

      if (selectedStatus === 'funded') {
        return isFunded
      }

      return isExpired
    })
    .sort((left, right) => {
      if (sortBy === 'ending-soon') {
        return left.deadline - right.deadline
      }

      if (sortBy === 'goal-high') {
        return Number(right.goal) - Number(left.goal)
      }

      if (sortBy === 'progress') {
        return Number(right.raised) / Number(right.goal) - Number(left.raised) / Number(left.goal)
      }

      return right.donorCount - left.donorCount
    })

  const handleExploreCampaigns = () => {
    exploreSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    window.setTimeout(() => searchInputRef.current?.focus(), 450)
  }

  const handleCampaignClick = (campaignId: string) => {
    navigate(`/campaign/${campaignId}`)
  }

  const handleCreateCampaign = () => {
    if (!isAuthenticated) {
      openAuthDialog()
      return
    }

    if (IS_MOCK_BACKEND && !wallet) {
      openWalletDialog()
      return
    }

    navigate('/create')
  }

  const handleDonate = (campaignId: string) => {
    navigate(`/campaign/${campaignId}`)
  }

  const handleViewDetails = (campaignId: string) => {
    navigate(`/campaign/${campaignId}`)
  }

  return (
    <>
      {/* Hero Section */}
      <section className="relative px-4 pb-8 pt-12 sm:px-6 lg:px-8 lg:pb-10 lg:pt-14">
        <div className="container mx-auto">
          <div className="mb-10 text-center">
            <h1 className="mb-4 text-5xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Transparent Charity on Blockchain
            </h1>
            <p className="mx-auto mb-6 max-w-2xl text-xl text-muted-foreground">
              Experience the future of charitable giving with complete transparency, 
              community voting, and immutable proof of impact.
            </p>
            <div className="flex gap-4 justify-center">
              <Button variant="charity" size="xl" onClick={handleCreateCampaign}>
                <Plus className="w-5 h-5 mr-2" />
                Create Campaign
              </Button>
              <Button variant="blockchain" size="xl" onClick={handleExploreCampaigns}>
                <Compass className="w-5 h-5 mr-2" />
                Explore Campaigns
              </Button>
              <Button variant="outline" size="xl" onClick={() => navigate('/wishlist')}>
                <Heart className="w-5 h-5 mr-2" />
                Wishlist ({followedCampaignIds.length})
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="mb-2 grid grid-cols-1 gap-6 md:grid-cols-3">
            {stats.map((stat) => {
              const Icon = stat.icon
              return (
                <div 
                  key={stat.label}
                  className="bg-card border border-border rounded-xl p-6 shadow-card-3d hover:shadow-blockchain transition-all duration-300"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-muted-foreground text-sm">{stat.label}</p>
                      <p className="text-3xl font-bold">{stat.value}</p>
                    </div>
                    <div className="bg-gradient-primary p-3 rounded-lg">
                      <Icon className="w-6 h-6 text-primary-foreground" />
                    </div>
                  </div>
                  <div className="mt-2">
                    <Badge variant="secondary" className="text-xs">
                      {stat.change} this month
                    </Badge>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Interactive Globe */}
      <section className="px-4 pb-12 pt-4 sm:px-6 lg:px-8 lg:pt-6">
        <div className="container mx-auto">
          <h2 className="mb-6 text-center text-3xl font-bold">
            Global Impact Map
          </h2>
          {trackedCampaigns.length > 0 && (
            <p className="mb-4 text-center text-sm text-muted-foreground">
              Campaigns you create from this workspace appear here automatically.
            </p>
          )}
          <Globe 
            campaigns={campaigns} 
            onCampaignClick={handleCampaignClick}
          />
        </div>
      </section>

      {/* Featured Campaigns */}
      <section ref={exploreSectionRef} className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto">
          <div className="flex flex-col items-center gap-3 text-center mb-8">
            <Badge variant="outline" className="gap-2 px-4 py-1.5">
              <Compass className="w-4 h-4" />
              Explore Campaigns
            </Badge>
            <h2 className="text-3xl font-bold">
              Discover Campaigns Worth Supporting
            </h2>
            <p className="text-muted-foreground max-w-2xl">
              Search by title, browse by category, or sort by momentum to quickly find the campaigns you want to back.
            </p>
          </div>
          {trackedCampaigns.length > 0 && (
            <div className="flex justify-center mb-6">
              <Badge variant="secondary">
                {trackedCampaigns.length} campaign(s) currently available
              </Badge>
            </div>
          )}
          <div className="rounded-2xl border border-border bg-card/80 backdrop-blur p-5 mb-8 shadow-card-3d">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(220px,1fr)_minmax(220px,1fr)]">
              <div className="space-y-2">
                <label htmlFor="campaign-search" className="text-sm font-medium">
                  Search
                </label>
                <Input
                  ref={searchInputRef}
                  id="campaign-search"
                  placeholder="Search by campaign name, description, category, or coordinator"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="campaign-sort" className="text-sm font-medium">
                  Sort by
                </label>
                <select
                  id="campaign-sort"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value as SortOption)}
                >
                  <option value="trending">Most donors</option>
                  <option value="ending-soon">Ending soon</option>
                  <option value="progress">Highest progress</option>
                  <option value="goal-high">Largest goal</option>
                </select>
              </div>
              <div className="flex items-end">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setSearchQuery('')
                    setSelectedCategory('All')
                    setSelectedStatus('all')
                    setSortBy('trending')
                  }}
                >
                  Reset Filters
                </Button>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                {(['all', 'active', 'ending-soon', 'funded', 'expired'] as StatusFilter[]).map((status) => (
                  <Button
                    key={status}
                    variant={selectedStatus === status ? 'secondary' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedStatus(status)}
                  >
                    {status === 'all' ? 'All status' : status === 'ending-soon' ? 'Ending soon' : status.charAt(0).toUpperCase() + status.slice(1)}
                  </Button>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {categories.map((category) => (
                  <Button
                    key={category}
                    variant={selectedCategory === category ? 'blockchain' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCategory(category)}
                  >
                    {category}
                  </Button>
                ))}
              </div>
              <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
                <span>
                  Showing {visibleCampaigns.length} of {campaigns.length} campaigns
                </span>
                <span className="flex items-center gap-1">
                  <ArrowDown className="w-4 h-4" />
                  Refine results with search and filters
                </span>
              </div>
            </div>
          </div>

          {visibleCampaigns.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card/40 p-10 text-center">
              <h3 className="text-xl font-semibold">No campaigns match these filters</h3>
              <p className="text-muted-foreground mt-2 mb-5">
                Try a broader keyword, switch category, or reset the filters to explore all available campaigns.
              </p>
              <Button
                variant="secondary"
                onClick={() => {
                  setSearchQuery('')
                  setSelectedCategory('All')
                  setSelectedStatus('all')
                  setSortBy('trending')
                }}
              >
                Show All Campaigns
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {visibleCampaigns.map((campaign) => (
              <CampaignCard
                key={campaign.id}
                {...campaign}
                onDonate={() => handleDonate(campaign.id)}
                onViewDetails={() => handleViewDetails(campaign.id)}
              />
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  )
}
