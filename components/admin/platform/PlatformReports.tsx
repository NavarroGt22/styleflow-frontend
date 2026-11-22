'use client'
import { useState } from 'react'
import { PageHeading } from './management/primitives'
import { civilToday, downloadCsv } from './management/api'
export function PlatformReports() {
  const [month, setMonth] = useState(() => civilToday().slice(0, 7)), [error, setError] = useState(''), [busy, setBusy] = useState(false)
  async function download(resource: 'leads'|'expenses') { setError(''); setBusy(true); try { await downloadCsv(`/api/platform/admin/management/exports/${resource}${resource === 'expenses' ? `?competenceMonth=${month}` : ''}`) } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível exportar.') } finally { setBusy(false) } }
  return <main className="platform-workspace"><PageHeading title="Relatórios" description="Exporte os contatos e despesas registrados na sua gestão." /><section className="panel production-panel"><h2>Exportações CSV</h2><label className="field">Competência das despesas<input type="month" value={month} onChange={event => setMonth(event.target.value)} required /></label><div className="production-actions"><button className="button button-primary" disabled={busy} onClick={() => void download('leads')}>Exportar leads</button><button className="button button-secondary" disabled={busy || !month} onClick={() => void download('expenses')}>Exportar despesas</button></div>{error && <p role="alert" className="form-error">{error}</p>}<p className="field-help">Leads da sua carteira e despesas da competência escolhida, até 10.000 registros por arquivo. Indicadores de recebimentos e competências estão no Financeiro.</p></section></main>
}
