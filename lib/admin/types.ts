export type AdminTab =
  | 'services'
  | 'agenda'
  | 'cancelados'
  | 'financeiro'
  | 'equipe'
  | 'estoque'
  | 'fila'
  | 'salao'
  | 'clientes'
  | 'crm'

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
  couponId?: string | null
  discountPercent?: number | null
  discountAmount?: number | null
  quotedPrice?: number | null
  customer?: { user?: { name?: string; phone?: string } }
  service?: { name?: string; price?: number }
  professional?: { user?: { name?: string } }
}

export type CanceledAppointmentsResult = {
  date: string
  /** Dono/super admin pode escolher de qual profissional quer ver; funcionário vê só o dele. */
  canSelectProfessional: boolean
  professionalId: string | null
  items: (Appointment & { professionalId?: string })[]
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

export type FinancialScope = 'SALON' | 'PROFESSIONAL'

export type FinancialSummary = {
  period: { from: string; to: string }
  professionalId: string | null
  scope: FinancialScope
  services: {
    gross: number
    net: number
    commission: number
    commissionRate: number | null
    appointments: number
  }
  /** "N/P" no app: venda de produto do estoque, fora do serviço. */
  products: { revenue: number; quantity: number }
  expenses: number
}

export type FinancialDailyPoint = {
  day: number
  date: string
  appointments: number
  gross: number
  net: number
  products: number
}

export type FinancialDailySeries = {
  month: string
  professionalId: string | null
  days: FinancialDailyPoint[]
}

export type FinancialServiceRow = {
  serviceId: string | null
  name: string
  category: string | null
  count: number
  gross: number
}

export type FinancialServicesReport = {
  period: { from: string; to: string }
  professionalId: string | null
  services: FinancialServiceRow[]
  categories: { category: string; count: number; gross: number }[]
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
  cep?: string | null
  latitude?: number | null
  longitude?: number | null
  queueRadiusMeters?: number
  openTime?: string
  closeTime?: string
  openWeekdays?: number[]
  closedDayMessage?: string | null
  bookingCalendarMode?: 'WEEK' | 'TODAY'
  bookingLinkEnabled?: boolean
  bookingMaxDaysAhead?: number
  bookingMinAdvanceMinutes?: number
  bookingAllowClientCancel?: boolean
  bookingAllowClientReschedule?: boolean
  bookingCancelMinMinutes?: number
  bookingSuccessGif?: boolean
  bookingExtraText?: string | null
  /** Texto do compartilhamento do "Meu link". Aceita {link} e {estabelecimento}. */
  bookingShareMessage?: string | null
  /** Cor só da página pública de agendamento; vazio usa a cor da marca do tenant. */
  bookingPrimaryColor?: string | null
  instagramUrl?: string | null
  queueMode?: boolean
  queueAutoAdvance?: boolean
  queueAllowClientView?: boolean
  queueNotifyClient?: boolean
  queueNotifyAhead?: number
  appointmentRemindMinutes?: number
  queueAllowSkip?: boolean
  queueSkipTimeoutMin?: number
  whatsappTemplate?: string | null
  whatsappBookingTemplate?: string | null
  whatsappCancelSalonTemplate?: string | null
  whatsappCancelClientTemplate?: string | null
  whatsappRescheduleTemplate?: string | null
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
    clientDomain?: string | null
    customDomain?: string | null
    adminDomain?: string | null
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
