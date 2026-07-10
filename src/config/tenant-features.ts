import type { TenantLevel } from './tenant-plans';

export type TenantFeatureSet = {
  maxStaff: number;
  canCreateServices: boolean;
  tabs: {
    services: boolean;
    agenda: boolean;
    financials: boolean;
    team: boolean;
    inventory: boolean;
    queue: boolean;
    settings: boolean;
  };
  scheduleMode: boolean;
  settingsTabs: {
    general: boolean;
    themes: boolean;
    expediente: boolean;
    commissions: boolean;
    queue: boolean;
  };
  whatsappAutomation: boolean;
  timecardWidget: boolean;
  shiftHistory: boolean;
  teamTimecards: boolean;
  aiAdvisor: boolean;
};

export const TENANT_FEATURES: Record<TenantLevel, TenantFeatureSet> = {
  FREE: {
    maxStaff: 0,
    canCreateServices: false,
    tabs: {
      services: true,
      agenda: true,
      financials: true,
      team: false,
      inventory: false,
      queue: true,
      settings: true,
    },
    scheduleMode: true,
    settingsTabs: {
      general: true,
      themes: true,
      expediente: true,
      commissions: false,
      queue: true,
    },
    whatsappAutomation: false,
    timecardWidget: false,
    shiftHistory: false,
    teamTimecards: false,
    aiAdvisor: false,
  },
  BASIC: {
    maxStaff: 1,
    canCreateServices: true,
    tabs: {
      services: true,
      agenda: true,
      financials: true,
      team: true,
      inventory: false,
      queue: true,
      settings: true,
    },
    scheduleMode: true,
    settingsTabs: {
      general: true,
      themes: true,
      expediente: true,
      commissions: false,
      queue: true,
    },
    whatsappAutomation: false,
    timecardWidget: false,
    shiftHistory: false,
    teamTimecards: false,
    aiAdvisor: false,
  },
  PRO: {
    maxStaff: 3,
    canCreateServices: true,
    tabs: {
      services: true,
      agenda: true,
      financials: true,
      team: true,
      inventory: true,
      queue: true,
      settings: true,
    },
    scheduleMode: true,
    settingsTabs: {
      general: true,
      themes: true,
      expediente: true,
      commissions: true,
      queue: true,
    },
    whatsappAutomation: true,
    timecardWidget: true,
    shiftHistory: true,
    teamTimecards: true,
    aiAdvisor: false,
  },
  ENTERPRISE: {
    maxStaff: 20,
    canCreateServices: true,
    tabs: {
      services: true,
      agenda: true,
      financials: true,
      team: true,
      inventory: true,
      queue: true,
      settings: true,
    },
    scheduleMode: true,
    settingsTabs: {
      general: true,
      themes: true,
      expediente: true,
      commissions: true,
      queue: true,
    },
    whatsappAutomation: true,
    timecardWidget: true,
    shiftHistory: true,
    teamTimecards: true,
    aiAdvisor: true,
  },
};

export function getTenantFeatures(level: TenantLevel = 'FREE'): TenantFeatureSet {
  return TENANT_FEATURES[level] ?? TENANT_FEATURES.FREE;
}

export const TENANT_LEVEL_UPGRADE_HINT: Record<TenantLevel, string> = {
  FREE: 'Faça upgrade para o plano Básico ou superior.',
  BASIC: 'Faça upgrade para o plano Pro ou superior.',
  PRO: 'Faça upgrade para o plano Enterprise.',
  ENTERPRISE: '',
};
