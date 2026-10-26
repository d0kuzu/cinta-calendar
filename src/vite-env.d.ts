/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  readonly VITE_ORGANIZATION?: string
  readonly VITE_STAFF_ID?: string
  readonly VITE_DURATION?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
