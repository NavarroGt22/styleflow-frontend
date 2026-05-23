import { z } from 'zod';

const noHtmlRegex = /^[^<>]*$/;
const phoneRegex = /^\d{10,15}$/;

export const createEstablishmentSchema = z.object({
  name: z.string().min(3).regex(noHtmlRegex, "Caracteres inválidos."),
  slug: z.string().min(3).regex(/^[a-z0-9-]+$/, "Slug deve conter apenas letras minúsculas, números e hífens."),
  phone: z.string().regex(phoneRegex, "Telefone inválido."),
  email: z.string().email(),
  address: z.string().regex(noHtmlRegex).optional(),
  openTime: z.string().regex(/^\d{2}:\d{2}$/, "Horário de abertura inválido (formato HH:MM).").optional(),
  closeTime: z.string().regex(/^\d{2}:\d{2}$/, "Horário de fechamento inválido (formato HH:MM).").optional(),
  businessHours: z.any().optional(), // Em produção, refinar para um schema de horários
  productCommissionEnabled: z.boolean().optional(),
  productCommissionRate: z.coerce.number().min(0).max(100).optional(),
  instagramUrl: z.string().regex(noHtmlRegex, "URL/Handle do Instagram possui caracteres inválidos.").nullable().optional(),
  queueMode: z.boolean().optional(),
  queueAutoAdvance: z.boolean().optional(),
  queueAllowClientView: z.boolean().optional(),
  queueNotifyClient: z.boolean().optional(),
  queueNotifyAhead: z.coerce.number().int().min(1).max(20).optional(),
  queueAllowSkip: z.boolean().optional(),
  queueSkipTimeoutMin: z.coerce.number().int().min(1).max(120).optional(),
  whatsappTemplate: z.string().max(500, "Template muito longo.").optional(),
  whatsappGatewayUrl: z.string().url("URL do Gateway inválida.").or(z.literal("")).nullable().optional(),
  whatsappGatewayToken: z.string().nullable().optional(),
});

export const updateEstablishmentSchema = createEstablishmentSchema.partial();

