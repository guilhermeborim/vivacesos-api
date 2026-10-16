import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { ClinicUserRole } from '../../common/enums/clinic-user-role.enum.js';
import { ClinicInvite } from './entities/clinic-invite.entity.js';

export interface NewInvite {
  clinicId: string;
  email: string;
  role: ClinicUserRole;
  token: string;
  expiresAt: Date;
}

@Injectable()
export class InvitesRepository {
  constructor(
    @InjectRepository(ClinicInvite)
    private readonly repository: Repository<ClinicInvite>,
  ) {}

  create(invite: NewInvite) {
    return this.repository.save(invite);
  }

  findByEmail(email: string) {
    return this.repository.findOne({ where: { email } });
  }

  findById(clinicId: string, id: string) {
    return this.repository.findOne({
      where: { clinicId, id },
      relations: { clinic: true },
    });
  }

  /** Novo token e nova validade (reenvio do convite). */
  async renew(id: string, token: string, expiresAt: Date) {
    await this.repository.update(id, { token, expiresAt });
  }

  findByToken(token: string) {
    return this.repository.findOne({
      where: { token },
      relations: { clinic: true },
    });
  }

  async markAccepted(id: string) {
    await this.repository.update(id, {
      accepted: true,
      acceptedAt: new Date(),
    });
  }

  async delete(id: string) {
    await this.repository.delete(id);
  }
}
