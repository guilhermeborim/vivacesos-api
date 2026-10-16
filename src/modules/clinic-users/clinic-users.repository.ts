import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ClinicUserRole } from '../../common/enums/clinic-user-role.enum.js';
import { ClinicUserStatus } from '../../common/enums/clinic-user-status.enum.js';
import type { ClinicUserLookup } from '../../common/tokens/lookups.js';
import { ClinicUser } from './entities/clinic-user.entity.js';

export interface BindClinicUser {
  userId: string;
  clinicId: string;
  role: ClinicUserRole;
  status: ClinicUserStatus;
}

export interface ClinicUserListItem {
  clinicUserId: string;
  userId: string | null;
  role: ClinicUserRole;
  status: ClinicUserStatus;
  createdAt: Date;
  user: { userId: string; name: string; email: string } | null;
  invite: { email: string; accepted: boolean; expiresAt: Date } | null;
}

@Injectable()
export class ClinicUsersRepository implements ClinicUserLookup {
  constructor(
    @InjectRepository(ClinicUser)
    private readonly repository: Repository<ClinicUser>,
  ) {}

  bind(clinicUser: BindClinicUser) {
    return this.repository.save(clinicUser);
  }

  getUserBindedClinic(clinicId: string, userId: string) {
    return this.repository.findOne({
      where: { clinicId, userId },
      relations: { user: true, clinic: true },
    });
  }

  async updateStatus(
    clinicId: string,
    userId: string,
    status: ClinicUserStatus,
  ) {
    await this.repository.update({ clinicId, userId }, { status });
  }

  /** Usuários vinculados à clínica + convites não aceitos (status INVITADO; `invite.expiresAt` diz se expirou). */
  getUsersByClinic(clinicId: string): Promise<ClinicUserListItem[]> {
    return this.repository.query(
      `
      SELECT
        cu.id               AS "clinicUserId",
        cu."userId",
        cu.role::varchar    AS role,
        cu.status::varchar  AS status,
        cu."createdAt",
        json_build_object('userId', u.id, 'name', u.name, 'email', u.email) AS "user",
        NULL                AS "invite"
      FROM clinic_users cu
      INNER JOIN users u ON cu."userId" = u.id
      WHERE cu."clinicId" = $1

      UNION ALL

      SELECT
        ci.id               AS "clinicUserId",
        NULL                AS "userId",
        ci.role::varchar    AS role,
        'INVITADO'::varchar AS status,
        ci."createdAt",
        NULL                AS "user",
        json_build_object(
          'email', ci.email,
          'accepted', ci.accepted,
          'expiresAt', ci."expiresAt"
        )                   AS "invite"
      FROM clinic_invites ci
      WHERE ci."clinicId" = $1
        AND ci.accepted = false

      ORDER BY "createdAt" DESC
      `,
      [clinicId],
    );
  }

  /** IDs dos usuários ATIVOS da clínica com algum dos papéis (destinatários de notificações). */
  async findActiveUserIdsByRoles(clinicId: string, roles: ClinicUserRole[]) {
    const rows = await this.repository.find({
      where: { clinicId, status: ClinicUserStatus.ATIVO, role: In(roles) },
      select: { userId: true },
    });
    return rows.map((r) => r.userId);
  }

  getClinicsByUser(userId: string) {
    return this.repository.find({
      where: { userId },
      relations: { clinic: true },
    });
  }
}
