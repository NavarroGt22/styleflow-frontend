export type LeadStage = "new"|"contacted"|"interested"|"demo"|"negotiation"|"converted"|"lost"|"discarded";
export interface ActivityDto {
  id: string; kind: string; description: string; actorId: string; actorName: string; occurredAt: string;
}
export interface LeadDto {
  linkedTenant?: { name: string; slug: string; isActive: boolean; deletedAt: string | null } | null;
  id: string; businessName: string; contactName: string; city: string; neighborhood: string;
  whatsapp: string | null; instagram: string | null; website: string | null;
  stage: LeadStage; source: string; ownerId: string; ownerName: string;
  nextContactAt: string | null; lastContactAt: string | null; linkedTenantId: string | null;
  notes: string; version: number; createdAt: string; updatedAt: string; activities: ActivityDto[];
}
export interface TaskDto {
  id: string; leadId: string | null; title: string; dueDate: string; status: "open" | "completed";
  ownerId: string; ownerName: string; version: number; completedAt: string | null; createdAt: string; updatedAt: string;
}
export interface MessageTemplateDto {
  id: string; name: string; body: string; ownerId: string; version: number; createdAt: string; updatedAt: string;
}
export interface PageDto<T> { items: T[]; total: number; page: number; pageSize: number }
