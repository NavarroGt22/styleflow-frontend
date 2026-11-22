/** Contratos propostos para a UI. Ainda não correspondem à API operacional. */
export type Stage = "new" | "contacted" | "interested" | "demo" | "negotiation" | "converted" | "lost" | "discarded";
export type Section = "visao-geral" | "crm" | "barbearias" | "financeiro" | "relatorios" | "configuracoes" | "suporte";
export type DataState = "unconfigured" | "loading" | "error" | "empty";
export interface Activity { id: string; description: string; occurredAt: string }
export interface Lead {
  id: string;
  businessName: string;
  contactName: string;
  city: string;
  neighborhood: string;
  whatsapp?: string;
  instagram?: string;
  website?: string;
  stage: Stage;
  source: string;
  owner: string;
  createdAt: string;
  nextContactAt?: string;
  lastContactAt?: string;
  linkedTenantId?: string;
  notes: string;
  activities: Activity[];
}
export interface TenantSummary {
  id: string; name: string; slug: string; contactName: string;
  status: "active" | "overdue" | "blocked"; plan: string;
  monthlyCents: number; dueDate: string; balanceCents: number;
}
export interface Expense {
  id: string; title: string; category: string; amountMinor: number;
  currency: "BRL" | "USD"; competenceMonth: string; paidAt?: string;
  recurring: boolean; exchangeRateToBRL?: string;
}
export interface OverviewSummary {
  period: string; updatedAt: string; activeTenants: number; totalTenants: number;
  mrrCents: number; receivedCents: number; pendingCents: number;
  paidExpensesCents: number | null; cashResultCents: number | null;
}
export type Resource<T> = { state: "ready"; data: T; updatedAt: string } | { state: DataState; message?: string };
