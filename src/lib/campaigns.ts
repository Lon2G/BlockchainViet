import { Contract, isAddress } from 'ethers'
import { CONTRACTS, IS_MOCK_BACKEND, MOCK_API_BASE_URL, SEPOLIA_CHAIN, SEPOLIA_CHAIN_ID_HEX, SEPOLIA_RPC_URL, getReadonlyProvider, getWalletProvider } from '@/lib/web3'
import { getConnectedMockWalletAddress } from '@/lib/mockWallet'

export interface CampaignRecord {
  address: string
  title: string
  description: string
  category: string
  coordinator: string
  goal: bigint
  deadline: number
  initialDeposit: bigint
  txHash: string
  createdAt: string
}

export interface CampaignSummary extends CampaignRecord {
  id: string
  source: 'mock' | 'chain' | 'demo'
  raised: bigint
  refundedAmount: bigint
  grossRaisedAmount: bigint
  withdrawnAmount: bigint
  withdrawableAmount: bigint
  donorCount: number
  metaCID: string
  position: [number, number, number]
  fundingStatus: 'active' | 'goal-reached' | 'successful' | 'expired' | 'refunded'
  disbursementStatus: 'locked' | 'available' | 'withdrawn'
}

export interface CampaignDetailData extends CampaignSummary {
  donations: Array<{
    donor: string
    amount: bigint
    timestamp: number
    txHash?: string
    supporterName?: string
    message?: string
  }>
  refunds: Array<{
    donor: string
    amount: bigint
    timestamp: number
    txHash?: string
    donationTxHash?: string
    supporterName?: string
    message?: string
  }>
  withdrawals: Array<{
    recipient: string
    amount: bigint
    timestamp: number
    txHash?: string
  }>
}

export interface DonationRecord {
  donor: string
  amount: bigint
  timestamp: number
  txHash?: string
  supporterName?: string
  message?: string
}

interface MockDonationRecord {
  donor: string
  amount: string
  timestamp: number
  txHash?: string
  supporterName?: string
  message?: string
}

interface MockRefundRecord {
  donor: string
  amount: string
  timestamp: number
  txHash?: string
  donationTxHash?: string
  supporterName?: string
  message?: string
}

interface MockCampaignRecord {
  address: string
  title: string
  description: string
  category: string
  coordinator: string
  goal: string
  deadline: number
  initialDeposit: string
  txHash: string
  createdAt: string
  metaCID: string
  donations: MockDonationRecord[]
  refunds: MockRefundRecord[]
  withdrawals: Array<{
    recipient: string
    amount: string
    timestamp: number
    txHash?: string
  }>
  fundingStatus?: CampaignSummary['fundingStatus']
  grossRaisedAmount?: string
  refundedAmount?: string
  raisedAmount?: string
  withdrawnAmount?: string
  withdrawableAmount?: string
  disbursementStatus?: CampaignSummary['disbursementStatus']
}

const STORED_CAMPAIGNS_KEY = 'pedulichain.campaigns.v1'
const STORED_DONATIONS_KEY = 'pedulichain.donations.v1'

