import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAccount } from 'wagmi'
import CampaignCard from '@/components/campaign/CampaignCard'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FolderHeart, ArrowLeft, Wallet } from 'lucide-react'
import { getTrackedCampaigns } from '@/lib/campaigns'
import { useMockWallet } from '@/contexts/MockWalletContext'
import { useAuth } from '@/contexts/AuthContext'
import { IS_MOCK_BACKEND } from '@/lib/web3'

export default function MyCampaigns() {
  const navigate = useNavigate()
  const { isAuthenticated, openAuthDialog } = useAuth()
  const { address } = useAccount()
  const { wallet, openWalletDialog } = useMockWallet()
  const currentAddress = (wallet?.address ?? address)?.toLowerCase() ?? ''
  const { data: trackedCampaigns = [] } = useQuery({
    queryKey: ['tracked-campaigns'],
    queryFn: getTrackedCampaigns
  })

  const myCampaigns = currentAddress
    ? trackedCampaigns.filter((campaign) => campaign.coordinator.toLowerCase() === currentAddress)
    : []

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
              <FolderHeart className="h-4 w-4" />
              My Campaigns
            </Badge>
          </div>
          <h1 className="text-3xl font-bold">Campaigns You Created</h1>
          <p className="mt-2 text-muted-foreground">
            A dedicated list of campaigns created from your current wallet.
          </p>
        </div>
        <Badge variant="secondary">{myCampaigns.length} campaign(s)</Badge>
      </div>

      {!isAuthenticated ? (
        <Card>
          <CardHeader>
            <CardTitle>Sign in to view your campaigns</CardTitle>
            <CardDescription>
              Your created campaigns are linked to the account and wallet you use in this workspace.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="charity" onClick={openAuthDialog}>
              Sign In
            </Button>
          </CardContent>
        </Card>
      ) : !currentAddress ? (
        <Card>
          <CardHeader>
            <CardTitle>Connect your wallet</CardTitle>
            <CardDescription>
              We use the connected wallet address to find campaigns you created.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {IS_MOCK_BACKEND ? (
              <Button variant="blockchain" onClick={openWalletDialog}>
                <Wallet className="mr-2 h-4 w-4" />
                Connect Wallet
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">
                Connect your wallet from the top navigation bar to load your campaigns.
              </p>
            )}
          </CardContent>
        </Card>
      ) : myCampaigns.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No campaigns created yet</CardTitle>
            <CardDescription>
              This wallet has not created any campaigns yet.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="charity" onClick={() => navigate('/create')}>
              Create Campaign
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {myCampaigns.map((campaign) => (
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
