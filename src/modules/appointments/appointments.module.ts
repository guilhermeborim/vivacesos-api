import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SecurityModule } from '../../security/security.module.js';
import { ClinicUsersModule } from '../clinic-users/clinic-users.module.js';
import { PatientsModule } from '../patients/patients.module.js';
import { ProfessionalsModule } from '../professionals/professionals.module.js';
import { UsersModule } from '../users/users.module.js';
import { AppointmentsController } from './appointments.controller.js';
import { AppointmentsRepository } from './appointments.repository.js';
import { AppointmentsService } from './appointments.service.js';
import { Appointment } from './entities/appointment.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Appointment]),
    SecurityModule,
    UsersModule,
    ClinicUsersModule,
    PatientsModule,
    ProfessionalsModule,
  ],
  controllers: [AppointmentsController],
  providers: [AppointmentsService, AppointmentsRepository],
  exports: [AppointmentsRepository, AppointmentsService],
})
export class AppointmentsModule {}
