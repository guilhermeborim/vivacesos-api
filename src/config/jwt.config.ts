import { registerAs } from '@nestjs/config';

export default registerAs('jwt', () => ({
  secret: process.env.JWT_SECRET!,
  expiresInSeconds: Number(process.env.JWT_EXPIRY),
  refreshExpiresInSeconds: Number(process.env.JWT_REFRESH_EXPIRY),
  issuer: process.env.JWT_ISSUER!,
  audience: process.env.JWT_AUDIENCE!,
}));
