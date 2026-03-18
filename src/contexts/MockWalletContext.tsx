import type { ReactNode } from 'react'
import { createContext, useContext, useMemo, useState } from 'react'
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import {
  MOCK_WALLETS,
  MockWallet,
  clearStoredMockWalletAddress,
  getConnectedMockWallet,
  setStoredMockWalletAddress
} from '@/lib/mockWallet'
import { IS_MOCK_BACKEND, SEPOLIA_CHAIN, shortenAddress } from '@/lib/web3'
import { ensureSepoliaNetwork } from '@/lib/campaigns'

interface MockWalletContextValue {
  wallet: MockWallet | null
  wallets: MockWallet[]
  isWalletDialogOpen: boolean
  openWalletDialog: () => void
  closeWalletDialog: () => void
  connectMockWallet: (wallet: MockWallet) => void
  disconnectMockWallet: () => void
}

const MockWalletContext = createContext<MockWalletContextValue | null>(null)

export function MockWalletProvider({ children }: { children: ReactNode }) {
  const { isConnected, address } = useAccount()
  const { connectAsync, connectors } = useConnect()
  const { disconnect } = useDisconnect()
  const [wallet, setWallet] = useState<MockWallet | null>(() => getConnectedMockWallet())
  const [isWalletDialogOpen, setIsWalletDialogOpen] = useState(false)
  const [isMetaMaskConnecting, setIsMetaMaskConnecting] = useState(false)
  const metaMaskConnector = connectors.find((connector) => connector.name.toLowerCase().includes('metamask')) ?? connectors[0]

  const value = useMemo<MockWalletContextValue>(() => ({
    wallet,
    wallets: MOCK_WALLETS,
    isWalletDialogOpen,
    openWalletDialog: () => setIsWalletDialogOpen(true),
    closeWalletDialog: () => setIsWalletDialogOpen(false),
    connectMockWallet: (nextWallet) => {
      if (isConnected) {
        disconnect()
      }
      setStoredMockWalletAddress(nextWallet.address)
      setWallet(nextWallet)
      setIsWalletDialogOpen(false)
    },
    disconnectMockWallet: () => {
      clearStoredMockWalletAddress()
      setWallet(null)
    }
  }), [disconnect, isConnected, isWalletDialogOpen, wallet])

  const handleMetaMaskConnect = async () => {
    if (!metaMaskConnector) {
      return
    }

    setIsMetaMaskConnecting(true)

    try {
      clearStoredMockWalletAddress()
      setWallet(null)
      await connectAsync({ connector: metaMaskConnector, chainId: SEPOLIA_CHAIN.id })
      await ensureSepoliaNetwork({ force: true })
      setIsWalletDialogOpen(false)
    } finally {
      setIsMetaMaskConnecting(false)
    }
  }

  return (
    <MockWalletContext.Provider value={value}>
      {children}
      <Dialog open={isWalletDialogOpen} onOpenChange={setIsWalletDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Choose a wallet</DialogTitle>
            <DialogDescription>
              {IS_MOCK_BACKEND
                ? 'Connect MetaMask for real on-chain actions, or choose a simulated wallet below for demo actions.'
                : 'Connect with MetaMask or choose one of the simulated wallets below for demo actions.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <button
              type="button"
              onClick={() => void handleMetaMaskConnect()}
              disabled={!metaMaskConnector || isMetaMaskConnecting}
              className="w-full rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary hover:bg-accent/30 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="font-medium">MetaMask</p>
                  <p className="text-sm text-muted-foreground">
                    {IS_MOCK_BACKEND
                      ? 'Connect your real wallet for on-chain campaign creation and donations.'
                      : 'Connect your real wallet for campaign creation and donations.'}
                  </p>
                  {isConnected && address && (
                    <p className="font-mono text-xs text-muted-foreground">{shortenAddress(address)}</p>
                  )}
                </div>
                <Badge variant="secondary">
                  {isMetaMaskConnecting
                    ? 'Connecting...'
                    : IS_MOCK_BACKEND
                      ? 'Real wallet'
                      : isConnected ? 'Connected' : 'Real wallet'}
                </Badge>
              </div>
            </button>

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Simulated</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            {MOCK_WALLETS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => value.connectMockWallet(item)}
                className="w-full rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary hover:bg-accent/30"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                    <p className="font-mono text-xs text-muted-foreground">{shortenAddress(item.address)}</p>
                  </div>
                  <Badge variant="secondary">{item.balanceLabel}</Badge>
                </div>
              </button>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsWalletDialogOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MockWalletContext.Provider>
  )
}

export const useMockWallet = () => {
  const context = useContext(MockWalletContext)

  if (!context) {
    throw new Error('useMockWallet must be used within a MockWalletProvider')
  }

  return context
}
