import { z } from 'zod';
import dotenv from 'dotenv';
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3333),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  REDIS_URL: z.string().optional(),
});


const _env = envSchema.safeParse(process.env);
if (!_env.success) {
  console.error('❌ ERRO NAS VARIÁVEIS DE AMBIENTE:', _env.error.format());
  process.exit(1);
}
export const env = _env.data;
