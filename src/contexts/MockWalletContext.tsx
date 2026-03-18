import type { ReactNode } from 'react'
import { createContext, useContext, useMemo, useState } from 'react'
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
import { shortenAddress } from '@/lib/web3'

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
  const [wallet, setWallet] = useState<MockWallet | null>(() => getConnectedMockWallet())
  const [isWalletDialogOpen, setIsWalletDialogOpen] = useState(false)

  const value = useMemo<MockWalletContextValue>(() => ({
    wallet,
    wallets: MOCK_WALLETS,
    isWalletDialogOpen,
    openWalletDialog: () => setIsWalletDialogOpen(true),
    closeWalletDialog: () => setIsWalletDialogOpen(false),
    connectMockWallet: (nextWallet) => {
      setStoredMockWalletAddress(nextWallet.address)
      setWallet(nextWallet)
      setIsWalletDialogOpen(false)
    },
    disconnectMockWallet: () => {
      clearStoredMockWalletAddress()
      setWallet(null)
    }
  }), [isWalletDialogOpen, wallet])

  return (
    <MockWalletContext.Provider value={value}>
      {children}
      <Dialog open={isWalletDialogOpen} onOpenChange={setIsWalletDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Choose a simulated wallet</DialogTitle>
            <DialogDescription>
              This demo only connects after you click `Connect Wallet`. Select one of the simulated wallets below to continue.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
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
