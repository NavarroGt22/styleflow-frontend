/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_WS_URL?: string;
  readonly VITE_BASE_DOMAIN?: string;
  readonly VITE_PLATFORM_URL?: string;
  readonly VITE_ADMIN_LOGIN_PATH?: string;
  readonly VITE_SUPER_ADMIN_PATH?: string;
  readonly VITE_PLATFORM_HOSTS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
