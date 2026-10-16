import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CLINIC_USER_LOOKUP } from '../../common/tokens/lookups.js';
import { SecurityModule } from '../../security/security.module.js';
import { UsersModule } from '../users/users.module.js';
import { ClinicUsersController } from './clinic-users.controller.js';
import { ClinicUsersRepository } from './clinic-users.repository.js';
import { ClinicUsersService } from './clinic-users.service.js';
import { ClinicUser } from './entities/clinic-user.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([ClinicUser]),
    SecurityModule,
    UsersModule,
  ],
  controllers: [ClinicUsersController],
  providers: [
    ClinicUsersService,
    ClinicUsersRepository,
    { provide: CLINIC_USER_LOOKUP, useExisting: ClinicUsersRepository },
  ],
  exports: [ClinicUsersRepository, CLINIC_USER_LOOKUP],
})
export class ClinicUsersModule {}
