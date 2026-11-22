import type { Lead, Stage } from "./contracts/gestao";

export const stages: { id: Stage; label: string; short: string; color: string }[] = [
  { id: "new", label: "Novo lead", short: "Novo", color: "#a3adb5" },
  { id: "contacted", label: "Primeiro contato", short: "Contato", color: "#7fa6e5" },
  { id: "interested", label: "Interessado", short: "Interesse", color: "#d9bf78" },
  { id: "demo", label: "Demonstração", short: "Demo", color: "#70c3bf" },
  { id: "negotiation", label: "Negociação", short: "Negociação", color: "#e5a177" },
  { id: "converted", label: "Convertido", short: "Convertido", color: "#c1ee80" },
  { id: "lost", label: "Perdido", short: "Perdido", color: "#e68d8d" },
  { id: "discarded", label: "Descartado", short: "Descartado", color: "#909b94" },
];
export const sources = ["Instagram", "Indicação", "Site", "Prospecção manual", "WhatsApp", "Outro"];
const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
export function filterLeads(leads: Lead[], filters: { query?: string; stage?: string; source?: string }): Lead[] {
  const query = normalize(filters.query ?? "");
  return leads.filter((lead) => (!query || normalize([lead.businessName, lead.contactName, lead.city, lead.neighborhood].join(" ")).includes(query)) && (!filters.stage || filters.stage === "all" || lead.stage === filters.stage) && (!filters.source || filters.source === "all" || lead.source === filters.source));
}
export function getInitials(name: string) { return name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join("") || "?"; }
export function stageProgress(stage: Stage) { const index = stages.slice(0, 6).findIndex((s) => s.id === stage); return index < 0 ? 0 : index * 20; }
export function canOpenWhatsapp(phone?: string): boolean {
  if (!phone) return false;
  const digits = phone.replace(/\D/g, "");
  return /^55[1-9]{2}(?:[2-5]\d{7}|9\d{8})$/.test(digits);
}
export function buildWhatsappLink(phone: string | undefined, message: string): string | null { return canOpenWhatsapp(phone) ? `https://wa.me/${phone!.replace(/\D/g, "")}?text=${encodeURIComponent(message)}` : null; }
export const defaultMessage = (lead: Pick<Lead, "businessName">) => `Olá, pessoal da ${lead.businessName}! Prazer, sou Rafael, proprietário do MeuCorteJá. Desenvolvi um sistema de agendamento que ajuda barbearias a organizar horários e a gestão do negócio. Se quiser conhecer, acesse https://www.meucorteja.com/ . Posso te mostrar como funciona e tirar suas dúvidas.`;
