/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_APPS_SCRIPT_URL: string
  readonly VITE_DATA_MODE: 'mock' | 'remote' | undefined
  readonly VITE_WHATSAPP_LINK: string
  readonly VITE_AGENDA_LINK: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
