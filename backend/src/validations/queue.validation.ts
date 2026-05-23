import { z } from 'zod';

export const openQueueSessionSchema = z.object({
  professionalId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de data inválido. Use YYYY-MM-DD.'),
});

export const reorderQueueSchema = z.object({
  entryId: z.string().uuid(),
  newPosition: z.number().int().min(1),
  reason: z.string().optional(),
});

export const skipQueueEntrySchema = z.object({
  reason: z.string().optional(),
});

export const addWalkInSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres.'),
  phone: z.string().optional(),
  serviceId: z.string().uuid('ID de serviço inválido.'),
});

export const joinQueueSchema = z.object({
  serviceId: z.string().uuid('ID de serviço inválido.'),
});