const createMetaId = () => {
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID()
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export const CAMPAIGN_FACTORY_ABI = [
  'event CampaignCreated(address indexed campaignAddress, address indexed coordinator, uint256 goal, uint256 deadline, string metaCID)',
  'function createCampaign(address coordinator, uint256 goal, uint256 deadline, string metaCID) returns (address campaignAddress)',
  'function getAllCampaigns() view returns (address[])'
] as const

export const CAMPAIGN_ABI = [
  'function donate() payable',
  'function withdrawFunds()',
  'function processRefunds()',
  'function getCampaignDetails() view returns (address _coordinator, uint256 _goal, uint256 _deadline, string _metaCID, uint256 _totalRaised, uint256 _donationCount, uint256 _proposalCount)',
  'function getCampaignState() view returns (uint256 _contractBalance, uint256 _totalRefunded, uint256 _totalWithdrawn, uint256 _withdrawableAmount, bool _refundsProcessed, bool _fundsWithdrawn)',
  'function getDonations() view returns ((address donor, uint256 amount, uint256 timestamp)[])',
  'function getRefunds() view returns ((address donor, uint256 amount, uint256 timestamp)[])',
  'function getWithdrawals() view returns ((address recipient, uint256 amount, uint256 timestamp)[])'
] as const

const serializeRecord = (record: CampaignRecord) => ({
  ...record,
  goal: record.goal.toString(),
  initialDeposit: record.initialDeposit.toString()
})

const deserializeRecord = (record: ReturnType<typeof serializeRecord>): CampaignRecord => ({
  ...record,
  goal: BigInt(record.goal),
  initialDeposit: BigInt(record.initialDeposit)
})

const serializeDonation = (donation: DonationRecord) => ({
  ...donation,
  amount: donation.amount.toString()
})

const deserializeDonation = (donation: ReturnType<typeof serializeDonation>): DonationRecord => ({
  ...donation,
  amount: BigInt(donation.amount)
})

export const getStoredCampaigns = (): CampaignRecord[] => {
  if (typeof window === 'undefined') {
    return []
  }

  const raw = window.localStorage.getItem(STORED_CAMPAIGNS_KEY)
  if (!raw) {
    return []
  }

  try {
    const parsed = JSON.parse(raw) as Array<ReturnType<typeof serializeRecord>>
    return parsed.map(deserializeRecord)
  } catch {
    return []
  }
}

export const saveCampaignRecord = (record: CampaignRecord) => {
  if (typeof window === 'undefined') {
    return
  }

  const existing = getStoredCampaigns()
  const next = [record, ...existing.filter((item) => item.address.toLowerCase() !== record.address.toLowerCase())]
  window.localStorage.setItem(
    STORED_CAMPAIGNS_KEY,
    JSON.stringify(next.map(serializeRecord))
  )
}

export const getStoredDonations = (campaignId: string): DonationRecord[] => {
  if (typeof window === 'undefined') {
    return []
  }

  const raw = window.localStorage.getItem(STORED_DONATIONS_KEY)
  if (!raw) {
    return []
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, Array<ReturnType<typeof serializeDonation>>>
    return (parsed[campaignId.toLowerCase()] ?? []).map(deserializeDonation)
  } catch {
    return []
  }
}

export const saveDonationRecord = (campaignId: string, donation: DonationRecord) => {
  if (typeof window === 'undefined') {
    return
  }

  const raw = window.localStorage.getItem(STORED_DONATIONS_KEY)
  const parsed = raw
    ? JSON.parse(raw) as Record<string, Array<ReturnType<typeof serializeDonation>>>
    : {}
  const key = campaignId.toLowerCase()
  const existing = (parsed[key] ?? []).map(deserializeDonation)

  const duplicate = existing.some((item) => {
    if (donation.txHash && item.txHash) {
      return item.txHash.toLowerCase() === donation.txHash.toLowerCase()
    }

    return (
      item.donor.toLowerCase() === donation.donor.toLowerCase() &&
      item.amount === donation.amount &&
      item.timestamp === donation.timestamp
    )
  })

  if (duplicate) {
    return
  }

  parsed[key] = [donation, ...existing]
    .sort((a, b) => b.timestamp - a.timestamp)
    .map(serializeDonation)

  window.localStorage.setItem(STORED_DONATIONS_KEY, JSON.stringify(parsed))
}

export const isCampaignAddress = (value: string | undefined): value is string => {
  return Boolean(value && isAddress(value))
}

export const ensureSepoliaNetwork = async (options?: { force?: boolean }) => {
  if (IS_MOCK_BACKEND && !options?.force) {
    return
  }

  if (!window.ethereum) {
    throw new Error('MetaMask is not installed')
  }

  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: SEPOLIA_CHAIN_ID_HEX }]
    })
  } catch (error: unknown) {
    const switchError = error as { code?: number }
    if (switchError.code !== 4902) {
      throw error
    }

    await window.ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [{
        chainId: SEPOLIA_CHAIN_ID_HEX,
        chainName: SEPOLIA_CHAIN.name,
        nativeCurrency: SEPOLIA_CHAIN.nativeCurrency,
        rpcUrls: [SEPOLIA_RPC_URL],
        blockExplorerUrls: [SEPOLIA_CHAIN.blockExplorers?.default.url]
      }]
    })
  }
}

