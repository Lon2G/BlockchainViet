import { isAddress } from 'ethers'

export interface MockWallet {
  id: string
  name: string
  address: string
  balanceLabel: string
  description: string
}

const CONNECTED_MOCK_WALLET_KEY = 'pedulichain.mock.account.v2'
const LEGACY_CONNECTED_MOCK_WALLET_KEY = 'pedulichain.mock.account.v1'

export const MOCK_WALLETS: MockWallet[] = [
  {
    id: 'community-giver',
    name: 'Community Giver',
    address: '0x8f3a4c1d7e9b2a6c5d4e8f1a2b7c9d3e4f6a1b8c',
    balanceLabel: '12.40 ETH',
    description: 'Simulated donor wallet for individual supporters.'
  },
  {
    id: 'impact-builder',
    name: 'Impact Builder',
    address: '0x4b7d91e2c6f84a3d9b1e5c7a2f8d4e6b3c9a7f21',
    balanceLabel: '27.85 ETH',
    description: 'Simulated wallet for creating campaigns and backing them.'
  },
  {
    id: 'relief-coordinator',
    name: 'Relief Coordinator',
    address: '0x93c5e7a14d8b2f6c1a9e4b7d3f2c8a6e5d1b4f90',
    balanceLabel: '41.10 ETH',
    description: 'Simulated coordinator wallet for campaign operators.'
  }
]

export const getMockWalletByAddress = (address: string | null | undefined) => {
  if (!address) {
    return null
  }

  return MOCK_WALLETS.find((wallet) => wallet.address.toLowerCase() === address.toLowerCase()) ?? null
}

export const getStoredMockWalletAddress = () => {
  if (typeof window === 'undefined') {
    return null
  }

  const stored = window.localStorage.getItem(CONNECTED_MOCK_WALLET_KEY)
  if (stored && isAddress(stored)) {
    return stored
  }

  const legacy = window.localStorage.getItem(LEGACY_CONNECTED_MOCK_WALLET_KEY)
  if (legacy && isAddress(legacy) && getMockWalletByAddress(legacy)) {
    window.localStorage.setItem(CONNECTED_MOCK_WALLET_KEY, legacy)
    return legacy
  }

  return null
}

export const setStoredMockWalletAddress = (address: string) => {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(CONNECTED_MOCK_WALLET_KEY, address)
}

export const clearStoredMockWalletAddress = () => {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.removeItem(CONNECTED_MOCK_WALLET_KEY)
}

export const getConnectedMockWallet = () => getMockWalletByAddress(getStoredMockWalletAddress())

export const getConnectedMockWalletAddress = () => getStoredMockWalletAddress()
