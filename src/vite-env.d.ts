/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BACKEND_MODE?: string
  readonly VITE_MOCK_API_BASE_URL?: string
  readonly VITE_CAMPAIGN_FACTORY_ADDRESS?: string
  readonly VITE_GOOGLE_CLIENT_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
