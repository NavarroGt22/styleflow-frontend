import { z } from 'zod';

export const createAppointmentSchema = z.object({
  salonId: z.string().uuid(),
  professionalId: z.string().uuid(),
  serviceId: z.string().uuid(),
  startTime: z.string().datetime(), // Formato ISO 8601 (ex: 2026-05-18T14:00:00Z)
  endTime: z.string().datetime()
});
