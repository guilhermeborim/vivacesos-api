import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Notification } from './entities/notification.entity.js';

export interface NewNotification {
  clinicId: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  data?: Record<string, string>;
  dedupeKey?: string;
}

/** Cada usuário só enxerga as próprias notificações (escopo por `userId` e clínica). */
@Injectable()
export class NotificationsRepository {
  constructor(
    @InjectRepository(Notification)
    private readonly repository: Repository<Notification>,
  ) {}

  /** Insere ignorando duplicatas de `dedupeKey` (índice único parcial). */
  async createMany(list: NewNotification[]) {
    if (!list.length) return;
    await this.repository
      .createQueryBuilder()
      .insert()
      .values(list)
      .orIgnore()
      .execute();
  }

  findByUser(clinicId: string, userId: string, limit: number) {
    return this.repository.find({
      where: { clinicId, userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  countUnread(clinicId: string, userId: string) {
    return this.repository.count({
      where: { clinicId, userId, readAt: IsNull() },
    });
  }

  exists(clinicId: string, userId: string, id: string) {
    return this.repository.exists({ where: { id, clinicId, userId } });
  }

  async markRead(clinicId: string, userId: string, id: string) {
    const result = await this.repository.update(
      { id, clinicId, userId, readAt: IsNull() },
      { readAt: new Date() },
    );
    return result.affected ?? 0;
  }

  async markAllRead(clinicId: string, userId: string) {
    await this.repository.update(
      { clinicId, userId, readAt: IsNull() },
      { readAt: new Date() },
    );
  }

  /** Apaga todas as notificações do usuário (botão "Limpar notificações"). */
  async deleteAllByUser(clinicId: string, userId: string) {
    await this.repository.delete({ clinicId, userId });
  }

  /** Lidas há mais de 30 dias e quaisquer com mais de 90 dias. */
  async deleteOld() {
    await this.repository.query(
      `DELETE FROM notifications
       WHERE ("readAt" IS NOT NULL AND "readAt" < now() - interval '30 days')
          OR "createdAt" < now() - interval '90 days'`,
    );
  }
}
