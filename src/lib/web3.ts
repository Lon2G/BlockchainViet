import { BrowserProvider, JsonRpcProvider, formatEther as ethersFormatEther, parseEther as ethersParseEther } from 'ethers'
import { createConfig, http } from 'wagmi'
import { sepolia } from 'wagmi/chains'
import { metaMask } from 'wagmi/connectors'

export const BACKEND_MODE = import.meta.env.VITE_BACKEND_MODE === 'chain' ? 'chain' : 'mock'
export const IS_MOCK_BACKEND = BACKEND_MODE === 'mock'
export const MOCK_API_BASE_URL = (import.meta.env.VITE_MOCK_API_BASE_URL || 'http://localhost:3001').replace(/\/$/, '')

export const SEPOLIA_RPC_URL = 'https://ethereum-sepolia-rpc.publicnode.com'
export const SEPOLIA_CHAIN = sepolia
export const SEPOLIA_CHAIN_ID_HEX = `0x${SEPOLIA_CHAIN.id.toString(16)}`

export const CONTRACTS = {
  CAMPAIGN_FACTORY: (import.meta.env.VITE_CAMPAIGN_FACTORY_ADDRESS || '0xEb322c3727fDFb28DCA3C264aA0EF912eDF6d47c') as `0x${string}`
}

export const config = createConfig({
  chains: [SEPOLIA_CHAIN],
  connectors: [
    metaMask()
  ],
  transports: {
    [SEPOLIA_CHAIN.id]: http(SEPOLIA_RPC_URL)
  }
})

export const NFT_STORAGE_KEY = '285a98d9.55d85615b85a4d958c1ecd65e5cd10a8'

export const formatEther = (value: bigint): string => {
  return Number(ethersFormatEther(value)).toFixed(4)
}

export const parseEther = (value: string): bigint => {
  return ethersParseEther(value)
}

export const shortenAddress = (address: string): string => {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export const getReadonlyProvider = () => new JsonRpcProvider(SEPOLIA_RPC_URL)

export const getWalletProvider = () => {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('MetaMask is not available in this browser')
  }

  return new BrowserProvider(window.ethereum)
}
