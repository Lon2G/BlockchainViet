import { useAccount, useChainId, useConnect, useDisconnect } from 'wagmi'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { shortenAddress, IS_MOCK_BACKEND, SEPOLIA_CHAIN } from '@/lib/web3'
import { Wallet, LogOut } from 'lucide-react'
import { ensureSepoliaNetwork, getMockAccountAddress } from '@/lib/campaigns'

export default function WalletConnect() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()
  const isOnSepolia = chainId === SEPOLIA_CHAIN.id

  if (IS_MOCK_BACKEND) {
    const mockAddress = getMockAccountAddress()

    return (
      <div className="flex items-center gap-2">
        <Badge variant="secondary">Connected</Badge>
        <Badge variant="outline" className="font-mono">
          {shortenAddress(mockAddress)}
        </Badge>
      </div>
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
