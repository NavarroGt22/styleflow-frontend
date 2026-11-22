"use client";
import { useState } from "react";
import type { LeadDto } from "@/lib/platform/contracts/crm";
import type { TenantAccessDirectory } from "@/lib/platform/contracts/tenant-access";
import { useMutation, useResource } from "./use-resource";

export function TenantAssociation({ lead, onSaved }: { lead: LeadDto; onSaved: (lead: LeadDto) => void }) {
  const [expanded, setExpanded] = useState(false);
  const mutation = useMutation();
  async function unlink() { try { const result = await mutation.mutate<LeadDto>(`/api/platform/admin/management/leads/${lead.id}`, "PATCH", { version: lead.version, linkedTenantId: null }); if (result) onSaved(result); } catch {} }
  return <section className="prospect-review"><h3>Conta vinculada</h3><p className="field-help">{lead.linkedTenantId ? `Conta: ${lead.linkedTenant?.name ?? "Vínculo registrado"}${lead.linkedTenant?.slug ? ` · ${lead.linkedTenant.slug}` : ""}${lead.linkedTenant?.deletedAt ? " · Excluída" : lead.linkedTenant?.isActive === false ? " · Inativa" : ""}. O vínculo permanece no histórico.` : "Nenhuma conta vinculada. Converter um lead não cria uma barbearia na plataforma."}</p>
    <div className="production-actions"><button className="button button-secondary" disabled={mutation.busy} onClick={() => setExpanded((current) => !current)}>{expanded ? "Fechar seleção" : "Selecionar conta existente"}</button>{lead.linkedTenantId && <button className="button button-secondary" disabled={mutation.busy} onClick={() => void unlink()}>Remover vínculo</button>}</div>
    {mutation.error && <p className="form-error" role="alert">{mutation.error}</p>}
    {expanded && <TenantSelector lead={lead} onSaved={onSaved} />}
  </section>;
}
function TenantSelector({ lead, onSaved }: { lead: LeadDto; onSaved: (lead: LeadDto) => void }) {
  const [query, setQuery] = useState(""), [search, setSearch] = useState(""), [cursors, setCursors] = useState<string[]>([]);
  const params = new URLSearchParams({ limit: "50", ...(search ? { query: search } : {}), ...(cursors.length ? { cursor: cursors[cursors.length - 1] } : {}) });
  const directory = useResource<TenantAccessDirectory>(`/api/platform/admin/management/tenants?${params}`), mutation = useMutation();
  return <><form className="production-filters" onSubmit={(event) => { event.preventDefault(); setSearch(query.trim()); setCursors([]); }}><label className="field grow">Buscar conta existente<input value={query} maxLength={120} onChange={(event) => setQuery(event.target.value)} /></label><button className="button button-secondary">Buscar contas</button></form>
    {directory.loading ? <p role="status">Consultando contas…</p> : directory.error ? <p role="alert">{directory.error}</p> : directory.value && <>
      <form className="production-filters" key={`${search}:${cursors.join()}`} onSubmit={async (event) => { event.preventDefault(); const tenantId = String(new FormData(event.currentTarget).get("tenant")); try { const updated = await mutation.mutate<LeadDto>(`/api/platform/admin/management/leads/${lead.id}`, "PATCH", { version: lead.version, linkedTenantId: tenantId }); if (updated) onSaved(updated); } catch {} }}>
        <label className="field grow">Barbearia da plataforma<select name="tenant" required defaultValue="" disabled={mutation.busy}><option value="" disabled>Selecione uma conta</option>{directory.value.items.map((tenant) => <option value={tenant.id} disabled={!tenant.isActive || !!tenant.deletedAt} key={tenant.id}>{tenant.name} · {tenant.slug}{tenant.deletedAt ? " · Excluída" : !tenant.isActive ? " · Inativa" : ""}</option>)}</select></label><button className="button button-primary" disabled={mutation.busy}>{mutation.busy ? "Vinculando…" : "Vincular conta"}</button>
      </form>{!directory.value.items.length && <p>Nenhuma conta corresponde à busca.</p>}
      <div className="production-actions"><button className="button button-secondary" disabled={!cursors.length} onClick={() => setCursors((items) => items.slice(0, -1))}>Contas anteriores</button><button className="button button-secondary" disabled={!directory.value.nextCursor} onClick={() => { if (directory.value?.nextCursor) setCursors((items) => [...items, directory.value!.nextCursor!]); }}>Mais contas</button></div>
    </>}{mutation.error && <p role="alert" className="form-error">{mutation.error}</p>}
  </>;
}
