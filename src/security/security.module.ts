import { PasswordHasher } from '@nestjs/authentication';
import { Module } from '@nestjs/common';
import { ConfigModule, type ConfigType } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import appConfig from '../config/app.config.js';
import jwtConfig from '../config/jwt.config.js';
import { CryptoService } from './crypto.service.js';
import { TokenService } from './token.service.js';

@Module({
  imports: [
    ConfigModule.forFeature(appConfig),
    ConfigModule.forFeature(jwtConfig),
    JwtModule.registerAsync({
      imports: [ConfigModule.forFeature(jwtConfig)],
      inject: [jwtConfig.KEY],
      useFactory: (jwt: ConfigType<typeof jwtConfig>) => ({
        secret: jwt.secret,
        signOptions: {
          algorithm: 'HS256',
          expiresIn: jwt.expiresInSeconds,
          issuer: jwt.issuer,
          audience: jwt.audience,
        },
        verifyOptions: {
          algorithms: ['HS256'],
          issuer: jwt.issuer,
          audience: jwt.audience,
        },
      }),
    }),
  ],
  providers: [
    TokenService,
    CryptoService,
    { provide: PasswordHasher, useFactory: () => new PasswordHasher() },
  ],
  exports: [TokenService, CryptoService, PasswordHasher],
})
export class SecurityModule {}
