export type AdminTab = 'services' | 'agenda' | 'financeiro' | 'equipe' | 'estoque' | 'fila' | 'salao'

export type Product = {
  id: string
  name: string
  price: number
  stockQuantity: number
  minStockAlert: number
  isActive: boolean
  description?: string | null
}

export type Service = {
  id: string
  name: string
  category: string
  duration: number
  price: number
  active: boolean
  description?: string | null
}

export type Appointment = {
  id: string
  status: string
  startTime: string
  endTime?: string | null
  customer?: { user?: { name?: string; phone?: string } }
  service?: { name?: string; price?: number }
  professional?: { user?: { name?: string } }
}

export type Professional = {
  id: string
  userId?: string
  commissionRate: number
  workStart: string
  workEnd: string
  queueMode?: boolean
  isActive?: boolean
  user?: { id?: string; name?: string; email?: string; phone?: string | null; role?: string }
}

export type FinancialDashboard = {
  totalRevenue: number
  totalCommissions: number
  netProfit: number
  recentRecords: Array<{
    id: string
    amount: number
    isExpense: boolean
    createdAt: string
    appointment?: { service?: { name?: string } }
    productSale?: { product?: { name?: string } }
  }>
}

export type AdminTabProps = {
  salonId?: string
  lightMode?: boolean
  ownerUserId?: string
  salonSlug?: string
  onNavigateTab?: (tab: AdminTab) => void
}

export type QueueEntry = {
  id: string
  position: number
  status: string
  estimatedStart?: string | null
  actualStart?: string | null
  clientName?: string
  customerName?: string
  serviceName?: string
  serviceDuration?: number
  customer?: { user?: { name?: string; phone?: string } }
  service?: { name?: string; duration?: number; price?: number }
  appointment?: Appointment & {
    customer?: { user?: { name?: string; phone?: string } }
    service?: { name?: string; duration?: number; price?: number }
  }
}

export type SalonSettings = {
  id: string
  name: string
  slug: string
  phone?: string | null
  address?: string | null
  openTime?: string
  closeTime?: string
  instagramUrl?: string | null
  queueMode?: boolean
  queueAutoAdvance?: boolean
  queueAllowClientView?: boolean
  queueNotifyClient?: boolean
  queueNotifyAhead?: number
  queueAllowSkip?: boolean
  queueSkipTimeoutMin?: number
  whatsappTemplate?: string | null
  ownerId?: string
  productCommissionEnabled?: boolean
  productCommissionRate?: number
  tenant?: {
    id?: string
    name?: string
    slug?: string
    subdomain?: string | null
    primaryColor?: string
    customBrandName?: string | null
    historyText?: string | null
    logoUrl?: string | null
    heroImageUrl?: string | null
    faviconUrl?: string | null
    lpSinceYear?: number | null
  }
}

export type QueueSession = {
  id: string
  status?: string
  date: string
  isOpen?: boolean
  entries?: QueueEntry[]
  professional?: { user?: { name?: string } }
}

export type AdminDashboardProps = {
  salonSlug?: string
  brandName?: string
  unitName?: string
  ownerName?: string
  salonId?: string
  primaryColor?: string
  useMock?: boolean
}
