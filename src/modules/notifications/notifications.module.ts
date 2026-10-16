import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SecurityModule } from '../../security/security.module.js';
import { ClinicUsersModule } from '../clinic-users/clinic-users.module.js';
import { UsersModule } from '../users/users.module.js';
import { Notification } from './entities/notification.entity.js';
import { NotificationsController } from './notifications.controller.js';
import { NotificationsJobs } from './notifications.jobs.js';
import { NotificationsListener } from './notifications.listener.js';
import { NotificationsRepository } from './notifications.repository.js';
import { NotificationsService } from './notifications.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification]),
    SecurityModule,
    UsersModule,
    ClinicUsersModule,
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationsRepository,
    NotificationsListener,
    NotificationsJobs,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
