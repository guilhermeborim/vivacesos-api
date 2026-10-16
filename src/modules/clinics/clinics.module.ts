import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SecurityModule } from '../../security/security.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { ClinicUsersModule } from '../clinic-users/clinic-users.module.js';
import { UsersModule } from '../users/users.module.js';
import { ClinicsController } from './clinics.controller.js';
import { ClinicsRepository } from './clinics.repository.js';
import { ClinicsService } from './clinics.service.js';
import { Clinic } from './entities/clinic.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Clinic]),
    SecurityModule,
    AuthModule,
    UsersModule,
    ClinicUsersModule,
  ],
  controllers: [ClinicsController],
  providers: [ClinicsService, ClinicsRepository],
  exports: [ClinicsRepository],
})
export class ClinicsModule {}
