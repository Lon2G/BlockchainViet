import type { ReactNode } from 'react'
import { createContext, useContext, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { Eye, EyeOff } from 'lucide-react'
import {
  AuthUser,
  clearStoredAuthUser,
  isGoogleSignInConfigured,
  loadStoredAuthUser,
  signInWithGmail,
  signInWithGoogleReal,
  signUpWithGmail,
  storeAuthUser
} from '@/lib/auth'

interface AuthContextValue {
  user: AuthUser | null
  isAuthenticated: boolean
  isAuthDialogOpen: boolean
  openAuthDialog: () => void
  closeAuthDialog: () => void
  signOut: () => void
}

type AuthView = 'gmail-signin' | 'gmail-signup'

const AuthContext = createContext<AuthContextValue | null>(null)

const initialSignInForm = {
  email: '',
  password: ''
}

const initialSignUpForm = {
  fullName: '',
  username: '',
  email: '',
  password: '',
  confirmPassword: ''
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => loadStoredAuthUser())
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false)
  const [view, setView] = useState<AuthView>('gmail-signin')
  const [gmailSignInForm, setGmailSignInForm] = useState(initialSignInForm)
  const [gmailSignUpForm, setGmailSignUpForm] = useState(initialSignUpForm)
  const [showSignInPassword, setShowSignInPassword] = useState(false)
  const [showSignUpPassword, setShowSignUpPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isAuthDialogOpen) {
      return
    }

    setView('gmail-signin')
    setGmailSignInForm({
      email: user?.provider === 'gmail' ? user.email : '',
      password: ''
    })
    setGmailSignUpForm(initialSignUpForm)
    setShowSignInPassword(false)
    setShowSignUpPassword(false)
    setShowConfirmPassword(false)
    setIsSubmitting(false)
    setError('')
  }, [isAuthDialogOpen, user])

  const closeAuthDialog = () => {
    setIsAuthDialogOpen(false)
  }

  const commitUser = (nextUser: AuthUser) => {
    storeAuthUser(nextUser)
    setUser(nextUser)
    setIsAuthDialogOpen(false)
  }

  const handleGoogleSignIn = async () => {
    setIsSubmitting(true)
    setError('')

    try {
      const nextUser = await signInWithGoogleReal()
      commitUser(nextUser)
    } catch (googleError) {
      setError(googleError instanceof Error ? googleError.message : 'Could not sign in with Google.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGmailSignIn = async () => {
    setIsSubmitting(true)
    setError('')

    try {
      const response = await signInWithGmail(gmailSignInForm.email.trim(), gmailSignInForm.password)
      commitUser(response.user)
    } catch (signInError) {
      setError(signInError instanceof Error ? signInError.message : 'Could not sign in with Gmail.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGmailSignUp = async () => {
    setIsSubmitting(true)
    setError('')

    try {
      const response = await signUpWithGmail({
        fullName: gmailSignUpForm.fullName.trim(),
        username: gmailSignUpForm.username.trim(),
        email: gmailSignUpForm.email.trim(),
        password: gmailSignUpForm.password,
        confirmPassword: gmailSignUpForm.confirmPassword
      })
      commitUser(response.user)
    } catch (signUpError) {
      setError(signUpError instanceof Error ? signUpError.message : 'Could not create the Gmail account.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const signOut = () => {
    clearStoredAuthUser()
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        isAuthDialogOpen,
        openAuthDialog: () => setIsAuthDialogOpen(true),
        closeAuthDialog,
        signOut
      }}
    >
      {children}
      <Dialog open={isAuthDialogOpen} onOpenChange={setIsAuthDialogOpen}>
        <DialogContent className="max-w-[560px] overflow-hidden border border-primary/15 bg-card/95 p-0 text-foreground shadow-2xl">
          <div className="bg-[radial-gradient(circle_at_top_left,_hsl(var(--primary)/0.24),_transparent_34%),radial-gradient(circle_at_bottom_right,_hsl(var(--secondary)/0.18),_transparent_28%)] px-8 py-8">
            <DialogHeader className="mb-6 space-y-2 text-left">
              <DialogTitle className="text-3xl font-semibold text-foreground">
                {view === 'gmail-signup' ? 'Create Account' : 'Sign In'}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                Continue with Google, or use Gmail to sign in and create an account.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              <button
                type="button"
                onClick={() => void handleGoogleSignIn()}
                disabled={isSubmitting}
                className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl border border-white/20 bg-white text-base font-medium text-slate-900 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <span className="grid h-8 w-8 place-items-center rounded-full bg-white text-xl font-semibold text-[#4285f4]">
                  G
                </span>
                <span>{isSubmitting ? 'Opening Google...' : 'Sign in with Google'}</span>
              </button>

              {!isGoogleSignInConfigured && (
                <div className="rounded-2xl border border-dashed border-primary/25 bg-background/40 p-4 text-sm text-muted-foreground">
                  Real Google sign-in needs `VITE_GOOGLE_CLIENT_ID` in your environment and `http://localhost:8080` added to the Google OAuth authorized JavaScript origins.
                </div>
              )}

              <div className="relative">
                <Separator className="bg-border/80" />
                <span className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 bg-card px-3 text-xs uppercase tracking-[0.24em] text-muted-foreground">
                  or
                </span>
              </div>

              <div className="inline-flex rounded-2xl border border-border/80 bg-background/40 p-1">
                <button
                  type="button"
                  className={cn(
                    'rounded-xl px-4 py-2 text-sm font-medium transition-colors',
                    view === 'gmail-signin'
                      ? 'bg-gradient-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                  onClick={() => {
                    setView('gmail-signin')
                    setError('')
                  }}
                >
                  Gmail Sign In
                </button>
                <button
                  type="button"
                  className={cn(
                    'rounded-xl px-4 py-2 text-sm font-medium transition-colors',
                    view === 'gmail-signup'
                      ? 'bg-gradient-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                  onClick={() => {
                    setView('gmail-signup')
                    setError('')
                    setGmailSignUpForm((current) => ({
                      ...current,
                      email: gmailSignInForm.email
                    }))
                  }}
                >
                  Create Account
                </button>
              </div>

              {view === 'gmail-signup' ? (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="signup-full-name" className="text-foreground/90">Full Name</Label>
                      <Input
                        id="signup-full-name"
                        placeholder="Alex Carter"
                        value={gmailSignUpForm.fullName}
                        onChange={(event) => setGmailSignUpForm((current) => ({ ...current, fullName: event.target.value }))}
                        className="h-14 rounded-2xl border-primary/15 bg-background/60 text-base text-foreground placeholder:text-muted-foreground"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-username" className="text-foreground/90">Username</Label>
                      <Input
                        id="signup-username"
                        placeholder="alexcarter"
                        value={gmailSignUpForm.username}
                        onChange={(event) => setGmailSignUpForm((current) => ({ ...current, username: event.target.value }))}
                        className="h-14 rounded-2xl border-primary/15 bg-background/60 text-base text-foreground placeholder:text-muted-foreground"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="text-foreground/90">Gmail</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="yourname@gmail.com"
                      value={gmailSignUpForm.email}
                      onChange={(event) => setGmailSignUpForm((current) => ({ ...current, email: event.target.value }))}
                      className="h-14 rounded-2xl border-primary/15 bg-background/60 text-base text-foreground placeholder:text-muted-foreground"
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="text-foreground/90">Password</Label>
                    <div className="relative">
                      <Input
                        id="signup-password"
                        type={showSignUpPassword ? 'text' : 'password'}
                        placeholder="Create a password"
                        value={gmailSignUpForm.password}
                        onChange={(event) => setGmailSignUpForm((current) => ({ ...current, password: event.target.value }))}
                        className="h-14 rounded-2xl border-primary/15 bg-background/60 pr-12 text-base text-foreground placeholder:text-muted-foreground"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSignUpPassword((current) => !current)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {showSignUpPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-confirm-password" className="text-foreground/90">Confirm Password</Label>
                    <div className="relative">
                      <Input
                        id="signup-confirm-password"
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Confirm your password"
                        value={gmailSignUpForm.confirmPassword}
                        onChange={(event) => setGmailSignUpForm((current) => ({ ...current, confirmPassword: event.target.value }))}
                        className="h-14 rounded-2xl border-primary/15 bg-background/60 pr-12 text-base text-foreground placeholder:text-muted-foreground"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((current) => !current)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    </div>
                  </div>

                  <Button
                    variant="blockchain"
                    className="h-14 w-full rounded-2xl text-base font-semibold"
                    onClick={() => void handleGmailSignUp()}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Creating Account...' : 'Create Account'}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="gmail-email" className="text-foreground/90">Gmail</Label>
                    <Input
                      id="gmail-email"
                      type="email"
                      placeholder="yourname@gmail.com"
                      value={gmailSignInForm.email}
                      onChange={(event) => setGmailSignInForm((current) => ({ ...current, email: event.target.value }))}
                      className="h-14 rounded-2xl border-primary/15 bg-background/60 text-base text-foreground placeholder:text-muted-foreground"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="gmail-password" className="text-foreground/90">Password</Label>
                    <div className="relative">
                      <Input
                        id="gmail-password"
                        type={showSignInPassword ? 'text' : 'password'}
                        placeholder="Enter your password"
                        value={gmailSignInForm.password}
                        onChange={(event) => setGmailSignInForm((current) => ({ ...current, password: event.target.value }))}
                        className="h-14 rounded-2xl border-primary/15 bg-background/60 pr-12 text-base text-foreground placeholder:text-muted-foreground"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSignInPassword((current) => !current)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {showSignInPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <Button
                    variant="blockchain"
                    className="h-14 w-full rounded-2xl text-base font-semibold"
                    onClick={() => void handleGmailSignIn()}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Signing In...' : 'Sign In with Gmail'}
                  </Button>
                </div>
              )}

              {error && (
                <p className={cn(
                  'text-sm',
                  error.includes('VITE_GOOGLE_CLIENT_ID') ? 'text-amber-400' : 'text-destructive'
                )}>
                  {error}
                </p>
              )}
            </div>

            <DialogFooter className="mt-6">
              <Button variant="outline" onClick={closeAuthDialog}>
                Cancel
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }

  return context
}
