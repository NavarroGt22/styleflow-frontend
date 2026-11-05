import type { Service } from './types'

/** Mesma ideia do backend: serviços que contam como “corte” para liberar adicionais. */
export function isCutLikeService(service: Pick<Service, 'name' | 'category' | 'isDefaultCutAddon'>): boolean {
  if (service.isDefaultCutAddon) return false
  const name = service.name.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')
  const category = (service.category || '').toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')
  if (/^barba\b|\bbarba\b/.test(name) && !/corte/.test(name)) return false
  if (/pe de cabelo|pezinho|sobrancelha|unha|maquiagem|depil|pigment/.test(name) && !/corte/.test(name)) {
    return false
  }
  if (category === 'cabelo') return true
  if (/\bcorte\b|fade|degrade|navalh|social/.test(name)) return true
  return false
}

export function cutServiceIdsAmong(services: Service[], excludeId?: string): string[] {
  return services
    .filter((item) => item.id !== excludeId && item.active !== false && isCutLikeService(item))
    .map((item) => item.id)
}
