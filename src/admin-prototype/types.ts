export type AdminTab = 'services' | 'agenda' | 'financeiro' | 'equipe' | 'fila' | 'salao';

export type Service = {
  id: number;
  name: string;
  category: string;
  duration: number;
  price: number;
  active: boolean;
};

export type AdminDashboardProps = {
  brandName?: string;
  unitName?: string;
  ownerName?: string;
  onLogout?: () => void;
};
