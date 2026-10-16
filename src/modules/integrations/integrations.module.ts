import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SecurityModule } from '../../security/security.module.js';
import { ClinicUsersModule } from '../clinic-users/clinic-users.module.js';
import { UsersModule } from '../users/users.module.js';
import { AppointmentsModule } from '../appointments/appointments.module.js';
import { ProfessionalsModule } from '../professionals/professionals.module.js';
import { GoogleCalendarClient } from './google/google-calendar.client.js';
import {
  GoogleCalendarController,
  GoogleCallbackController,
} from './google/google-calendar.controller.js';
import { GoogleCalendarListener } from './google/google-calendar.listener.js';
import { GoogleCalendarService } from './google/google-calendar.service.js';
import { ManualChannel } from './channels/manual.channel.js';
import { PATIENT_MESSAGE_CHANNEL } from './channels/patient-message-channel.js';
import { ClinicIntegration } from './entities/clinic-integration.entity.js';
import { IntegrationsController } from './integrations.controller.js';
import { IntegrationsRepository } from './integrations.repository.js';
import { IntegrationsService } from './integrations.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([ClinicIntegration]),
    SecurityModule,
    UsersModule,
    ClinicUsersModule,
    AppointmentsModule,
    ProfessionalsModule,
  ],
  controllers: [
    IntegrationsController,
    GoogleCalendarController,
    GoogleCallbackController,
  ],
  providers: [
    IntegrationsService,
    IntegrationsRepository,
    GoogleCalendarClient,
    GoogleCalendarService,
    GoogleCalendarListener,
    // Trocar por ZApiChannel quando a integração automática existir.
    { provide: PATIENT_MESSAGE_CHANNEL, useClass: ManualChannel },
  ],
  exports: [IntegrationsRepository, PATIENT_MESSAGE_CHANNEL],
})
export class IntegrationsModule {}
