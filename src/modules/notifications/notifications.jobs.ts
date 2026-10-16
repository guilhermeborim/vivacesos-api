import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { NotificationsService } from './notifications.service.js';

const timeZone = 'America/Sao_Paulo';

@Injectable()
export class NotificationsJobs {
  private readonly logger = new Logger(NotificationsJobs.name);

  constructor(private readonly notifications: NotificationsService) {}

  /** Todo dia às 08:00 (Brasília): despesas vencendo hoje ou vencidas. */
  @Cron('0 0 8 * * *', { name: 'expense-due-notifications', timeZone })
  async notifyDueExpenses() {
    await this.notifications.notifyDueExpenses();
    this.logger.log('Avisos de despesas vencendo/vencidas processados.');
  }

  /** Todo dia às 03:30: limpa avisos antigos. */
  @Cron('0 30 3 * * *', { name: 'notifications-cleanup', timeZone })
  async cleanup() {
    await this.notifications.deleteOld();
  }
}