const buildPositionFromAddress = (address: string): [number, number, number] => {
  const lonSeed = parseInt(address.slice(2, 10), 16) / 0xffffffff
  const latSeed = parseInt(address.slice(10, 18), 16) / 0xffffffff
  const theta = lonSeed * Math.PI * 2
  const phi = latSeed * Math.PI
  const radius = 2.25

  return [
    radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  ]
}

const deriveFundingStatus = (
  goal: bigint,
  deadline: number,
  totalRaised: bigint,
  refundsProcessed: boolean
): CampaignSummary['fundingStatus'] => {
  if (refundsProcessed) {
    return 'refunded'
  }

  const now = Math.floor(Date.now() / 1000)
  if (deadline <= now) {
    return totalRaised >= goal ? 'successful' : 'expired'
  }

  return totalRaised >= goal ? 'goal-reached' : 'active'
}

const deriveDisbursementStatus = (
  withdrawableAmount: bigint,
  fundsWithdrawn: boolean
): CampaignSummary['disbursementStatus'] => {
  if (fundsWithdrawn) {
    return 'withdrawn'
  }

  return withdrawableAmount > 0n ? 'available' : 'locked'
}

const getRaisedFromDonations = (donations: MockDonationRecord[]) => (
  donations.reduce((total, donation) => total + BigInt(donation.amount), 0n)
)

const getRefundedFromRefunds = (refunds: MockRefundRecord[]) => (
  refunds.reduce((total, refund) => total + BigInt(refund.amount), 0n)
)

const getDonorCountFromDonations = (donations: MockDonationRecord[]) => (
  new Set(donations.map((donation) => donation.donor.toLowerCase())).size
)

const toCampaignRecord = (campaign: MockCampaignRecord): CampaignRecord => ({
  address: campaign.address,
  title: campaign.title,
  description: campaign.description,
  category: campaign.category,
  coordinator: campaign.coordinator,
  goal: BigInt(campaign.goal),
  deadline: campaign.deadline,
  initialDeposit: BigInt(campaign.initialDeposit),
  txHash: campaign.txHash,
  createdAt: campaign.createdAt
})

const toCampaignSummary = (campaign: MockCampaignRecord): CampaignSummary => ({
  ...toCampaignRecord(campaign),
  id: campaign.address,
  source: 'mock',
  raised: BigInt(campaign.raisedAmount ?? getRaisedFromDonations(campaign.donations).toString()),
  refundedAmount: BigInt(campaign.refundedAmount ?? getRefundedFromRefunds(campaign.refunds).toString()),
  grossRaisedAmount: BigInt(campaign.grossRaisedAmount ?? getRaisedFromDonations(campaign.donations).toString()),
  withdrawnAmount: BigInt(campaign.withdrawnAmount ?? '0'),
  withdrawableAmount: BigInt(campaign.withdrawableAmount ?? '0'),
  donorCount: getDonorCountFromDonations(campaign.donations),
  metaCID: campaign.metaCID,
  position: buildPositionFromAddress(campaign.address),
  fundingStatus: campaign.fundingStatus ?? 'active',
  disbursementStatus: campaign.disbursementStatus ?? 'locked'
})

const toCampaignDetail = (campaign: MockCampaignRecord): CampaignDetailData => ({
  ...toCampaignSummary(campaign),
  donations: campaign.donations
    .map((donation) => ({
      donor: donation.donor,
      amount: BigInt(donation.amount),
      timestamp: donation.timestamp,
      txHash: donation.txHash,
      supporterName: donation.supporterName,
      message: donation.message
    }))
    .sort((a, b) => b.timestamp - a.timestamp),
  refunds: campaign.refunds
    .map((refund) => ({
      donor: refund.donor,
      amount: BigInt(refund.amount),
      timestamp: refund.timestamp,
      txHash: refund.txHash,
      donationTxHash: refund.donationTxHash,
      supporterName: refund.supporterName,
      message: refund.message
    }))
    .sort((a, b) => b.timestamp - a.timestamp),
  withdrawals: campaign.withdrawals
    .map((withdrawal) => ({
      recipient: withdrawal.recipient,
      amount: BigInt(withdrawal.amount),
      timestamp: withdrawal.timestamp,
      txHash: withdrawal.txHash
    }))
    .sort((a, b) => b.timestamp - a.timestamp)
})

