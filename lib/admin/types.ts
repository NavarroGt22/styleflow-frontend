export type AdminTab = 'services' | 'agenda' | 'financeiro' | 'equipe' | 'estoque' | 'fila' | 'salao' | 'clientes'

export type Product = {
  id: string
  name: string
  price: number
  costPrice?: number | null
  stockQuantity: number
  minStockAlert: number
  isActive: boolean
  isReward?: boolean
  description?: string | null
  deletedAt?: string | null
  soldQuantity?: number
  revenue?: number
  costTotal?: number
  profit?: number
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
  completedCuts?: number
  period?: { from: string | null; to: string | null }
  recentRecords: Array<{
    id: string
    amount: number
    isExpense: boolean
    createdAt: string
    appointment?: {
      service?: { name?: string }
      professional?: { user?: { name?: string } }
    }
    productSale?: {
      product?: { name?: string }
      professional?: { user?: { name?: string } }
    }
  }>
}

export type AdminTabProps = {
  salonId?: string
  lightMode?: boolean
  ownerUserId?: string
  salonSlug?: string
  initialSalonSubTab?: 'general' | 'temas' | 'expediente' | 'comissao' | 'fila'
  onNavigateTab?: (tab: AdminTab, options?: { salonSubTab?: 'general' | 'temas' | 'expediente' | 'comissao' | 'fila' }) => void
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
  openWeekdays?: number[]
  closedDayMessage?: string | null
  instagramUrl?: string | null
  queueMode?: boolean
  queueAutoAdvance?: boolean
  queueAllowClientView?: boolean
  queueNotifyClient?: boolean
  queueNotifyAhead?: number
  queueAllowSkip?: boolean
  queueSkipTimeoutMin?: number
  whatsappTemplate?: string | null
  whatsappGatewayUrl?: string | null
  whatsappGatewayToken?: string | null
  ownerId?: string
  productCommissionEnabled?: boolean
  productCommissionRate?: number
  loyaltyResetMode?: 'LIFETIME' | 'MONTHLY'
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

export type LoyaltyRewardType = 'CUSTOM_TEXT' | 'FREE_CUT' | 'PRODUCT'

export type LoyaltyReward = {
  id: string
  title: string
  description?: string | null
  cutsRequired: number
  rewardType: LoyaltyRewardType
  productId?: string | null
  groupId?: string | null
  isActive: boolean
  product?: { id: string; name: string; stockQuantity: number; isReward?: boolean } | null
}

export type SalonCustomer = {
  id: string
  userId: string
  name: string
  email: string
  phone?: string | null
  isActive: boolean
  completedCuts: number
  availableRewards: Array<{
    earnId: string
    rewardId: string
    title: string
    rewardType: LoyaltyRewardType
    cutsAtEarn: number
    periodKey: string
  }>
}

export type CustomersListResponse = {
  loyaltyResetMode: 'LIFETIME' | 'MONTHLY'
  periodKey: string
  summary: {
    totalCustomers: number
    totalCutsInPeriod: number
    availableRewards: number
  }
  customers: SalonCustomer[]
}
