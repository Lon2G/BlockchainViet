import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import CampaignCard from '@/components/campaign/CampaignCard'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Heart, ArrowLeft } from 'lucide-react'
import { getTrackedCampaigns } from '@/lib/campaigns'
import { DEMO_CAMPAIGNS } from '@/lib/demoCampaigns'
import { IS_MOCK_BACKEND } from '@/lib/web3'
import { useWishlist } from '@/contexts/WishlistContext'

export default function Wishlist() {
  const navigate = useNavigate()
  const { followedCampaignIds } = useWishlist()
  const { data: trackedCampaigns = [] } = useQuery({
    queryKey: ['tracked-campaigns'],
    queryFn: getTrackedCampaigns
  })

  const campaigns = IS_MOCK_BACKEND ? trackedCampaigns : [...trackedCampaigns, ...DEMO_CAMPAIGNS]
  const followedCampaigns = campaigns.filter((campaign) => followedCampaignIds.includes(campaign.id))

  return (
      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => navigate('/dashboard')} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>

        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-3">
              <Badge variant="outline" className="gap-2 px-4 py-1.5">
                <Heart className="h-4 w-4" />
                Wishlist
              </Badge>
            </div>
            <h1 className="text-3xl font-bold">Campaigns You Follow</h1>
            <p className="mt-2 text-muted-foreground">
              A saved list of campaigns you follow so you can track their progress more easily.
            </p>
          </div>
          <Badge variant="secondary">{followedCampaigns.length} campaign(s)</Badge>
        </div>

        {followedCampaigns.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Your wishlist is empty</CardTitle>
              <CardDescription>
                Open any campaign and click `Follow` to add it to your watchlist.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="charity" onClick={() => navigate('/dashboard')}>
                Explore Campaigns
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {followedCampaigns.map((campaign) => (
              <CampaignCard
                key={campaign.id}
                {...campaign}
                onDonate={() => navigate(`/campaign/${campaign.id}`)}
                onViewDetails={() => navigate(`/campaign/${campaign.id}`)}
              />
            ))}
          </div>
        )}
      </div>
  )
}
