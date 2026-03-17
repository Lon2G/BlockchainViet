import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAccount } from 'wagmi'
import Navbar from '@/components/layout/Navbar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { donateToCampaign, getMockAccountAddress, getStoredDonations, getTrackedCampaignDetail, isCampaignAddress, saveDonationRecord } from '@/lib/campaigns'
import { formatEther, IS_MOCK_BACKEND, parseEther, shortenAddress } from '@/lib/web3'
import { ArrowLeft, Heart, Users, Clock, Vote, CheckCircle, AlertCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

const mockCampaign = {
  id: '1',
  title: 'Clean Water for Rural Communities',
  description: 'Providing access to clean drinking water for remote villages in developing regions. This initiative aims to install water purification systems and dig wells in areas where clean water is scarce.',
  coordinator: '0x1234567890123456789012345678901234567890',
  goal: BigInt('5000000000000000000'),
  raised: BigInt('3750000000000000000'),
  deadline: Math.floor(Date.now() / 1000) + 86400 * 30,
  donorCount: 89,
  category: 'Environment'
}

const mockDonations = [
  { donor: '0x1111111111111111111111111111111111111111', amount: '0.5', timestamp: '2024-01-15' },
  { donor: '0x2222222222222222222222222222222222222222', amount: '1.0', timestamp: '2024-01-14' },
  { donor: '0x3333333333333333333333333333333333333333', amount: '0.25', timestamp: '2024-01-13' }
]

const mockProposals = [
  {
    id: 1,
    amount: '1.5',
    recipient: '0x4444444444444444444444444444444444444444',
    description: 'Purchase water purification equipment',
    votesFor: 45,
    votesAgainst: 5,
    status: 'approved',
    deadline: Math.floor(Date.now() / 1000) + 86400
  },
  {
    id: 2,
    amount: '1.0',
    recipient: '0x5555555555555555555555555555555555555555',
    description: 'Transportation and installation costs',
    votesFor: 12,
    votesAgainst: 8,
    status: 'voting',
    deadline: Math.floor(Date.now() / 1000) + 86400 * 2
  }
]

export default function CampaignDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const { address, isConnected } = useAccount()

  const [donationAmount, setDonationAmount] = useState('')
  const [isDonating, setIsDonating] = useState(false)
  const [mockDonationVersion, setMockDonationVersion] = useState(0)

  const isTracked = isCampaignAddress(id)
  const { data: trackedCampaign, isLoading, refetch } = useQuery({
    queryKey: ['campaign-detail', id],
    queryFn: () => getTrackedCampaignDetail(id!),
    enabled: Boolean(id) && (IS_MOCK_BACKEND || isTracked)
  })

  const localDonations = !IS_MOCK_BACKEND && id ? getStoredDonations(id) : []
  const mockRaisedExtra = localDonations.reduce((sum, donation) => sum + donation.amount, 0n)
  const campaign = IS_MOCK_BACKEND
    ? trackedCampaign
    : trackedCampaign ?? (isTracked ? null : {
        ...mockCampaign,
        raised: mockCampaign.raised + mockRaisedExtra,
        donorCount: mockCampaign.donorCount + localDonations.length
      })
  const donations = (IS_MOCK_BACKEND || isTracked)
    ? trackedCampaign?.donations.map((donation) => ({
        donor: donation.donor,
        amount: formatEther(donation.amount),
        timestamp: new Date(donation.timestamp * 1000).toLocaleDateString()
      })) ?? []
    : [
        ...localDonations.map((donation) => ({
          donor: donation.donor,
          amount: formatEther(donation.amount),
          timestamp: new Date(donation.timestamp * 1000).toLocaleDateString()
        })),
        ...mockDonations
      ]

  const progress = campaign ? (Number(campaign.raised) / Number(campaign.goal)) * 100 : 0
  const daysLeft = campaign
    ? Math.max(0, Math.ceil((campaign.deadline * 1000 - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0

  const handleDonate = async () => {
    if (!donationAmount || Number(donationAmount) <= 0) {
      toast({
        title: 'Invalid amount',
        description: 'Please enter a valid donation amount',
        variant: 'destructive'
      })
      return
    }

    if (!IS_MOCK_BACKEND && isTracked && !isConnected) {
      toast({
        title: 'Wallet not connected',
        description: 'Connect MetaMask before sending SepoliaETH.',
        variant: 'destructive'
      })
      return
    }

    setIsDonating(true)

    try {
      if ((IS_MOCK_BACKEND || isTracked) && id) {
        const txHash = await donateToCampaign(id, parseEther(donationAmount))
        await Promise.all([
          refetch(),
          queryClient.invalidateQueries({ queryKey: ['tracked-campaigns'] })
        ])
        toast({
          title: 'Donation successful!',
          description: IS_MOCK_BACKEND
            ? 'Your contribution has been recorded successfully.'
            : `MetaMask sent ${donationAmount} SepoliaETH to this campaign.`
        })
      } else {
        if (!id) {
          throw new Error('Campaign id not found')
        }

        saveDonationRecord(id, {
          donor: address ?? getMockAccountAddress(),
          amount: parseEther(donationAmount),
          timestamp: Math.floor(Date.now() / 1000)
        })

        await new Promise((resolve) => setTimeout(resolve, 2000))
        setMockDonationVersion((value) => value + 1)
        toast({
          title: 'Donation successful!',
          description: `Thank you for donating ${donationAmount} ETH`
        })
      }

      setDonationAmount('')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Something went wrong. Please try again.'
      toast({
        title: 'Donation failed',
        description: message,
        variant: 'destructive'
      })
    } finally {
      setIsDonating(false)
    }
  }

  const handleVote = async (proposalId: number, support: boolean) => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500))

      toast({
        title: 'Vote cast successfully!',
        description: `You voted ${support ? 'for' : 'against'} the proposal`
      })
    } catch {
      toast({
        title: 'Vote failed',
        description: 'Something went wrong. Please try again.',
        variant: 'destructive'
      })
    }
  }

  if ((IS_MOCK_BACKEND || isTracked) && isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardHeader>
              <CardTitle>Loading campaign</CardTitle>
              <CardDescription>
                {IS_MOCK_BACKEND
                  ? 'Loading the latest campaign data.'
                  : 'Reading the latest data from Ethereum Sepolia.'}
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    )
  }

  if (!campaign) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardHeader>
              <CardTitle>Campaign not found</CardTitle>
              <CardDescription>
                {IS_MOCK_BACKEND
                  ? 'The requested campaign is unavailable or has been removed.'
                  : 'This page only knows on-chain campaigns that were created from this browser.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate('/')}>Back to Dashboard</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => navigate('/')} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-2xl mb-2">{campaign.title}</CardTitle>
                    <div className="flex items-center gap-2 mb-4">
                      <Badge>{campaign.category}</Badge>
                      {(IS_MOCK_BACKEND || isTracked) && (
                        <Badge variant="secondary">{IS_MOCK_BACKEND ? 'Live' : 'Live on Sepolia'}</Badge>
                      )}
                      <Badge variant={daysLeft > 0 ? 'secondary' : 'destructive'}>
                        {daysLeft > 0 ? `${daysLeft} days left` : 'Expired'}
                      </Badge>
                    </div>
                  </div>
                  <Button variant="charity" size="sm">
                    <Heart className="w-4 h-4 mr-2" />
                    Follow
                  </Button>
                </div>
                <CardDescription className="text-base leading-relaxed">
                  {campaign.description}
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Funding Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between text-lg">
                    <span>Raised</span>
                    <span className="font-bold">
                      {formatEther(campaign.raised)} / {formatEther(campaign.goal)} ETH
                    </span>
                  </div>
                  <Progress value={progress} variant="liquid" className="h-3" />
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>{progress.toFixed(1)}% funded</span>
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {campaign.donorCount} donors
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Tabs defaultValue="details">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="donations">Donations</TabsTrigger>
                <TabsTrigger value="proposals">Proposals</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Campaign Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Coordinator</p>
                        <p className="font-mono text-sm">{shortenAddress(campaign.coordinator)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Category</p>
                        <p>{campaign.category}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Goal</p>
                        <p>{formatEther(campaign.goal)} ETH</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Time Left</p>
                        <p className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {daysLeft} days
                        </p>
                      </div>
                      {(IS_MOCK_BACKEND || isTracked) && id && (
                        <div className="col-span-2">
                          <p className="text-sm text-muted-foreground">{IS_MOCK_BACKEND ? 'Campaign ID' : 'Campaign contract'}</p>
                          <p className="font-mono text-sm break-all">{id}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="donations" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Donations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {donations.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        {IS_MOCK_BACKEND
                          ? 'No donations yet. Be the first to support this campaign.'
                          : 'No donations yet. Send the first SepoliaETH contribution from MetaMask.'}
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {donations.map((donation, index) => (
                          <div key={`${donation.donor}-${index}`} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                            <div>
                              <p className="font-mono text-sm">{shortenAddress(donation.donor)}</p>
                              <p className="text-xs text-muted-foreground">{donation.timestamp}</p>
                            </div>
                            <Badge variant="secondary">{donation.amount} ETH</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="proposals" className="space-y-4">
                {IS_MOCK_BACKEND || isTracked ? (
                  <Card>
                    <CardHeader>
                      <CardTitle>Proposal workflow</CardTitle>
                      <CardDescription>
                        {IS_MOCK_BACKEND
                          ? 'Proposal management will appear here once that workflow is enabled.'
                          : 'The campaign contract supports disbursement proposals, but this frontend is currently wired only for deploy and donate.'}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                ) : (
                  mockProposals.map((proposal) => (
                    <Card key={proposal.id}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg">Proposal #{proposal.id}</CardTitle>
                            <CardDescription>{proposal.description}</CardDescription>
                          </div>
                          <Badge variant={
                            proposal.status === 'approved' ? 'default' :
                            proposal.status === 'voting' ? 'secondary' : 'destructive'
                          }>
                            {proposal.status === 'approved' && <CheckCircle className="w-3 h-3 mr-1" />}
                            {proposal.status === 'voting' && <Vote className="w-3 h-3 mr-1" />}
                            {proposal.status === 'rejected' && <AlertCircle className="w-3 h-3 mr-1" />}
                            {proposal.status}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex justify-between text-sm">
                            <span>Amount: {proposal.amount} ETH</span>
                            <span>Recipient: {shortenAddress(proposal.recipient)}</span>
                          </div>

                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>Votes For: {proposal.votesFor}</span>
                              <span>Votes Against: {proposal.votesAgainst}</span>
                            </div>
                            <Progress
                              value={(proposal.votesFor / (proposal.votesFor + proposal.votesAgainst)) * 100}
                              className="h-2"
                            />
                          </div>

                          {proposal.status === 'voting' && (
                            <div className="flex gap-2">
                              <Button
                                variant="charity"
                                size="sm"
                                onClick={() => handleVote(proposal.id, true)}
                              >
                                Vote For
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleVote(proposal.id, false)}
                              >
                                Vote Against
                              </Button>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>
            </Tabs>
          </div>

          <div className="space-y-6">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle>Make a Donation</CardTitle>
                <CardDescription>
                  {IS_MOCK_BACKEND
                    ? 'Support this campaign instantly and keep the funding progress moving.'
                    : isTracked
                      ? 'Send SepoliaETH from MetaMask directly into this campaign contract.'
                    : 'Support this campaign with cryptocurrency'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="amount" className="text-sm font-medium">
                    Amount (ETH)
                  </label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="0.1"
                    value={donationAmount}
                    onChange={(e) => setDonationAmount(e.target.value)}
                  />
                </div>

                <div className="flex gap-2">
                  {['0.01', '0.05', '0.1'].map((amount) => (
                    <Button
                      key={amount}
                      variant="outline"
                      size="sm"
                      onClick={() => setDonationAmount(amount)}
                      className="flex-1"
                    >
                      {amount} ETH
                    </Button>
                  ))}
                </div>

                <Button
                  variant="donate"
                  className="w-full"
                  size="lg"
                  onClick={handleDonate}
                  disabled={isDonating || !donationAmount}
                >
                  {isDonating
                    ? 'Processing...'
                    : IS_MOCK_BACKEND
                      ? `Contribute ${donationAmount || '0'} ETH`
                    : isTracked
                      ? `Send ${donationAmount || '0'} SepoliaETH`
                      : `Donate ${donationAmount || '0'} ETH`}
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  {IS_MOCK_BACKEND
                    ? 'Your contribution is reflected in the campaign totals right away.'
                    : isTracked
                      ? 'After MetaMask confirms the transaction, this page reloads the raised amount and donation list from Sepolia.'
                    : 'Your donation will be recorded on the blockchain and is fully transparent'}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
