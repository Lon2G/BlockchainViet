import { MOCK_API_BASE_URL } from '@/lib/web3'

export interface AuthUser {
  id: string
  name: string
  email: string
  username?: string
  provider: 'gmail' | 'google'
}

export interface GoogleAccount extends AuthUser {
  provider: 'google'
}

const AUTH_STORAGE_KEY = 'pedulichain.auth.user.v2'
const GOOGLE_IDENTITY_SCRIPT_URL = 'https://accounts.google.com/gsi/client'
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() || ''

let googleIdentityScriptPromise: Promise<void> | null = null

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string
            scope: string
            callback: (response: { access_token?: string; error?: string; error_description?: string }) => void
            error_callback?: (error: { type?: string }) => void
          }) => {
            requestAccessToken: (overrideConfig?: { prompt?: string }) => void
          }
          revoke: (token: string, callback?: (done: unknown) => void) => void
        }
      }
    }
  }
}

const fetchAuthApi = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`${MOCK_API_BASE_URL}/api/mock/auth${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {})
    },
    ...init
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: string } | null
    throw new Error(payload?.error || `Auth request failed with status ${response.status}`)
  }

  return response.json() as Promise<T>
}

export const loadStoredAuthUser = () => {
  if (typeof window === 'undefined') {
    return null
  }

  const raw = window.localStorage.getItem(AUTH_STORAGE_KEY)
  if (!raw) {
    return null
  }

  try {
    const parsed = JSON.parse(raw) as AuthUser
    if (!parsed?.email || !parsed?.name || !parsed?.provider) {
      return null
    }

    return parsed
  } catch {
    return null
  }
}

export const storeAuthUser = (user: AuthUser) => {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user))
}

export const clearStoredAuthUser = () => {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.removeItem(AUTH_STORAGE_KEY)
}

export const isGoogleSignInConfigured = Boolean(GOOGLE_CLIENT_ID)

const loadGoogleIdentityScript = async () => {
  if (typeof window === 'undefined') {
    throw new Error('Google sign-in is only available in the browser.')
  }

  if (window.google?.accounts?.oauth2) {
    return
  }

  if (!googleIdentityScriptPromise) {
    googleIdentityScriptPromise = new Promise<void>((resolve, reject) => {
      const existingScript = document.querySelector<HTMLScriptElement>(`script[src="${GOOGLE_IDENTITY_SCRIPT_URL}"]`)
      if (existingScript) {
        existingScript.addEventListener('load', () => resolve(), { once: true })
        existingScript.addEventListener('error', () => reject(new Error('Failed to load Google Identity Services.')), { once: true })
        return
      }

      const script = document.createElement('script')
      script.src = GOOGLE_IDENTITY_SCRIPT_URL
      script.async = true
      script.defer = true
      script.onload = () => resolve()
      script.onerror = () => reject(new Error('Failed to load Google Identity Services.'))
      document.head.appendChild(script)
    })
  }

  await googleIdentityScriptPromise

  if (!window.google?.accounts?.oauth2) {
    throw new Error('Google Identity Services is unavailable.')
  }
}

export const signInWithGmail = async (email: string, password: string) => {
  return fetchAuthApi<{ user: AuthUser }>('/login', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password
    })
  })
}

export const signUpWithGmail = async (payload: {
  fullName: string
  username: string
  email: string
  password: string
  confirmPassword: string
}) => {
  return fetchAuthApi<{ user: AuthUser }>('/register', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

export const getGoogleAccounts = async () => {
  return fetchAuthApi<{ accounts: GoogleAccount[] }>('/google-accounts')
}

export const signInWithGoogle = async (email: string) => {
  return fetchAuthApi<{ user: AuthUser }>('/google-login', {
    method: 'POST',
    body: JSON.stringify({ email })
  })
}

export const signInWithGoogleReal = async (): Promise<AuthUser> => {
  if (!GOOGLE_CLIENT_ID) {
    throw new Error('Google sign-in is not configured. Add VITE_GOOGLE_CLIENT_ID to your environment first.')
  }

  await loadGoogleIdentityScript()

  return new Promise<AuthUser>((resolve, reject) => {
    const tokenClient = window.google?.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: 'openid email profile',
      callback: async (response) => {
        if (response.error || !response.access_token) {
          reject(new Error(response.error_description || response.error || 'Google sign-in failed.'))
          return
        }

        try {
          const profileResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: {
              Authorization: `Bearer ${response.access_token}`
            }
          })

          if (!profileResponse.ok) {
            throw new Error('Could not read the Google profile.')
          }

          const profile = await profileResponse.json() as {
            sub?: string
            name?: string
            email?: string
          }

          if (!profile.email) {
            throw new Error('Google did not return an email address.')
          }

          resolve({
            id: profile.sub || profile.email,
            name: profile.name || profile.email.split('@')[0],
            email: profile.email,
            username: profile.email.split('@')[0],
            provider: 'google'
          })
        } catch (error) {
          reject(error instanceof Error ? error : new Error('Google sign-in failed.'))
        }
      },
      error_callback: (error) => {
        reject(new Error(error.type === 'popup_closed' ? 'Google sign-in was cancelled.' : 'Google sign-in failed to open.'))
      }
    })

    if (!tokenClient) {
      reject(new Error('Google sign-in client could not be created.'))
      return
    }

    tokenClient.requestAccessToken({ prompt: 'select_account consent' })
  })
}
