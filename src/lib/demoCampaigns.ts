import type { CampaignSummary } from '@/lib/campaigns'

export const DEMO_CAMPAIGNS: CampaignSummary[] = [
  {
    id: '1',
    address: '0x1000000000000000000000000000000000000001',
    title: 'Clean Water for Rural Communities',
    description: 'Providing access to clean drinking water for remote villages in developing regions.',
    category: 'Environment',
    coordinator: '0x1234567890123456789012345678901234567890',
    goal: BigInt('5000000000000000000'),
    raised: BigInt('3750000000000000000'),
    deadline: Math.floor(Date.now() / 1000) + 86400 * 30,
    donorCount: 89,
    initialDeposit: BigInt(0),
    txHash: '0xseed000000000000000000000000000000000000000000000000000000000001',
    createdAt: '2026-03-17T09:00:00.000Z',
    metaCID: 'peduli:demo-1',
    position: [1.2, 0.5, 1.5]
  },
  {
    id: '2',
    address: '0x1000000000000000000000000000000000000002',
    title: 'Education for Underprivileged Children',
    description: 'Building schools and providing educational resources for children in need.',
    category: 'Education',
    coordinator: '0x2345678901234567890123456789012345678901',
    goal: BigInt('8000000000000000000'),
    raised: BigInt('6400000000000000000'),
    deadline: Math.floor(Date.now() / 1000) + 86400 * 45,
    donorCount: 156,
    initialDeposit: BigInt(0),
    txHash: '0xseed000000000000000000000000000000000000000000000000000000000002',
    createdAt: '2026-03-17T09:15:00.000Z',
    metaCID: 'peduli:demo-2',
    position: [-1.8, -0.3, 0.8]
  },
  {
    id: '3',
    address: '0x1000000000000000000000000000000000000003',
    title: 'Medical Aid for Disaster Relief',
    description: 'Emergency medical supplies and support for natural disaster victims.',
    category: 'Healthcare',
    coordinator: '0x3456789012345678901234567890123456789012',
    goal: BigInt('10000000000000000000'),
    raised: BigInt('10000000000000000000'),
    deadline: Math.floor(Date.now() / 1000) + 86400 * 15,
    donorCount: 234,
    initialDeposit: BigInt(0),
    txHash: '0xseed000000000000000000000000000000000000000000000000000000000003',
    createdAt: '2026-03-17T09:30:00.000Z',
    metaCID: 'peduli:demo-3',
    position: [0.5, -1.5, -1.2]
  }
]

export const getDemoCampaignById = (campaignId: string | undefined) => (
  DEMO_CAMPAIGNS.find((campaign) => campaign.id === campaignId) ?? null
)