const buildChainCampaignSummary = async (record: CampaignRecord, provider = getReadonlyProvider()): Promise<CampaignSummary> => {
  const campaign = new Contract(record.address, CAMPAIGN_ABI, provider)
  const [
    coordinator,
    goal,
    deadline,
    metaCID,
    totalRaised,
    donationCount
  ] = await campaign.getCampaignDetails()
  const [
    ,
    totalRefunded,
    totalWithdrawn,
    withdrawableAmount,
    refundsProcessed,
    fundsWithdrawn
  ] = await campaign.getCampaignState()
  const fundingStatus = deriveFundingStatus(goal, Number(deadline), totalRaised, refundsProcessed)
  const disbursementStatus = deriveDisbursementStatus(withdrawableAmount, fundsWithdrawn)
  const netRaised = refundsProcessed ? 0n : totalRaised

  return {
    ...record,
    id: record.address,
    source: 'chain',
    coordinator,
    goal,
    deadline: Number(deadline),
    metaCID,
    raised: netRaised,
    refundedAmount: totalRefunded,
    grossRaisedAmount: totalRaised,
    withdrawnAmount: totalWithdrawn,
    withdrawableAmount,
    donorCount: Number(donationCount),
    position: buildPositionFromAddress(record.address),
    fundingStatus,
    disbursementStatus
  }
}

