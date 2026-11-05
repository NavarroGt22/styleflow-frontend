/** Helpers para multi-serviço: items[] com fallback ao service legado. */

export type AppointmentItemLike = {
  name?: string
  unitPrice?: number
  durationMinutes?: number
  coveredBySubscription?: boolean
}

export type AppointmentServicesLike = {
  service?: { name?: string; price?: number; duration?: number } | null
  items?: AppointmentItemLike[] | null
  quotedPrice?: number | null
}

export function appointmentServiceLabel(apt: AppointmentServicesLike, fallback = 'Serviço'): string {
  if (apt.items?.length) {
    const names = apt.items.map((row) => row.name).filter(Boolean) as string[]
    if (names.length) return names.join(' + ')
  }
  return apt.service?.name || fallback
}

export function appointmentDurationMinutes(apt: AppointmentServicesLike, fallback = 30): number {
  if (apt.items?.length) {
    const sum = apt.items.reduce((acc, row) => acc + Number(row.durationMinutes || 0), 0)
    if (sum > 0) return sum
  }
  return Number(apt.service?.duration) || fallback
}

export function appointmentCatalogPrice(apt: AppointmentServicesLike): number {
  if (apt.quotedPrice != null && Number.isFinite(Number(apt.quotedPrice))) {
    return Number(apt.quotedPrice)
  }
  if (apt.items?.length) {
    return apt.items.reduce((acc, row) => acc + Number(row.unitPrice || 0), 0)
  }
  return Number(apt.service?.price) || 0
}

export type BookingServiceOption = {
  id: string
  name: string
  price: number
  duration: number
  standaloneAllowed?: boolean
  addonAllowed?: boolean
  isDefaultCutAddon?: boolean
  comboItemServiceIds?: string[]
  addonHostServiceIds?: string[]
}

/** Serviço que o cliente pode escolher sozinho na lista principal. */
export function isPrimaryBookableOption(service: BookingServiceOption): boolean {
  if (service.isDefaultCutAddon) return false
  if (service.standaloneAllowed === false) return false
  return true
}

/**
 * Adicional mal configurado (só adicional, sem serviço que libera e sem “fixo nos cortes”):
 * não deve aparecer nem permanecer na seleção.
 */
export function isUnofferableAddon(service: BookingServiceOption): boolean {
  if (service.isDefaultCutAddon) return false
  if (service.standaloneAllowed !== false) return false
  const hosts = service.addonHostServiceIds || []
  return hosts.length === 0
}

/** Avisa se algum adicional ficou sem o serviço que o libera. */
export function compositionSelectionIssue(selected: BookingServiceOption[]): string | null {
  if (!selected.length) return 'Escolha pelo menos um serviço.'
  const ids = new Set(selected.map((item) => String(item.id)))
  const comboCovered = new Set<string>()
  for (const item of selected) {
    for (const child of item.comboItemServiceIds || []) comboCovered.add(String(child))
  }

  const hasPrimary = selected.some(
    (item) =>
      isPrimaryBookableOption(item) ||
      (item.comboItemServiceIds && item.comboItemServiceIds.length > 0),
  )

  for (const item of selected) {
    if (isUnofferableAddon(item)) {
      // Não mostra erro: a UI deve remover/ocultar esse item.
      continue
    }
    const standalone = item.standaloneAllowed !== false
    const hosts = (item.addonHostServiceIds || []).map(String)
    if (standalone && !item.isDefaultCutAddon) continue
    if (comboCovered.has(String(item.id))) continue

    if (item.isDefaultCutAddon) {
      if (!hasPrimary) {
        return `“${item.name}” só entra junto com um corte. Escolha o corte primeiro.`
      }
      continue
    }

    if (hosts.length === 0) continue
    const hasHost = hosts.some((hostId) => ids.has(hostId))
    if (!hasHost) {
      return `“${item.name}” só aparece junto com outro serviço. Remova o adicional ou escolha o serviço que libera.`
    }
  }
  return null
}
