import { Module } from '@nestjs/common';
import { ClinicUsersModule } from '../clinic-users/clinic-users.module.js';
import { InvitesModule } from '../invites/invites.module.js';
import { ProfessionalsModule } from '../professionals/professionals.module.js';
import { RefreshTokensModule } from '../refresh-tokens/refresh-tokens.module.js';
import { SecurityModule } from '../../security/security.module.js';
import { UsersModule } from '../users/users.module.js';
import { AuthCookiesService } from './auth-cookies.service.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';

@Module({
  imports: [
    SecurityModule,
    UsersModule,
    ClinicUsersModule,
    InvitesModule,
    ProfessionalsModule,
    RefreshTokensModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthCookiesService],
  exports: [AuthService, AuthCookiesService],
})
export class AuthModule {}
