/**
 * Horário de funcionamento por dia da semana.
 * Chave = "0"…"6" (Dom…Sáb). Valor ausente = fechado naquele dia.
 */
export type DayHoursMap = Record<string, { open: string; close: string }>

const HHMM = /^\d{2}:\d{2}$/

export function isValidHhMm(value: string): boolean {
  if (!HHMM.test(value)) return false
  const [h, m] = value.split(':').map(Number)
  return h >= 0 && h <= 23 && m >= 0 && m <= 59
}

export function parseDayHours(raw: unknown): DayHoursMap {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const out: DayHoursMap = {}
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!/^[0-6]$/.test(key)) continue
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue
    const open = String((value as { open?: unknown }).open ?? '')
    const close = String((value as { close?: unknown }).close ?? '')
    if (!isValidHhMm(open) || !isValidHhMm(close)) continue
    if (open >= close) continue
    out[key] = { open, close }
  }
  return out
}

export function dayHoursFromLegacy(
  openWeekdays: number[],
  openTime: string,
  closeTime: string,
): DayHoursMap {
  const open = isValidHhMm(openTime) ? openTime : '09:00'
  const close = isValidHhMm(closeTime) && closeTime > open ? closeTime : '18:00'
  const out: DayHoursMap = {}
  for (const day of openWeekdays) {
    if (day < 0 || day > 6) continue
    out[String(day)] = { open, close }
  }
  return out
}

export function openWeekdaysFromDayHours(dayHours: DayHoursMap): number[] {
  return Object.keys(dayHours)
    .map(Number)
    .filter((d) => d >= 0 && d <= 6)
    .sort((a, b) => a - b)
}

export function legacyRangeFromDayHours(dayHours: DayHoursMap): {
  openTime: string
  closeTime: string
} {
  const entries = Object.values(dayHours)
  if (!entries.length) return { openTime: '09:00', closeTime: '18:00' }
  let openTime = entries[0].open
  let closeTime = entries[0].close
  for (const entry of entries) {
    if (entry.open < openTime) openTime = entry.open
    if (entry.close > closeTime) closeTime = entry.close
  }
  return { openTime, closeTime }
}

export function resolveDayHoursFromSalon(salon: {
  dayHours?: unknown
  openWeekdays?: number[] | null
  openTime?: string | null
  closeTime?: string | null
}): DayHoursMap {
  // dayHours definido (mesmo `{}` = todos fechados) tem prioridade sobre o legado
  if (salon.dayHours != null && typeof salon.dayHours === 'object' && !Array.isArray(salon.dayHours)) {
    return parseDayHours(salon.dayHours)
  }
  const weekdays =
    Array.isArray(salon.openWeekdays) && salon.openWeekdays.length
      ? salon.openWeekdays
      : [1, 2, 3, 4, 5, 6]
  return dayHoursFromLegacy(weekdays, salon.openTime || '09:00', salon.closeTime || '18:00')
}

export function hoursForWeekday(
  dayHours: DayHoursMap | null | undefined,
  weekday: number,
): { open: string; close: string } | null {
  if (!dayHours) return null
  return dayHours[String(weekday)] ?? null
}

/** Índice 0=Dom…6=Sáb no fuso America/Sao_Paulo. */
export function weekdayInSaoPaulo(date = new Date()): number {
  const token = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    weekday: 'short',
  })
    .formatToParts(date)
    .find((p) => p.type === 'weekday')?.value
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  }
  return map[token ?? ''] ?? date.getDay()
}
