export type QueueEntry = {
  id: string
  position: number
  estimatedStart: string
  actualStart?: string
  status: string
  serviceName?: string
  serviceDuration?: number
  customerName: string
  isCurrentUser?: boolean
}

export type QueueSession = {
  sessionId: string
  professionalName: string
  services: Array<{
    id: string
    name: string
    price: number
    duration?: number
    isActive?: boolean
  }>
  entries: QueueEntry[]
}
