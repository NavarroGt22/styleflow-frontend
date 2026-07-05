import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { TenantBranding } from '../hooks/useTenant';

export type SalonSummary = {
  id: string;
  name: string;
  slug: string;
  tenantId?: string;
};

export type AppUser = {
  id: string;
  name: string;
  role: string;
  tenantId?: string | null;
  tenant?: TenantBranding | null;
  salons?: SalonSummary[];
  professionalProfile?: any;
};

type AppContextValue = {
  user: AppUser | null;
  tenant: TenantBranding | null;
  salons: SalonSummary[];
  activeSalon: SalonSummary | null;
  setSession: (user: AppUser, token: string, refreshToken: string) => void;
  setActiveSalon: (salon: SalonSummary | null) => void;
  refreshSalons: (salons: SalonSummary[], tenant?: TenantBranding | null) => void;
  clearSession: () => void;
};

const AppContext = createContext<AppContextValue | null>(null);

function readStoredUser(): AppUser | null {
  try {
    const raw = sessionStorage.getItem('user');
    return raw && raw !== 'undefined' ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(() => readStoredUser());
  const [activeSalon, setActiveSalonState] = useState<SalonSummary | null>(() => {
    const stored = readStoredUser();
    return stored?.salons?.[0] ?? null;
  });

  const tenant = user?.tenant ?? null;
  const salons = user?.salons ?? [];

  const persistUser = useCallback((nextUser: AppUser) => {
    sessionStorage.setItem('user', JSON.stringify(nextUser));
    setUser(nextUser);
  }, []);

  const setSession = useCallback(
    (nextUser: AppUser, token: string, refreshToken: string) => {
      sessionStorage.setItem('token', token);
      sessionStorage.setItem('refreshToken', refreshToken);
      persistUser(nextUser);
      setActiveSalonState(nextUser.salons?.[0] ?? null);
    },
    [persistUser]
  );

  const setActiveSalon = useCallback((salon: SalonSummary | null) => {
    setActiveSalonState(salon);
  }, []);

  const refreshSalons = useCallback(
    (nextSalons: SalonSummary[], nextTenant?: TenantBranding | null) => {
      if (!user) return;
      const updated = {
        ...user,
        salons: nextSalons,
        tenant: nextTenant ?? user.tenant ?? null,
      };
      persistUser(updated);
      if (!activeSalon || !nextSalons.some((s) => s.id === activeSalon.id)) {
        setActiveSalonState(nextSalons[0] ?? null);
      }
    },
    [user, activeSalon, persistUser]
  );

  const clearSession = useCallback(() => {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('refreshToken');
    sessionStorage.removeItem('user');
    setUser(null);
    setActiveSalonState(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      tenant,
      salons,
      activeSalon,
      setSession,
      setActiveSalon,
      refreshSalons,
      clearSession,
    }),
    [user, tenant, salons, activeSalon, setSession, setActiveSalon, refreshSalons, clearSession]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useAppContext deve ser usado dentro de AppProvider');
  }
  return ctx;
}

export function useAppContextOptional() {
  return useContext(AppContext);
}
