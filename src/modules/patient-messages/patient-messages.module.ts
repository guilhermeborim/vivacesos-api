import { Module } from '@nestjs/common';
import { SecurityModule } from '../../security/security.module.js';
import { AppointmentsModule } from '../appointments/appointments.module.js';
import { ClinicUsersModule } from '../clinic-users/clinic-users.module.js';
import { IntegrationsModule } from '../integrations/integrations.module.js';
import { UsersModule } from '../users/users.module.js';
import { AppointmentLinkService } from './appointment-link.service.js';
import { PatientMessagesController } from './patient-messages.controller.js';
import { PatientMessagesService } from './patient-messages.service.js';
import { PublicAppointmentsController } from './public-appointments.controller.js';
import { PublicAppointmentsService } from './public-appointments.service.js';

@Module({
  imports: [
    SecurityModule,
    UsersModule,
    ClinicUsersModule,
    AppointmentsModule,
    IntegrationsModule,
  ],
  controllers: [PatientMessagesController, PublicAppointmentsController],
  providers: [
    AppointmentLinkService,
    PatientMessagesService,
    PublicAppointmentsService,
  ],
})
export class PatientMessagesModule {}
