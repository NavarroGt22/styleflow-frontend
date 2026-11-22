'use client'
import { useEffect, useState } from 'react'
import { PageHeading, StatCard, formatBRL } from './management/primitives'
import { useResource } from './management/use-resource'
import { civilToday } from './management/api'
export interface PlatformBillingSummary { month: string; confirmedMrrMinor: number; contractedMinor: number; pendingMinor: number; receiptsMinor: number; eligibleTenants: number; cashCoverage: 'complete'|'partial'; legacyUnallocatedMinor: number; generatedAt: string }
export function PlatformOverview() {
  const [month, setMonth] = useState(() => civilToday().slice(0, 7))
  const summary = useResource<PlatformBillingSummary>(`/api/platform/admin/management/billing/summary?month=${month}`)
  const leads = useResource<{ total: number }>('/api/platform/admin/management/leads?pageSize=1')
  useEffect(() => { window.addEventListener('platform-finance-updated', summary.reload); return () => window.removeEventListener('platform-finance-updated', summary.reload); }, [summary.reload])
  const value = (key: 'confirmedMrrMinor'|'contractedMinor'|'pendingMinor'|'receiptsMinor') => summary.loading ? 'Carregando…' : summary.value ? formatBRL(summary.value[key]) : 'Indisponível'
  return <main className="platform-workspace"><PageHeading eyebrow="GESTÃO DA PLATAFORMA" title="Visão geral" description="Carteira, relacionamento e financeiro no mesmo Master." actions={<label className="field">Competência<input type="month" value={month} onChange={event => setMonth(event.target.value)} required /></label>} />
    <div className="stat-grid"><StatCard label="MRR confirmado do mês" value={value('confirmedMrrMinor')} note="Competências quitadas da carteira ativa pagante" /><StatCard label="Mensalidade contratada" value={value('contractedMinor')} note="Valor atual da carteira ativa" /><StatCard label="Recebimentos registrados" value={value('receiptsMinor')} note="Dinheiro registrado pela data de recebimento" /><StatCard label="Pendente na competência" value={value('pendingMinor')} note="Valor devido menos pagamentos da competência" /><StatCard label="Leads cadastrados" value={leads.loading ? 'Carregando…' : leads.value?.total ?? 'Indisponível'} note="Oportunidades salvas no CRM" /></div>
    {summary.error && <p role="alert" className="form-error">{summary.error}</p>}{leads.error && <p role="alert">{leads.error}</p>}
    <section className="panel production-panel"><h2>Como os valores são contados</h2><p>Mensalidade zero representa isenção. Pagamento antecipado quita as competências escolhidas; o dinheiro aparece uma vez na data de recebimento. O MRR confirmado inclui o valor da competência quitada das contas atualmente ativas e pagantes.</p>{summary.value?.cashCoverage === 'partial' && <p className="field-help">Há pagamentos antigos sem distribuição em recebimentos individuais. O valor mostrado de recebimentos é parcial; o histórico precisa de conciliação para fechar o caixa.</p>}</section>
  </main>
}
