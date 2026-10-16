import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { ClinicUserRole } from '../../common/enums/clinic-user-role.enum.js';
import { MailService } from '../../mail/mail.service.js';
import { UsersRepository } from '../users/users.repository.js';
import { InvitesRepository } from './invites.repository.js';
import type { CreateInviteDto } from './schemas/create-invite.schema.js';

const INVITE_TTL_MS = 24 * 60 * 60 * 1000;

const ROLE_LABELS: Record<ClinicUserRole, string> = {
  [ClinicUserRole.ADMIN]: 'Administrador',
  [ClinicUserRole.PROFISSIONAL]: 'Profissional',
  [ClinicUserRole.RECEPCIONISTA]: 'Recepcionista',
};

const newToken = () => randomBytes(32).toString('hex');
const newExpiry = () => new Date(Date.now() + INVITE_TTL_MS);

@Injectable()
export class InvitesService {
  constructor(
    private readonly invites: InvitesRepository,
    private readonly users: UsersRepository,
    private readonly mail: MailService,
  ) {}

  async create(
    clinicId: string,
    inviterId: string,
    { email, role }: CreateInviteDto,
  ) {
    if (await this.users.findByEmail(email)) {
      throw new ConflictException(
        'Este E-mail já está cadastrado em nossa base!',
      );
    }

    const existing = await this.invites.findByEmail(email);
    if (existing) {
      if (existing.accepted) {
        throw new ForbiddenException(
          'Este e-mail já aceitou seu convite. Não é possível convidar novamente!',
        );
      }
      if (existing.expiresAt > new Date()) {
        throw new ForbiddenException(
          'Este e-mail já foi convidado. Aguardando o usuário aceitar o convite! Use “Reenviar convite” se precisar.',
        );
      }
      await this.invites.delete(existing.id);
    }

    const invite = await this.invites.create({
      clinicId,
      email,
      role,
      token: newToken(),
      expiresAt: newExpiry(),
    });

    return this.deliver(clinicId, inviterId, invite.id);
  }

  /** Gera novo link, renova as 24h e envia o e-mail de novo. */
  async resend(clinicId: string, inviterId: string, inviteId: string) {
    const invite = await this.invites.findById(clinicId, inviteId);
    if (!invite) throw new NotFoundException('Convite não encontrado!');
    if (invite.accepted) {
      throw new ConflictException('Este convite já foi aceito!');
    }

    await this.invites.renew(invite.id, newToken(), newExpiry());
    return this.deliver(clinicId, inviterId, invite.id);
  }

  /** Envia o e-mail do convite. Se falhar, o convite continua salvo (`emailSent: false`). */
  private async deliver(clinicId: string, inviterId: string, inviteId: string) {
    const invite = await this.invites.findById(clinicId, inviteId);
    if (!invite) throw new NotFoundException('Convite não encontrado!');
    const inviter = await this.users.findById(inviterId);

    const emailSent = await this.mail.sendInvite(invite.email, {
      token: invite.token,
      clinicName: invite.clinic.name,
      inviterName: inviter?.name ?? 'Um administrador',
      roleLabel: ROLE_LABELS[invite.role],
      expiresAt: invite.expiresAt,
    });

    return {
      id: invite.id,
      email: invite.email,
      role: invite.role,
      expiresAt: invite.expiresAt,
      emailSent,
    };
  }

  /** Consulta pública do convite (o token é o segredo): só o necessário para a tela de aceite. */
  async findByToken(token: string) {
    const invite = await this.invites.findByToken(token);
    if (!invite) throw new NotFoundException('Convite não encontrado!');

    return {
      email: invite.email,
      role: invite.role,
      accepted: invite.accepted,
      expiresAt: invite.expiresAt,
      clinicName: invite.clinic.name,
    };
  }
}
