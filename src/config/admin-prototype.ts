/** Ambiente de teste do painel admin v0 (protótipo visual com dados mock). */

export function isAdminPrototypeEnabled(): boolean {
  return import.meta.env.VITE_ADMIN_PROTOTYPE === 'true';
}

export function isAdminPrototypeSlug(slug: string): boolean {
  const raw = import.meta.env.VITE_ADMIN_PROTOTYPE_SLUGS ?? 'leleco';
  const slugs = raw
    .split(',')
    .map((s: string) => s.trim().toLowerCase())
    .filter(Boolean);
  return slugs.includes(slug.trim().toLowerCase());
}

export type AdminPrototypePreset = {
  brandName: string;
  unitName: string;
  ownerName: string;
};

const PRESETS: Record<string, AdminPrototypePreset> = {
  leleco: {
    brandName: 'Leleco',
    unitName: 'Leleco Barbes',
    ownerName: 'Joel',
  },
};

export function getAdminPrototypePreset(slug: string): AdminPrototypePreset {
  const key = slug.trim().toLowerCase();
  return (
    PRESETS[key] ?? {
      brandName: slug,
      unitName: slug,
      ownerName: 'Visitante',
    }
  );
}
