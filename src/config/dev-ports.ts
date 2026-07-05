import { isDev } from './env';

export const ADMIN_DEV_PORT = 5173;
export const CLIENT_DEV_PORT = 5174;

export function getClientPublicUrl(slug: string): string {
  if (isDev) {
    return `http://${window.location.hostname}:${CLIENT_DEV_PORT}/app/${slug}`;
  }
  return `${window.location.origin}/app/${slug}`;
}
