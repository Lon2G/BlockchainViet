import { Contract, isAddress } from 'ethers'
import { CONTRACTS, IS_MOCK_BACKEND, MOCK_API_BASE_URL, SEPOLIA_CHAIN, SEPOLIA_CHAIN_ID_HEX, SEPOLIA_RPC_URL, getReadonlyProvider, getWalletProvider } from '@/lib/web3'

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] | object }) => Promise<unknown>
    }
  }
}

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
  raised: bigint
  donorCount: number
  metaCID: string
  position: [number, number, number]
}

export interface CampaignDetailData extends CampaignSummary {
  donations: Array<{
    donor: string
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
}

interface MockDonationRecord {
  donor: string
  amount: string
  timestamp: number
  txHash?: string
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
}

const STORED_CAMPAIGNS_KEY = 'pedulichain.campaigns.v1'
const STORED_DONATIONS_KEY = 'pedulichain.donations.v1'
const MOCK_ACCOUNT_KEY = 'pedulichain.mock.account.v1'

const createMetaId = () => {
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID()
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

const randomHex = (bytes: number) => {
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.getRandomValues) {
    const values = new Uint8Array(bytes)
    globalThis.crypto.getRandomValues(values)
    return Array.from(values, (value) => value.toString(16).padStart(2, '0')).join('')
  }

  return Array.from({ length: bytes }, () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0')).join('')
}

export const getMockAccountAddress = () => {
  if (typeof window === 'undefined') {
    return '0x0000000000000000000000000000000000000000'
  }

  const existing = window.localStorage.getItem(MOCK_ACCOUNT_KEY)
  if (existing && isAddress(existing)) {
    return existing
  }

  const nextAddress = `0x${randomHex(20)}`
  window.localStorage.setItem(MOCK_ACCOUNT_KEY, nextAddress)
  return nextAddress
}

export const CAMPAIGN_FACTORY_ABI = [
  'event CampaignCreated(address indexed campaignAddress, address indexed coordinator, uint256 goal, uint256 deadline, string metaCID)',
  'function createCampaign(address coordinator, uint256 goal, uint256 deadline, string metaCID) returns (address campaignAddress)',
  'function getAllCampaigns() view returns (address[])'
] as const

export const CAMPAIGN_ABI = [
  'function donate() payable',
  'function getCampaignDetails() view returns (address _coordinator, uint256 _goal, uint256 _deadline, string _metaCID, uint256 _totalRaised, uint256 _donationCount, uint256 _proposalCount)',
  'function getDonations() view returns ((address donor, uint256 amount, uint256 timestamp)[])'
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

export const ensureSepoliaNetwork = async () => {
  if (IS_MOCK_BACKEND) {
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

const getRaisedFromDonations = (donations: MockDonationRecord[]) => (
  donations.reduce((total, donation) => total + BigInt(donation.amount), 0n)
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
  raised: getRaisedFromDonations(campaign.donations),
  donorCount: getDonorCountFromDonations(campaign.donations),
  metaCID: campaign.metaCID,
  position: buildPositionFromAddress(campaign.address)
})

const toCampaignDetail = (campaign: MockCampaignRecord): CampaignDetailData => ({
  ...toCampaignSummary(campaign),
  donations: campaign.donations
    .map((donation) => ({
      donor: donation.donor,
      amount: BigInt(donation.amount),
      timestamp: donation.timestamp,
      txHash: donation.txHash
    }))
    .sort((a, b) => b.timestamp - a.timestamp)
})

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
}) => {
  if (IS_MOCK_BACKEND) {
    const payload = await fetchMockApi<{
      campaign: MockCampaignRecord
      createTxHash: string
      donationTxHash: string
    }>('/campaigns', {
      method: 'POST',
      body: JSON.stringify({
        ...params,
        coordinator: params.coordinator || getMockAccountAddress(),
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

  await ensureSepoliaNetwork()

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

export const donateToCampaign = async (campaignAddress: string, amount: bigint) => {
  if (IS_MOCK_BACKEND) {
    const donor = getMockAccountAddress()
    const payload = await fetchMockApi<{ txHash: string }>(`/campaigns/${encodeURIComponent(campaignAddress)}/donations`, {
      method: 'POST',
      body: JSON.stringify({
        donor,
        amount: amount.toString()
      })
    })

    return payload.txHash
  }

  await ensureSepoliaNetwork()

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
    txHash: receipt.hash
  })

  return receipt.hash as string
}

export const getTrackedCampaigns = async (): Promise<CampaignSummary[]> => {
  if (IS_MOCK_BACKEND) {
    const campaigns = await fetchMockApi<MockCampaignRecord[]>('/campaigns')
    return campaigns
      .map(toCampaignSummary)
      .sort((a, b) => b.deadline - a.deadline)
  }

  const provider = getReadonlyProvider()
  const stored = getStoredCampaigns()

  const summaries = await Promise.all(
    stored.map(async (record) => {
      const campaign = new Contract(record.address, CAMPAIGN_ABI, provider)
      const [
        coordinator,
        goal,
        deadline,
        metaCID,
        totalRaised,
        donationCount
      ] = await campaign.getCampaignDetails()

      return {
        ...record,
        id: record.address,
        coordinator,
        goal,
        deadline: Number(deadline),
        metaCID,
        raised: totalRaised,
        donorCount: Number(donationCount),
        position: buildPositionFromAddress(record.address)
      }
    })
  )

  return summaries.sort((a, b) => b.deadline - a.deadline)
}

export const getTrackedCampaignDetail = async (campaignAddress: string): Promise<CampaignDetailData | null> => {
  if (IS_MOCK_BACKEND) {
    try {
      const campaign = await fetchMockApi<MockCampaignRecord>(`/campaigns/${encodeURIComponent(campaignAddress)}`)
      return toCampaignDetail(campaign)
    } catch (error) {
      if (error instanceof Error && /not found/i.test(error.message)) {
        return null
      }

      throw error
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
  const [
    coordinator,
    goal,
    deadline,
    metaCID,
    totalRaised,
    donationCount
  ] = await campaign.getCampaignDetails()
  const donations = await campaign.getDonations()
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
      item.timestamp === donation.timestamp
    )

    if (!exists) {
      mergedDonations.push(donation)
    }
  }

  mergedDonations.sort((a, b) => b.timestamp - a.timestamp)

  return {
    ...record,
    id: campaignAddress,
    coordinator,
    goal,
    deadline: Number(deadline),
    metaCID,
    raised: totalRaised,
    donorCount: Number(donationCount),
    position: buildPositionFromAddress(campaignAddress),
    donations: mergedDonations
  }
}