const fetchMockApi = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`${MOCK_API_BASE_URL}/api/mock${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {})
    },
    ...init
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: string } | null
    throw new Error(payload?.error || `Mock backend request failed with status ${response.status}`)
  }

  return response.json() as Promise<T>
}

export const createCampaignOnChain = async (params: {
  coordinator: string
  goal: bigint
  deadline: number
  title: string
  description: string
  category: string
  initialDeposit: bigint
}, options?: { forceOnChain?: boolean }) => {
  const useOnChain = options?.forceOnChain || !IS_MOCK_BACKEND

  if (!useOnChain) {
    const payload = await fetchMockApi<{
      campaign: MockCampaignRecord
      createTxHash: string
      donationTxHash: string
    }>('/campaigns', {
      method: 'POST',
      body: JSON.stringify({
        ...params,
        coordinator: params.coordinator || getConnectedMockWalletAddress() || '',
        goal: params.goal.toString(),
        initialDeposit: params.initialDeposit.toString()
      })
    })

    return {
      record: toCampaignRecord(payload.campaign),
      createTxHash: payload.createTxHash,
      donationTxHash: payload.donationTxHash
    }
  }

  await ensureSepoliaNetwork({ force: useOnChain })

  const provider = getWalletProvider()
  const signer = await provider.getSigner()
  const factory = new Contract(CONTRACTS.CAMPAIGN_FACTORY, CAMPAIGN_FACTORY_ABI, signer)
  const metaCID = `peduli:${createMetaId()}`

  const createTx = await factory.createCampaign(
    params.coordinator,
    params.goal,
    params.deadline,
    metaCID
  )
  const createReceipt = await createTx.wait()

  const factoryInterface = factory.interface
  const createdLog = createReceipt.logs
    .map((log: { topics: string[]; data: string }) => {
      try {
        return factoryInterface.parseLog(log)
      } catch {
        return null
      }
    })
    .find((log) => log?.name === 'CampaignCreated')

  const campaignAddress = createdLog?.args?.campaignAddress as string | undefined
  if (!campaignAddress) {
    throw new Error('Could not resolve campaign address from transaction receipt')
  }

  let donationTxHash = ''
  if (params.initialDeposit > 0n) {
    const campaign = new Contract(campaignAddress, CAMPAIGN_ABI, signer)
    const donateTx = await campaign.donate({ value: params.initialDeposit })
    const donateReceipt = await donateTx.wait()
    donationTxHash = donateReceipt.hash
  }

  const record: CampaignRecord = {
    address: campaignAddress,
    title: params.title,
    description: params.description,
    category: params.category,
    coordinator: params.coordinator,
    goal: params.goal,
    deadline: params.deadline,
    initialDeposit: params.initialDeposit,
    txHash: donationTxHash || createReceipt.hash,
    createdAt: new Date().toISOString()
  }

  saveCampaignRecord(record)

  return {
    record,
    createTxHash: createReceipt.hash,
    donationTxHash
  }
}

export const donateToCampaign = async (
  campaignAddress: string,
  amount: bigint,
  metadata?: {
    donor?: string
    supporterName?: string
    message?: string
  },
  options?: { forceOnChain?: boolean }
) => {
  const useOnChain = options?.forceOnChain || !IS_MOCK_BACKEND

  if (!useOnChain) {
    const donor = metadata?.donor || getConnectedMockWalletAddress()
    if (!donor) {
      throw new Error('Please connect a wallet before donating')
    }

    const payload = await fetchMockApi<{ txHash: string }>(`/campaigns/${encodeURIComponent(campaignAddress)}/donations`, {
      method: 'POST',
      body: JSON.stringify({
        donor,
        amount: amount.toString(),
        supporterName: metadata?.supporterName?.trim() || undefined,
        message: metadata?.message?.trim() || undefined
      })
    })

    return payload.txHash
  }

  await ensureSepoliaNetwork({ force: useOnChain })

  const provider = getWalletProvider()
  const signer = await provider.getSigner()
  const donor = await signer.getAddress()
  const campaign = new Contract(campaignAddress, CAMPAIGN_ABI, signer)
  const tx = await campaign.donate({ value: amount })
  const receipt = await tx.wait()

  saveDonationRecord(campaignAddress, {
    donor,
    amount,
    timestamp: Math.floor(Date.now() / 1000),
    txHash: receipt.hash,
    supporterName: metadata?.supporterName?.trim() || undefined,
    message: metadata?.message?.trim() || undefined
  })

  return receipt.hash as string
}

export const withdrawCampaignFunds = async (campaignAddress: string, requesterAddress?: string) => {
  const useOnChain = !IS_MOCK_BACKEND && !requesterAddress

  if (!useOnChain) {
    const requester = requesterAddress || getConnectedMockWalletAddress()
    if (!requester) {
      throw new Error('Please connect the creator wallet before withdrawing')
    }

    const payload = await fetchMockApi<{ txHash: string }>(`/campaigns/${encodeURIComponent(campaignAddress)}/withdraw`, {
      method: 'POST',
      body: JSON.stringify({ requester })
    })

    return payload.txHash
  }

  await ensureSepoliaNetwork({ force: true })

  const provider = getWalletProvider()
  const signer = await provider.getSigner()
  const campaign = new Contract(campaignAddress, CAMPAIGN_ABI, signer)
  const tx = await campaign.withdrawFunds()
  const receipt = await tx.wait()

  return receipt.hash as string
}

export const processCampaignRefunds = async (campaignAddress: string) => {
  await ensureSepoliaNetwork({ force: true })

  const provider = getWalletProvider()
  const signer = await provider.getSigner()
  const campaign = new Contract(campaignAddress, CAMPAIGN_ABI, signer)
  const tx = await campaign.processRefunds()
  const receipt = await tx.wait()

  return receipt.hash as string
}

export const getTrackedCampaigns = async (): Promise<CampaignSummary[]> => {
  if (IS_MOCK_BACKEND) {
    const mockCampaigns = await fetchMockApi<MockCampaignRecord[]>('/campaigns')
    const provider = getReadonlyProvider()
    const chainCampaignResults = await Promise.allSettled(
      getStoredCampaigns().map((record) => buildChainCampaignSummary(record, provider))
    )
    const chainCampaigns = chainCampaignResults
      .filter((result): result is PromiseFulfilledResult<CampaignSummary> => result.status === 'fulfilled')
      .map((result) => result.value)

    const merged = [...mockCampaigns.map(toCampaignSummary), ...chainCampaigns]
    const uniqueByAddress = new Map<string, CampaignSummary>()

    for (const campaign of merged) {
      const key = campaign.address.toLowerCase()
      if (!uniqueByAddress.has(key) || campaign.source === 'chain') {
        uniqueByAddress.set(key, campaign)
      }
    }

    return [...uniqueByAddress.values()].sort((a, b) => b.deadline - a.deadline)
  }

  const provider = getReadonlyProvider()
  const stored = getStoredCampaigns()

  const summaryResults = await Promise.allSettled(
    stored.map((record) => buildChainCampaignSummary(record, provider))
  )
  const summaries = summaryResults
    .filter((result): result is PromiseFulfilledResult<CampaignSummary> => result.status === 'fulfilled')
    .map((result) => result.value)

  return summaries.sort((a, b) => b.deadline - a.deadline)
}

export const getTrackedCampaignDetail = async (campaignAddress: string): Promise<CampaignDetailData | null> => {
  if (IS_MOCK_BACKEND) {
    try {
      const campaign = await fetchMockApi<MockCampaignRecord>(`/campaigns/${encodeURIComponent(campaignAddress)}`)
      return toCampaignDetail(campaign)
    } catch (error) {
      if (!(error instanceof Error) || !/not found/i.test(error.message)) {
        throw error
      }
    }
  }

  const record = getStoredCampaigns().find(
    (item) => item.address.toLowerCase() === campaignAddress.toLowerCase()
  )

  if (!record) {
    return null
  }

  const provider = getReadonlyProvider()
  const campaign = new Contract(campaignAddress, CAMPAIGN_ABI, provider)
  let coordinator: string
  let goal: bigint
  let deadline: number
  let metaCID: string
  let totalRaised: bigint
  let donationCount: bigint
  let totalRefunded: bigint
  let totalWithdrawn: bigint
  let withdrawableAmount: bigint
  let refundsProcessed: boolean
  let fundsWithdrawn: boolean
  let donations: Array<{ donor: string; amount: bigint; timestamp: bigint }>
  let refunds: Array<{ donor: string; amount: bigint; timestamp: bigint }>
  let withdrawals: Array<{ recipient: string; amount: bigint; timestamp: bigint }>

  try {
    const details = await campaign.getCampaignDetails()
    coordinator = details[0]
    goal = details[1]
    deadline = Number(details[2])
    metaCID = details[3]
    totalRaised = details[4]
    donationCount = details[5]

    const state = await campaign.getCampaignState()
    totalRefunded = state[1]
    totalWithdrawn = state[2]
    withdrawableAmount = state[3]
    refundsProcessed = state[4]
    fundsWithdrawn = state[5]

    donations = await campaign.getDonations()
    refunds = await campaign.getRefunds()
    withdrawals = await campaign.getWithdrawals()
  } catch {
    return null
  }
  const storedDonations = getStoredDonations(campaignAddress)
  const normalizedOnChainDonations = donations.map((donation: { donor: string; amount: bigint; timestamp: bigint }) => ({
    donor: donation.donor,
    amount: donation.amount,
    timestamp: Number(donation.timestamp)
  }))
  const mergedDonations = [...normalizedOnChainDonations]

  for (const donation of storedDonations) {
    const exists = mergedDonations.some((item) =>
      item.donor.toLowerCase() === donation.donor.toLowerCase() &&
      item.amount === donation.amount &&
      Math.abs(item.timestamp - donation.timestamp) <= 120
    )

    if (!exists) {
      mergedDonations.push(donation)
    }
  }

  mergedDonations.sort((a, b) => b.timestamp - a.timestamp)
  const fundingStatus = deriveFundingStatus(goal, deadline, totalRaised, refundsProcessed)
  const disbursementStatus = deriveDisbursementStatus(withdrawableAmount, fundsWithdrawn)
  const netRaised = refundsProcessed ? 0n : totalRaised

  return {
    ...record,
    id: campaignAddress,
    source: 'chain',
    coordinator,
    goal,
    deadline,
    metaCID,
    raised: netRaised,
    refundedAmount: totalRefunded,
    grossRaisedAmount: totalRaised,
    withdrawnAmount: totalWithdrawn,
    withdrawableAmount,
    donorCount: Number(donationCount),
    position: buildPositionFromAddress(campaignAddress),
    fundingStatus,
    disbursementStatus,
    donations: mergedDonations,
    refunds: refunds
      .map((refund: { donor: string; amount: bigint; timestamp: bigint }) => ({
        donor: refund.donor,
        amount: refund.amount,
        timestamp: Number(refund.timestamp)
      }))
      .sort((a: { timestamp: number }, b: { timestamp: number }) => b.timestamp - a.timestamp),
    withdrawals: withdrawals
      .map((withdrawal: { recipient: string; amount: bigint; timestamp: bigint }) => ({
        recipient: withdrawal.recipient,
        amount: withdrawal.amount,
        timestamp: Number(withdrawal.timestamp)
      }))
      .sort((a: { timestamp: number }, b: { timestamp: number }) => b.timestamp - a.timestamp)
  }
}
