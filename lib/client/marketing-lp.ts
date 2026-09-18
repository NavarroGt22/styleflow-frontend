/**
 * Salões com LP de marketing fora do app Next (site/domínio próprio).
 * Usado só para exibir o link público no admin — o app do cliente não tem mais vitrine interna.
 */
export const EXTERNAL_MARKETING_LP: Record<string, string> = {
  leleco: 'https://www.lelecobarbes.com',
}

export function hasExternalMarketingLp(salonSlug?: string | null): boolean {
  if (!salonSlug) return false
  return Boolean(EXTERNAL_MARKETING_LP[salonSlug.toLowerCase()])
}

export function externalMarketingLpUrl(salonSlug?: string | null): string | null {
  if (!salonSlug) return null
  return EXTERNAL_MARKETING_LP[salonSlug.toLowerCase()] ?? null
}
