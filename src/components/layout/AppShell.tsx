import { Outlet } from 'react-router-dom'
import Navbar from '@/components/layout/Navbar'
import SidebarNav from '@/components/layout/SidebarNav'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useAuth } from '@/contexts/AuthContext'
import { Sparkles, UserCircle2 } from 'lucide-react'

export default function AppShell() {
  const { user, isAuthenticated } = useAuth()
  const initials = user?.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') ?? 'GU'

  return (
    <div className="min-h-screen bg-background">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 shrink-0 border-r border-border bg-card/70 md:flex md:flex-col">
          <div className="sticky top-0 flex min-h-screen flex-col px-5 py-6">
            <div className="rounded-2xl border border-border bg-background/90 p-5 shadow-card-3d">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12 border border-border shadow-card-3d">
                  <AvatarFallback className="bg-gradient-primary font-semibold text-primary-foreground">
                    {isAuthenticated ? initials : <UserCircle2 className="h-5 w-5" />}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-lg font-semibold">{user?.name ?? 'Guest User'}</p>
                  <p className="text-sm text-muted-foreground">
                    {user?.email ?? 'Not signed in'}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-border bg-background/70 p-3">
              <SidebarNav />
            </div>

            <div className="mt-auto rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-5">
              <div className="mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <p className="font-medium">Workspace</p>
              </div>
              <p className="text-sm leading-6 text-muted-foreground">
                Main navigation is grouped on the left so the core screens stay easy to reach.
              </p>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <Navbar />
          <div className="border-b border-border bg-background/90 px-4 py-3 md:hidden">
            <SidebarNav mobile />
          </div>
          <main className="flex-1">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
