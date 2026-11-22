'use client'
import { useState } from 'react'
import Link from 'next/link'
import { ProspectFinder } from './management/prospect-finder'
import { PageHeading } from './management/primitives'
export function PlatformProspecting() {
  const [open, setOpen] = useState(true), [saved, setSaved] = useState(false)
  return <main className="platform-workspace"><PageHeading title="Prospecção de barbearias" description="Encontre páginas públicas por cidade e bairro e revise os contatos antes de salvar." actions={<button className="button button-primary" onClick={() => setOpen(true)}>Pesquisar barbearias</button>} />{saved && <p role="status">Lead salvo no CRM.</p>}<section className="panel production-panel"><h2>Do primeiro contato à conversão</h2><p>Instagram, site e WhatsApp são apresentados quando encontrados. Confira a página de origem e a localização antes de adicionar a oportunidade. Os contatos salvos ficam disponíveis no CRM para você revisar a mensagem e entrar em contato.</p><Link className="text-link" href="/platform/super/crm">Abrir CRM</Link></section><ProspectFinder open={open} onClose={() => setOpen(false)} onSaved={() => setSaved(true)} /></main>
}
