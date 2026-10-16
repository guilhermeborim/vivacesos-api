import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ClinicUserRole } from '../../common/enums/clinic-user-role.enum.js';
import { ClinicUsersRepository } from '../clinic-users/clinic-users.repository.js';
import {
  type NewNotification,
  NotificationsRepository,
} from './notifications.repository.js';

export type NotificationDraft = Omit<NewNotification, 'clinicId' | 'userId'>;

const SAO_PAULO = 'America/Sao_Paulo';
const LIST_LIMIT = 30;

/** "dd/mm HH:mm" no fuso da clínica, para as mensagens. */
export const formatWhen = (date: Date) =>
  new Date(date).toLocaleString('pt-BR', {
    timeZone: SAO_PAULO,
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

export const formatMoney = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

@Injectable()
export class NotificationsService {
  constructor(
    private readonly notifications: NotificationsRepository,
    private readonly clinicUsers: ClinicUsersRepository,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  /** Avisa usuários específicos (sem repetir e sem avisar quem causou o evento). */
  async notifyUsers(
    clinicId: string,
    userIds: (string | null | undefined)[],
    draft: NotificationDraft,
    exceptUserId?: string,
  ) {
    const recipients = [...new Set(userIds)].filter(
      (id): id is string => !!id && id !== exceptUserId,
    );
    await this.notifications.createMany(
      recipients.map((userId) => ({ ...draft, clinicId, userId })),
    );
  }

  /** Avisa todos os usuários ativos da clínica com algum dos papéis. */
  async notifyRoles(
    clinicId: string,
    roles: ClinicUserRole[],
    draft: NotificationDraft,
    exceptUserId?: string,
  ) {
    const userIds = await this.clinicUsers.findActiveUserIdsByRoles(
      clinicId,
      roles,
    );
    await this.notifyUsers(clinicId, userIds, draft, exceptUserId);
  }

  async list(clinicId: string, userId: string) {
    const [items, unreadCount] = await Promise.all([
      this.notifications.findByUser(clinicId, userId, LIST_LIMIT),
      this.notifications.countUnread(clinicId, userId),
    ]);
    return {
      unreadCount,
      items: items.map((n) => ({
        notificationId: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        link: n.link,
        read: n.readAt !== null,
        createdAt: n.createdAt,
      })),
    };
  }

  async markRead(clinicId: string, userId: string, id: string) {
    // Já lida também é sucesso; 404 só se a notificação não for deste usuário.
    if (!(await this.notifications.exists(clinicId, userId, id))) {
      throw new NotFoundException('Notificação não encontrada!');
    }
    await this.notifications.markRead(clinicId, userId, id);
  }

  clearAll(clinicId: string, userId: string) {
    return this.notifications.deleteAllByUser(clinicId, userId);
  }

  markAllRead(clinicId: string, userId: string) {
    return this.notifications.markAllRead(clinicId, userId);
  }

  /**
   * Despesas pendentes que vencem hoje ou venceram nos últimos 30 dias avisam os ADMIN
   * uma única vez cada (chave de deduplicação).
   */
  async notifyDueExpenses() {
    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: SAO_PAULO,
    }).format(new Date());
    const rows = await this.dataSource.query<
      {
        id: string;
        clinicId: string;
        description: string;
        amount: string;
        dueDate: string;
      }[]
    >(
      `SELECT id, "clinicId", description, amount, "dueDate"::text AS "dueDate"
       FROM expenses
       WHERE paid = false AND "dueDate" <= $1::date AND "dueDate" >= $1::date - 30`,
      [today],
    );

    for (const e of rows) {
      const dueToday = e.dueDate === today;
      const [year, month, day] = e.dueDate.split('-');
      await this.notifyRoles(e.clinicId, [ClinicUserRole.ADMIN], {
        type: dueToday ? 'EXPENSE_DUE' : 'EXPENSE_OVERDUE',
        title: dueToday ? 'Despesa vence hoje' : 'Despesa vencida',
        message: `${e.description} — ${formatMoney(Number(e.amount))}${
          dueToday ? '' : ` (venceu em ${day}/${month}/${year})`
        }`,
        link: '/despesas',
        data: { expenseId: e.id },
        dedupeKey: `${dueToday ? 'expense-due' : 'expense-overdue'}:${e.id}`,
      });
    }
  }

  deleteOld() {
    return this.notifications.deleteOld();
  }
}
