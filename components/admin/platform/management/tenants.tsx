"use client";
import { useEffect, useState } from "react";
import type { SupportEntry, TenantAccessDirectory, TenantAccessItem } from "@/lib/platform/contracts/tenant-access";
import { Avatar, Badge, Modal, PageHeading } from "./primitives";
import { getInitials } from "@/lib/platform/crm";
import { useMutation, useResource } from "./use-resource";
import { enterPlatformSupport } from "@/lib/platform/client";

const reasons = { inactive: "A conta está inativa.", deleted: "Esta conta foi excluída.", no_salon: "Nenhum salão está disponível para acesso.", invalid_salon_slug: "O identificador deste salão precisa ser revisado antes do suporte." };
export function ProductionTenants() {
  const [query, setQuery] = useState(""), [search, setSearch] = useState("");
  const [cursors, setCursors] = useState<string[]>([]), [selected, setSelected] = useState<TenantAccessItem | null>(null);
  const mutation = useMutation();
  const [entering, setEntering] = useState(false), [entryError, setEntryError] = useState("");
  const busy = entering || mutation.busy;
  useEffect(() => { const timer = setTimeout(() => { setSearch(query.trim()); setCursors([]); }, 300); return () => clearTimeout(timer); }, [query]);
  const params = new URLSearchParams({ limit: "50", ...(search ? { query: search } : {}), ...(cursors.length ? { cursor: cursors[cursors.length - 1] } : {}) });
  const directory = useResource<TenantAccessDirectory>(`/api/platform/admin/management/tenants?${params}`);
  return <><PageHeading eyebrow="CONTAS DA PLATAFORMA" title="Barbearias" description="Acesse uma conta por vez para prestar suporte ao cliente." />
    <section className="panel production-panel"><label className="field">Buscar barbearias<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nome ou identificador" maxLength={120} /></label>
      {directory.loading ? <p role="status">Consultando as contas…</p> : directory.error ? <div role="alert"><h2>Não foi possível consultar as contas</h2><p>{directory.error}</p><button className="button button-secondary" onClick={directory.reload}>Tentar novamente</button></div> : directory.value && <>
        <p className="field-help">Fonte: diretório de contas do MeuCorteJá · Atualizado em {new Date(directory.value.collectedAt).toLocaleString("pt-BR", { timeZone: "America/Bahia" })}. Contas inativas e excluídas aparecem identificadas.</p>
        <div className="production-list">{directory.value.items.map((tenant) => <article className="production-lead production-tenant" key={tenant.id}><Avatar initials={getInitials(tenant.name)} /><div className="grow"><h2>{tenant.name}</h2><small>{tenant.slug}</small><Badge tone={tenant.deletedAt ? "red" : tenant.isActive ? "green" : "amber"}>{tenant.deletedAt ? "Excluída" : tenant.isActive ? "Ativa" : "Inativa"}</Badge>{tenant.unavailableReason && <p className="field-help">{reasons[tenant.unavailableReason]}</p>}</div><div className="production-tenant-actions"><button className="button button-primary" disabled={!tenant.supportAvailable} aria-label={`Acessar como admin — ${tenant.name}`} onClick={() => { mutation.clearError(); setSelected(tenant); }}>Acessar como admin</button>{tenant.adminUrl && <a className="text-link" href={tenant.adminUrl}>Abrir painel na plataforma</a>}</div></article>)}</div>
        {!directory.value.items.length && <p className="empty-inline">Nenhuma conta corresponde à busca.</p>}
        <div className="production-actions"><button className="button button-secondary" disabled={!cursors.length} onClick={() => setCursors((items) => items.slice(0, -1))}>Página anterior</button><span>Página {cursors.length + 1} · {directory.value.items.length} contas</span><button className="button button-secondary" disabled={!directory.value.nextCursor} onClick={() => { if (directory.value?.nextCursor) setCursors((items) => [...items, directory.value!.nextCursor!]); }}>Próxima página</button></div>
      </>}
    </section><section className="panel production-panel"><h2>Acesso de suporte</h2><p>O botão inicia uma sessão temporária no painel daquela barbearia, mantendo seu acesso registrado como suporte. O cliente continua com a conta e a senha dele.</p><p className="field-help">A entrada e as operações disponíveis dependem da API e do painel de suporte habilitados no ambiente. Cobranças e planos continuam no Master.</p></section>
    <Modal open={!!selected} onClose={() => { if (!busy) setSelected(null); }} title={selected ? `Acessar ${selected.name}` : "Acessar conta"} description="Sessão de suporte por até 15 minutos, com registro do seu acesso.">
      {selected && <form className="lead-form" onSubmit={async (event) => {
        event.preventDefault(); const values = new FormData(event.currentTarget);
        if (busy) return;
        setEntering(true); setEntryError("");
        try {
          const entry = await mutation.mutate<SupportEntry>(`/api/platform/admin/tenants/${selected.id}/support-sessions`, "POST", { reason: String(values.get("reason")) });
          if (!entry) return;
          await enterPlatformSupport(entry);
        } catch (cause) { setEntryError(cause instanceof Error ? cause.message : "Falha ao iniciar o suporte."); }
        finally { setEntering(false); }
      }}><fieldset className="production-fieldset" disabled={busy}><label className="field">Motivo do acesso<textarea name="reason" required minLength={5} maxLength={500} rows={3} placeholder="Descreva a alteração solicitada pelo cliente." /></label><p className="field-help">Você entrará somente na conta {selected.name}. Ao terminar, use Encerrar suporte no painel.</p>{(entryError || mutation.error) && <p className="form-error" role="alert">{entryError || mutation.error}</p>}<button className="button button-primary" type="submit">{busy ? "Preparando acesso…" : "Entrar no painel como suporte"}</button></fieldset></form>}
    </Modal>
  </>;
}
