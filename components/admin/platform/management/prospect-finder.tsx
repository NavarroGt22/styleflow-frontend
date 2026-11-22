"use client";
import { useRef, useState, type FormEvent } from "react";
import type { Prospect, ProspectSearch } from "@/lib/platform/contracts/prospecting";
import type { LeadDto } from "@/lib/platform/contracts/crm";
import { Modal } from "./primitives";
import { useMutation } from "./use-resource";

export function ProspectFinder({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [results, setResults] = useState<ProspectSearch | null>(null), [draft, setDraft] = useState<Prospect | null>(null);
  const [filters, setFilters] = useState({ city: "", neighborhood: "" }), [saved, setSaved] = useState<Set<string>>(new Set());
  const [notice, setNotice] = useState("");
  const search = useMutation(), save = useMutation();
  const scrollAnchor = useRef<HTMLHeadingElement>(null);
  async function find(page: number, values = filters) {
    setDraft(null); setNotice(""); setResults(null);
    try { const result = await search.mutate<ProspectSearch>("/api/platform/admin/management/prospects/search", "POST", { ...values, page }); if (result) setResults(result); } catch {}
  }
  async function importLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!draft) return;
    const fields = new FormData(event.currentTarget), text = (key: string) => String(fields.get(key) ?? "").trim();
    try {
      const lead = await save.mutate<LeadDto>("/api/platform/admin/management/leads", "POST", { businessName: text("businessName"), city: text("city"), neighborhood: text("neighborhood"), contactName: "", source: "Prospecção manual", website: text("website") || null, instagram: text("instagram") || null, whatsapp: text("whatsapp") || null, notes: `Prospecção revisada manualmente. Fonte: ${draft.sourceUrl}\nConsulta: ${results?.collectedAt ?? ""}` });
      if (lead) { setSaved((current) => new Set(current).add(draft.sourceUrl)); setNotice(`${lead.businessName} foi adicionada ao CRM.`); setDraft(null); onSaved(); }
    } catch {}
  }
  return <Modal open={open} onClose={() => { if (!search.busy && !save.busy) onClose(); }} title="Buscar barbearias para prospectar" description="Encontre páginas públicas e revise os contatos antes de adicionar um lead." wide>
    <form className="production-filters" onSubmit={(event) => { event.preventDefault(); const fields = new FormData(event.currentTarget); const values = { city: String(fields.get("city")).trim(), neighborhood: String(fields.get("neighborhood")).trim() }; setFilters(values); void find(0, values); }}>
      <label className="field grow">Cidade e UF<input name="city" required minLength={2} maxLength={100} placeholder="Ex.: Salvador BA" defaultValue={filters.city} disabled={search.busy || save.busy} /></label>
      <label className="field grow">Bairro da pesquisa<input name="neighborhood" maxLength={100} placeholder="Opcional" defaultValue={filters.neighborhood} disabled={search.busy || save.busy} /></label>
      <button className="button button-primary" disabled={search.busy || save.busy}>{search.busy ? "Pesquisando…" : "Pesquisar barbearias"}</button>
    </form>
    <p className="field-help">Os resultados são sugestões da web e podem incluir diretórios ou páginas fora da região. Confira a barbearia e seus contatos na fonte. Um telefone comum não confirma WhatsApp.</p>
    {search.error && <p className="form-error" role="alert">{search.error}</p>}
    {notice && <p role="status">{notice}</p>}
    {search.busy && <p role="status">Consultando páginas públicas…</p>}
    {results && <><p className="field-help">Fonte: Brave Search · Consulta em {new Date(results.collectedAt).toLocaleString("pt-BR")} · Página {results.page + 1}</p>
      {!results.items.length && <p>Nenhuma página encontrada. Tente outra cidade ou retire o bairro.</p>}
      <div className="production-list">{results.items.map((item) => <article className="prospect-result" key={item.sourceUrl}>
        <h3>{item.businessName}</h3><p>{item.excerpt}</p>
        <div className="prospect-contacts"><span>Instagram: {item.instagram ? <a href={item.instagram} target="_blank" rel="noopener noreferrer">Conferir perfil</a> : "Não encontrado"}</span><span>Site/página: {item.website ? <a href={item.website} target="_blank" rel="noopener noreferrer">Conferir página</a> : "Não encontrado"}</span><span>WhatsApp: {item.whatsapp ? "Link público encontrado — conferir" : "Não encontrado"}</span></div>
        <div className="production-actions"><a className="text-link" href={item.sourceUrl} target="_blank" rel="noopener noreferrer">Abrir fonte</a><button className="button button-secondary" disabled={saved.has(item.sourceUrl) || save.busy} onClick={() => { save.clearError(); setDraft(item); setTimeout(() => scrollAnchor.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }), 0); }}>{saved.has(item.sourceUrl) ? "Adicionado nesta sessão" : "Revisar e adicionar"}</button></div>
      </article>)}</div>
      <div className="production-actions"><button className="button button-secondary" disabled={results.page === 0 || search.busy || save.busy} onClick={() => void find(results.page - 1)}>Resultados anteriores</button><button className="button button-secondary" disabled={!results.hasMore || search.busy || save.busy} onClick={() => void find(results.page + 1)}>Mais resultados</button></div>
    </>}
    {draft && <section className="prospect-review"><h3 ref={scrollAnchor}>Revisar contato para o CRM</h3><p className="field-help">Confirme o nome, a localização e os canais comerciais. Remova qualquer informação que não pertença à barbearia.</p>
      <form className="lead-form" onSubmit={importLead} key={draft.sourceUrl}><fieldset className="production-fieldset" disabled={save.busy || search.busy}><div className="form-grid">
        <label className="field field-full">Barbearia encontrada<input name="businessName" defaultValue={draft.businessName} maxLength={200} required /></label>
        <label className="field">Cidade do lead<input name="city" defaultValue={draft.city} maxLength={120} /></label>
        <label className="field">Bairro do lead<input name="neighborhood" defaultValue={draft.neighborhood} maxLength={120} /></label>
        <label className="field">Instagram do lead<input name="instagram" defaultValue={draft.instagram ?? ""} maxLength={200} placeholder="Não encontrado — informe se confirmado" /></label>
        <label className="field">Site do lead<input name="website" type="url" defaultValue={draft.website ?? ""} maxLength={2048} /></label>
        <label className="field field-full">WhatsApp do lead<input name="whatsapp" type="tel" defaultValue={draft.whatsapp ?? ""} maxLength={40} placeholder="Somente número confirmado, com DDI e DDD" /></label>
      </div><p className="field-help">O lead será salvo na etapa Novo. O contato será feito por você, depois de revisar a mensagem.</p>
      {save.error && <p className="form-error" role="alert">{save.error}</p>}
      <div className="production-actions"><button className="button button-primary">{save.busy ? "Salvando…" : "Adicionar ao CRM"}</button><button type="button" className="button button-secondary" onClick={() => setDraft(null)}>Cancelar revisão</button></div></fieldset></form>
    </section>}
  </Modal>;
}
