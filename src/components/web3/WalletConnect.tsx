import { useAccount, useChainId, useConnect, useDisconnect } from 'wagmi'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { shortenAddress, IS_MOCK_BACKEND, SEPOLIA_CHAIN } from '@/lib/web3'
import { Wallet, LogOut } from 'lucide-react'
import { ensureSepoliaNetwork } from '@/lib/campaigns'
import { useMockWallet } from '@/contexts/MockWalletContext'

export default function WalletConnect() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()
  const isOnSepolia = chainId === SEPOLIA_CHAIN.id
  const { wallet, openWalletDialog, disconnectMockWallet } = useMockWallet()

  if (IS_MOCK_BACKEND) {
    if (wallet) {
      return (
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{wallet.name}</Badge>
          <Badge variant="outline" className="font-mono">
            {shortenAddress(wallet.address)}
          </Badge>
          <Button variant="outline" size="sm" onClick={openWalletDialog}>
            Switch
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={disconnectMockWallet}
            className="hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      )
    }

    return (
      <Button
        variant="blockchain"
        onClick={openWalletDialog}
        className="gap-2"
      >
        <Wallet className="w-4 h-4" />
        Connect Wallet
      </Button>
    )
  }

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant={isOnSepolia ? 'default' : 'destructive'}>
          {isOnSepolia ? 'Sepolia' : 'Wrong network'}
        </Badge>
        <Badge variant="secondary" className="font-mono">
          {shortenAddress(address)}
        </Badge>
        {!isOnSepolia && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => void ensureSepoliaNetwork()}
          >
            Switch
          </Button>
        )}
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => disconnect()}
          className="hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="w-4 h-4" />
        </Button>
      </div>
    )
  }

  return (
    <Button 
      variant="blockchain" 
      onClick={() => connect({ connector: connectors[0], chainId: SEPOLIA_CHAIN.id })}
      className="gap-2"
    >
      <Wallet className="w-4 h-4" />
      Connect Wallet
    </Button>
  )
}
