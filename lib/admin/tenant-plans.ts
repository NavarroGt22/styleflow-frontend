export type TenantLevel = 'FREE' | 'BASIC' | 'PRO' | 'ENTERPRISE'

export const TENANT_LEVEL_LABELS: Record<TenantLevel, string> = {
  FREE: 'Grátis',
  BASIC: 'Básico',
  PRO: 'Pro',
  ENTERPRISE: 'Enterprise',
}

export const TENANT_LEVEL_FEES: Record<TenantLevel, number> = {
  FREE: 0,
  BASIC: 99,
  PRO: 199,
  ENTERPRISE: 499,
}

export const TENANT_LEVEL_COLORS: Record<TenantLevel, string> = {
  FREE: 'bg-slate-500/20 text-slate-300',
  BASIC: 'bg-blue-500/20 text-blue-300',
  PRO: 'bg-violet-500/20 text-violet-300',
  ENTERPRISE: 'bg-amber-500/20 text-amber-300',
}
