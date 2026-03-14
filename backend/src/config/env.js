import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  FRONTEND_URL: z.string().url(),
  FRONTEND_URLS: z.string().optional(),
  SESSION_SECRET: z.string().min(16),
  APP_ENCRYPTION_KEY: z.string().regex(/^[a-fA-F0-9]{64}$/),
  SVP_API_BASE_URL: z.string().url(),
  SVP_LOCALE: z.string().default('en'),
  TRUST_PROXY: z.coerce.number().default(0),
  RAILWAY_PRIVATE_DOMAIN: z.string().optional(),
});

export const env = envSchema.parse(process.env);
export const isProd = env.NODE_ENV === 'production';
