export type TenantAccessReason = "inactive" | "deleted" | "no_salon" | "invalid_salon_slug" | null;
export interface TenantAccessItem {
  id: string; name: string; slug: string; isActive: boolean; deletedAt: string | null;
  primarySalonSlug: string | null; adminUrl: string | null;
  supportAvailable: boolean; unavailableReason: TenantAccessReason;
}
export interface TenantAccessDirectory {
  items: TenantAccessItem[]; nextCursor: string | null; collectedAt: string;
  source: "saas_access_directory";
}
export interface SupportEntry {
  code: string; sessionId: string; codeExpiresAt: string; expiresAt: string; enterUrl: string;
}
