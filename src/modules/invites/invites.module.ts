import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MailModule } from '../../mail/mail.module.js';
import { SecurityModule } from '../../security/security.module.js';
import { ClinicUsersModule } from '../clinic-users/clinic-users.module.js';
import { UsersModule } from '../users/users.module.js';
import { ClinicInvite } from './entities/clinic-invite.entity.js';
import { InvitesController } from './invites.controller.js';
import { InvitesRepository } from './invites.repository.js';
import { InvitesService } from './invites.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([ClinicInvite]),
    SecurityModule,
    MailModule,
    UsersModule,
    ClinicUsersModule,
  ],
  controllers: [InvitesController],
  providers: [InvitesService, InvitesRepository],
  exports: [InvitesRepository],
})
export class InvitesModule {}
