"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { LeadDto, PageDto } from "@/lib/platform/contracts/crm";
import { stages, sources, buildWhatsappLink, getInitials } from "@/lib/platform/crm";
import { Avatar, Modal, PageHeading } from "./primitives";
import { downloadCsv, requestApi } from "./api";
import { useMutation, useResource } from "./use-resource";
import { ProspectFinder } from "./prospect-finder";
import { TenantAssociation } from "./tenant-association";


export function ProductionCrm() {
  const [query, setQuery] = useState(""), [stage, setStage] = useState(""), [source, setSource] = useState("");
  const [page, setPage] = useState(1), [formOpen, setFormOpen] = useState(false);
  const [finderOpen, setFinderOpen] = useState(false);
  const [editing, setEditing] = useState<LeadDto | null>(null), [selected, setSelected] = useState<LeadDto | null>(null);
  const [message, setMessage] = useState(""), [notice, setNotice] = useState("");
  const params = new URLSearchParams({ page: String(page), pageSize: "25", ...(query ? { query } : {}), ...(stage ? { stage } : {}), ...(source ? { source } : {}) });
  const data = useResource<PageDto<LeadDto>>(`/api/platform/admin/management/leads?${params}`);
  const mutation = useMutation();
  const selectionGeneration = useRef(0);
  useEffect(() => () => { selectionGeneration.current++; }, []);
  async function openLead(lead: LeadDto) {
    if (mutation.busy) return;
    const generation = ++selectionGeneration.current;
    setSelected(null);
    try {
      const latest = await requestApi<LeadDto>(`/api/platform/admin/management/leads/${lead.id}`);
      if (generation !== selectionGeneration.current) return;
      setSelected(latest); setMessage(`Olá, pessoal da ${latest.businessName}! Gostaria de apresentar o MeuCorteJá. Podemos conversar?`); mutation.clearError();
    } catch (cause) {
      if (generation === selectionGeneration.current) setNotice(cause instanceof Error ? cause.message : "Falha ao abrir.");
    }
  }
  function closeLead() { selectionGeneration.current++; setSelected(null); }
  async function saveLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const fields = new FormData(event.currentTarget);
    const text = (key: string) => String(fields.get(key) ?? "").trim();
    const payload = { businessName: text("businessName"), contactName: text("contactName"), city: text("city"), neighborhood: text("neighborhood"), whatsapp: text("whatsapp") || null, instagram: text("instagram") || null, website: text("website") || null, source: text("source"), nextContactAt: text("nextContactAt") || null, notes: text("notes"), ...(editing ? { version: editing.version } : {}) };
    try {
      const saved = await mutation.mutate<LeadDto>(editing ? `/api/platform/admin/management/leads/${editing.id}` : "/api/platform/admin/management/leads", editing ? "PATCH" : "POST", payload);
      if (!saved) return; setFormOpen(false); setEditing(null); data.reload(); setNotice("Lead salvo no banco da plataforma.");
    } catch {}
  }
  const filterChanged = (set: (value: string) => void, value: string) => { set(value); setPage(1); };
  return <><PageHeading eyebrow="RELACIONAMENTOS" title="CRM comercial" description="Contatos e atividades salvos no banco da plataforma." actions={<><button className="button button-secondary" onClick={() => setFinderOpen(true)}>Prospectar barbearias</button><button className="button button-secondary" onClick={async () => { try { const filters = new URLSearchParams({ ...(query ? { query } : {}), ...(stage ? { stage } : {}), ...(source ? { source } : {}) }); await downloadCsv(`/api/platform/admin/management/exports/leads?${filters}`); } catch (cause) { setNotice(cause instanceof Error ? cause.message : "Falha na exportação."); } }}>Exportar leads</button><button className="button button-primary" onClick={() => { mutation.clearError(); setEditing(null); setFormOpen(true); }}>Novo lead</button></>} />
    <ProspectFinder open={finderOpen} onClose={() => setFinderOpen(false)} onSaved={data.reload} />
    {notice && <p role="status" className="production-notice">{notice}</p>}
    <section className="panel production-panel"><div className="production-filters"><label className="field grow">Buscar leads<input value={query} onChange={(e) => filterChanged(setQuery, e.target.value)} placeholder="Barbearia, contato ou cidade" /></label><label className="field">Etapa do filtro<select value={stage} onChange={(e) => filterChanged(setStage, e.target.value)}><option value="">Todas as etapas</option>{stages.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label><label className="field">Origem do filtro<select value={source} onChange={(e) => filterChanged(setSource, e.target.value)}><option value="">Todas as origens</option>{sources.map((item) => <option key={item}>{item}</option>)}</select></label></div>
      {data.loading ? <p role="status">Carregando leads…</p> : data.error ? <div role="alert"><p>{data.error}</p><button className="button button-secondary" onClick={data.reload}>Tentar novamente</button></div> : data.value && <><p className="field-help">{data.value.total} {data.value.total === 1 ? "lead encontrado" : "leads encontrados"}</p><div className="production-list">{data.value.items.map((lead) => <button key={lead.id} className="production-lead" onClick={() => void openLead(lead)}><Avatar initials={getInitials(lead.businessName)} /><span className="grow"><strong>{lead.businessName}</strong><small>{lead.contactName || "Contato não informado"}{lead.city && ` · ${lead.city}`}</small></span><span className="stage-pill">{stages.find((item) => item.id === lead.stage)?.label}</span><span className="desktop-only">{lead.source}</span></button>)}</div>{!data.value.items.length && <p className="empty-inline">Nenhum lead corresponde aos filtros. Cadastre um contato ou ajuste a busca.</p>}<div className="production-actions"><button className="button button-secondary" disabled={page === 1} onClick={() => setPage((n) => n - 1)}>Página anterior</button><span>Página {page}</span><button className="button button-secondary" disabled={page * data.value.pageSize >= data.value.total} onClick={() => setPage((n) => n + 1)}>Próxima página</button></div></>}
    </section>
    <Modal open={formOpen} onClose={() => { if (!mutation.busy) setFormOpen(false); }} title={editing ? "Editar lead" : "Novo lead"} description="Registre somente os contatos que você já possui." wide>
      <form className="lead-form" onSubmit={saveLead} key={editing?.id ?? "new"}><fieldset disabled={mutation.busy} className="production-fieldset"><div className="form-grid">
        <label className="field field-full">Nome da barbearia<input name="businessName" defaultValue={editing?.businessName} required maxLength={200} /></label>
        <label className="field">Nome do contato<input name="contactName" defaultValue={editing?.contactName} maxLength={200} /></label>
        <label className="field">WhatsApp<input name="whatsapp" type="tel" defaultValue={editing?.whatsapp ?? ""} placeholder="+55, DDD e número" maxLength={40} /></label>
        <label className="field">Cidade<input name="city" defaultValue={editing?.city} maxLength={120} /></label>
        <label className="field">Bairro<input name="neighborhood" defaultValue={editing?.neighborhood} maxLength={120} /></label>
        <label className="field">Instagram<input name="instagram" defaultValue={editing?.instagram ?? ""} maxLength={200} /></label>
        <label className="field">Site<input name="website" type="url" defaultValue={editing?.website ?? ""} maxLength={2048} /></label>
        <label className="field">Origem<select name="source" defaultValue={editing?.source ?? "Outro"}>{sources.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label className="field">Próximo contato<input name="nextContactAt" type="date" defaultValue={editing?.nextContactAt ?? ""} /></label>
        <label className="field field-full">Observações<textarea name="notes" defaultValue={editing?.notes} rows={3} maxLength={10000} /></label>
      </div>{mutation.error && <p role="alert" className="form-error">{mutation.error}</p>}<div className="form-footer"><p>O responsável é definido pela sua conta.</p><button className="button button-primary" type="submit">{mutation.busy ? "Salvando…" : "Salvar lead"}</button></div></fieldset></form>
    </Modal>
    <Modal open={!!selected} onClose={() => { if (!mutation.busy) closeLead(); }} title={selected?.businessName ?? "Lead"} description={selected ? `Responsável: ${selected.ownerName}` : undefined} wide>
      {selected && <div key={selected.id} className="production-detail"><p>{selected.contactName || "Contato não informado"} · {selected.city || "Cidade não informada"}</p><p>{selected.notes}</p>
        <form className="production-filters" onSubmit={async (event) => { event.preventDefault(); const values = new FormData(event.currentTarget); try { const updated = await mutation.mutate<LeadDto>(`/api/platform/admin/management/leads/${selected.id}`, "PATCH", { stage: String(values.get("stage")), version: selected.version }); if (updated) { setSelected(current => current?.id === updated.id && current.version <= updated.version ? updated : current); data.reload(); } } catch {} }}>
          <label className="field grow">Etapa<select name="stage" defaultValue={selected.stage} key={selected.version} disabled={mutation.busy}>{stages.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label><button className="button button-secondary" disabled={mutation.busy}>Salvar etapa</button>
        </form>
        <div className="production-actions"><button className="button button-secondary" disabled={mutation.busy} onClick={() => { setEditing(selected); closeLead(); mutation.clearError(); setFormOpen(true); }}>Editar lead</button><button className="button button-secondary" disabled={mutation.busy} onClick={async () => { if (!window.confirm("Excluir este lead e suas atividades?")) return; try { await mutation.mutate(`/api/platform/admin/management/leads/${selected.id}`, "DELETE", { version: selected.version }); setSelected(null); data.reload(); setNotice("Lead excluído."); } catch {} }}>Excluir lead</button></div>
        <TenantAssociation lead={selected} onSaved={(lead) => { setSelected((current) => current?.id === lead.id && current.version <= lead.version ? lead : current); data.reload(); }} />
        <div className="production-actions">{selected.website && <a className="text-link" href={selected.website} target="_blank" rel="noopener noreferrer">Abrir site</a>}{selected.instagram && <span>Instagram: {selected.instagram}</span>}</div>
        <form className="lead-form" onSubmit={async (event) => { event.preventDefault(); const form = event.currentTarget, values = new FormData(form); try { const updated = await mutation.mutate<LeadDto>(`/api/platform/admin/management/leads/${selected.id}/activities`, "POST", { description: String(values.get("description")), contact: values.get("contact") === "on" }); if (updated) { setSelected(current => current?.id === updated.id && current.version <= updated.version ? updated : current); data.reload(); if (form.isConnected) form.reset(); } } catch {} }}><label className="field">Registrar atividade<textarea name="description" required maxLength={5000} rows={2} /></label><label><input type="checkbox" name="contact" /> Este registro é um contato realizado</label><button className="button button-secondary" disabled={mutation.busy}>Registrar atividade</button></form>
        {mutation.error && <p className="form-error" role="alert">{mutation.error} Feche e abra o lead novamente se houver uma edição mais recente.</p>}
        <div className="production-activities">{selected.activities.map((item) => <div key={item.id}><p>{item.description}</p><small>{item.actorName} · {new Date(item.occurredAt).toLocaleString("pt-BR", { timeZone: "America/Bahia" })}</small></div>)}</div>
        <label className="field">Mensagem para revisar<textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={3} /></label>
        {buildWhatsappLink(selected.whatsapp ?? undefined, message) ? <a className="button button-primary" target="_blank" rel="noopener noreferrer" href={buildWhatsappLink(selected.whatsapp ?? undefined, message)!}>Abrir WhatsApp</a> : <button className="button button-secondary" disabled>Abrir WhatsApp — informe um número válido</button>}
      </div>}
    </Modal>
  </>;
}
