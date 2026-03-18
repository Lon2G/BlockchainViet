import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import WalletConnect from '@/components/web3/WalletConnect'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Heart, LogOut, UserCircle2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useWishlist } from '@/contexts/WishlistContext'

export default function Navbar() {
  const navigate = useNavigate()
  const { user, isAuthenticated, openAuthDialog, signOut } = useAuth()
  const { followedCampaignIds } = useWishlist()

  const initials = user?.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') ?? 'GU'

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center shadow-blockchain">
              <Heart className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <span className="font-bold text-xl bg-gradient-primary bg-clip-text text-transparent">
                DonateChain
              </span>
              <p className="hidden text-xs text-muted-foreground md:block">
                Charity workspace
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-auto gap-3 px-2 py-1">
                    <Avatar className="h-9 w-9 border border-border">
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                    <div className="hidden text-left md:block">
                      <p className="text-sm font-medium leading-none">{user.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-60">
                  <DropdownMenuLabel>Account</DropdownMenuLabel>
                  <DropdownMenuItem className="flex-col items-start gap-1">
                    <span className="font-medium">{user.name}</span>
                    <span className="text-xs text-muted-foreground">{user.email}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/wishlist')}>
                    <Heart className="mr-2 h-4 w-4" />
                    Wishlist ({followedCampaignIds.length})
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button variant="outline" className="gap-2" onClick={openAuthDialog}>
                <UserCircle2 className="h-4 w-4" />
                Sign In
              </Button>
            )}

            <WalletConnect />
          </div>
        </div>
      </div>
    </nav>
  )
}
