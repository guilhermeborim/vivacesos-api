import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SecurityModule } from '../../security/security.module.js';
import { ClinicUsersModule } from '../clinic-users/clinic-users.module.js';
import { UsersModule } from '../users/users.module.js';
import { ClinicSettings } from './entities/clinic-settings.entity.js';
import { SettingsController } from './settings.controller.js';
import { SettingsRepository } from './settings.repository.js';
import { SettingsService } from './settings.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([ClinicSettings]),
    SecurityModule,
    UsersModule,
    ClinicUsersModule,
  ],
  controllers: [SettingsController],
  providers: [SettingsService, SettingsRepository],
  exports: [SettingsRepository],
})
export class SettingsModule {}
