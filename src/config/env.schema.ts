import { z } from 'zod';

const seconds = z.coerce.number().int().positive();

export const envSchema = z.object({
  NODE_ENV: z.string().default('DEV'),
  PORT: z.coerce.number().int().positive().default(3334),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),

  DATABASE_HOST: z.string().min(1),
  DATABASE_PORT: z.coerce.number().int().positive(),
  DATABASE_USER: z.string().min(1),
  DATABASE_PASSWORD: z.string().min(1),
  DATABASE_NAME: z.string().min(1),
  // 'true' liga SSL na conexão com o Postgres (exigido por provedores gerenciados, ex. Neon).
  DATABASE_SSL: z.string().optional(),

  JWT_SECRET: z.string().min(32),
  JWT_EXPIRY: seconds,
  JWT_REFRESH_EXPIRY: seconds,
  JWT_ISSUER: z.string().min(1),
  JWT_AUDIENCE: z.string().min(1),

  COOKIE_SECRET: z.string().min(1),
  CRYPTO_SECRET_KEY: z.string().min(32),
  RESEND_API_KEY: z.string().optional(),
  APP_URL: z.url().default('http://localhost:5173'),
  // Google Agenda (opcional): sem estas variáveis o botão "Conectar" avisa que não está configurado.
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().optional(),
  MAIL_FROM: z.string().default('Vivace SOS <convites@vivacesos.com.br>'),
});
