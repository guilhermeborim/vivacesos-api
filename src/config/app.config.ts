import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  isProduction: process.env.NODE_ENV === 'PROD',
  port: Number(process.env.PORT) || 3334,
  corsOrigin: (process.env.CORS_ORIGIN ?? 'http://localhost:5173').split(','),
  cookieSecret: process.env.COOKIE_SECRET!,
  cryptoSecretKey: process.env.CRYPTO_SECRET_KEY!,
  resendApiKey: process.env.RESEND_API_KEY || undefined,
  appUrl: (process.env.APP_URL || 'http://localhost:5173').replace(/\/+$/, ''),
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || undefined,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || undefined,
    redirectUri: process.env.GOOGLE_REDIRECT_URI || undefined,
    // Endpoints configuráveis só para testes com um servidor falso; o padrão é o Google real.
    authUrl:
      process.env.GOOGLE_AUTH_URL ||
      'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl:
      process.env.GOOGLE_TOKEN_URL || 'https://oauth2.googleapis.com/token',
    revokeUrl:
      process.env.GOOGLE_REVOKE_URL || 'https://oauth2.googleapis.com/revoke',
    apiUrl:
      process.env.GOOGLE_API_URL || 'https://www.googleapis.com/calendar/v3',
  },
  mailFrom: process.env.MAIL_FROM || 'Vivace SOS <convites@vivacesos.com.br>',
}));
