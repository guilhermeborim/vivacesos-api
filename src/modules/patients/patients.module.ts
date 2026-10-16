import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SecurityModule } from '../../security/security.module.js';
import { ClinicUsersModule } from '../clinic-users/clinic-users.module.js';
import { UsersModule } from '../users/users.module.js';
import { Patient } from './entities/patient.entity.js';
import { PatientsController } from './patients.controller.js';
import { PatientsRepository } from './patients.repository.js';
import { PatientsService } from './patients.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Patient]),
    SecurityModule,
    UsersModule,
    ClinicUsersModule,
  ],
  controllers: [PatientsController],
  providers: [PatientsService, PatientsRepository],
  exports: [PatientsRepository],
})
export class PatientsModule {}
