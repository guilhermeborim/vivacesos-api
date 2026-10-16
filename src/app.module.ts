import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { minutes, ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import appConfig from './config/app.config.js';
import databaseConfig from './config/database.config.js';
import { envSchema } from './config/env.schema.js';
import jwtConfig from './config/jwt.config.js';
import { AppointmentsModule } from './modules/appointments/appointments.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { ClinicUsersModule } from './modules/clinic-users/clinic-users.module.js';
import { DashboardModule } from './modules/dashboard/dashboard.module.js';
import { FinanceModule } from './modules/finance/finance.module.js';
import { InvitesModule } from './modules/invites/invites.module.js';
import { MedicalRecordsModule } from './modules/medical-records/medical-records.module.js';
import { NotificationsModule } from './modules/notifications/notifications.module.js';
import { IntegrationsModule } from './modules/integrations/integrations.module.js';
import { PatientMessagesModule } from './modules/patient-messages/patient-messages.module.js';
import { SettingsModule } from './modules/settings/settings.module.js';
import { PatientsModule } from './modules/patients/patients.module.js';
import { ProfessionalsModule } from './modules/professionals/professionals.module.js';
import { ClinicsModule } from './modules/clinics/clinics.module.js';
import { DatabaseModule } from './database/database.module.js';
import { HealthModule } from './health/health.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, jwtConfig],
      validationSchema: envSchema,
    }),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: minutes(5), limit: 100 }],
    }),
    DatabaseModule,
    HealthModule,
    AuthModule,
    ClinicUsersModule,
    InvitesModule,
    ProfessionalsModule,
    PatientsModule,
    AppointmentsModule,
    FinanceModule,
    MedicalRecordsModule,
    DashboardModule,
    NotificationsModule,
    SettingsModule,
    IntegrationsModule,
    PatientMessagesModule,
    // Por último: `GET /clinic/:clinicId` não pode capturar `/clinic/users` e `/clinic/professionals`.
    ClinicsModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
