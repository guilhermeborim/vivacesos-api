import { Module } from '@nestjs/common';
import { SecurityModule } from '../../security/security.module.js';
import { ClinicUsersModule } from '../clinic-users/clinic-users.module.js';
import { ProfessionalsModule } from '../professionals/professionals.module.js';
import { UsersModule } from '../users/users.module.js';
import { DashboardController } from './dashboard.controller.js';
import { DashboardRepository } from './dashboard.repository.js';
import { DashboardService } from './dashboard.service.js';

@Module({
  imports: [
    SecurityModule,
    UsersModule,
    ClinicUsersModule,
    ProfessionalsModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardService, DashboardRepository],
})
export class DashboardModule {}
