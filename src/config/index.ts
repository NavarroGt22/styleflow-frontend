export { API_BASE_URL, WS_BASE_URL, BASE_DOMAIN, isDev } from './env';
export {
  PLATFORM_URL,
  adminLoginUrl,
  superAdminUrl,
  ownerAdminUrl,
  clientPublicUrl,
  suggestTenantClientPath,
  suggestTenantAdminPath,
} from './platform-urls';
export { apiUrl, wsUrl, isInternalApiUrl } from './api';
export {
  isLocalhostHost,
  isPlatformHost,
  isCustomDomainHost,
  extractTenantSubdomain,
} from './domains';
export { ADMIN_DEV_PORT, CLIENT_DEV_PORT, getClientPublicUrl } from './dev-ports';
