export function parseMoneyInput(value: string): number {
  const match = value.trim().match(/^(\d{1,8})(?:[.,](\d{1,2}))?$/)
  if (!match) throw new Error('Informe o valor em reais, com até duas casas decimais.')
  const result = Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0'))
  if (!Number.isSafeInteger(result) || result <= 0 || result > 2_000_000_000) throw new Error('O valor precisa ser positivo e estar dentro do limite permitido.')
  return result
}
export function moneyInput(value: number) { return `${Math.floor(value / 100)}.${String(value % 100).padStart(2, '0')}` }
export function nextMonth(value: string) {
  const match = value.match(/^(\d{4})-(0[1-9]|1[0-2])$/)
  if (!match) throw new Error('Confira a competência.')
  const year = Number(match[1]), month = Number(match[2])
  if (year === 9999 && month === 12) throw new Error('Competência fora do limite.')
  return `${year + (month === 12 ? 1 : 0)}-${String(month === 12 ? 1 : month + 1).padStart(2, '0')}`
}
