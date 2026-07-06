import { isDev } from './env';
import { clientPublicUrl as buildClientPublicUrl } from './platform-urls';

export const ADMIN_DEV_PORT = 5173;
export const CLIENT_DEV_PORT = 5174;

export function getClientPublicUrl(slug: string): string {
  if (isDev) {
    return `http://${window.location.hostname}:${CLIENT_DEV_PORT}/app/${slug}`;
  }
  return buildClientPublicUrl(slug);
}
