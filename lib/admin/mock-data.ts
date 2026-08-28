import type { Service } from './types'

export const mockServices: Service[] = [
  { id: '1', name: 'Corte + barba', category: 'Barba', duration: 40, price: 35, active: true },
  { id: '2', name: 'Corte comum', category: 'Cabelo', duration: 30, price: 25, active: true },
  { id: '3', name: 'Barba', category: 'Barba', duration: 20, price: 15, active: true },
  { id: '4', name: 'Corte + barba', category: 'Cabelo', duration: 40, price: 35, active: false },
]
