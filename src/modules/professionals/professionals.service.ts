import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ClinicUsersRepository } from '../clinic-users/clinic-users.repository.js';
import {
  CLINIC_USER_STATUS_CHANGED,
  type ClinicUserStatusChangedEvent,
} from '../clinic-users/events/clinic-user-status-changed.event.js';
import { ClinicUserRole } from '../../common/enums/clinic-user-role.enum.js';
import { ClinicUserStatus } from '../../common/enums/clinic-user-status.enum.js';
import { CryptoService } from '../../security/crypto.service.js';
import { ProfessionalType } from './enums/professional-type.enum.js';
import type { Professional } from './entities/professional.entity.js';
import { ProfessionalsRepository } from './professionals.repository.js';
import type {
  RegisterProfessionalDto,
  RegisterProfessionalOnboardingDto,
  UpdateProfessionalDto,
} from './schemas/professional.schema.js';

/** CRM sem pontuação/espaços e em maiúsculas, para o hash ser estável. */
const normalizeCrm = (crm: string) =>
  crm.replace(/[^0-9a-z]/gi, '').toUpperCase();

/** Quem consulta: define se o percentual de repasse aparece (ADMIN e o próprio profissional). */
export interface ProfessionalViewer {
  id: string;
  role: ClinicUserRole | undefined;
}

@Injectable()
export class ProfessionalsService {
  private readonly crmCrypto;

  constructor(
    private readonly professionals: ProfessionalsRepository,
    private readonly clinicUsers: ClinicUsersRepository,
    crypto: CryptoService,
  ) {
    this.crmCrypto = crypto.forField('professional:crm');
  }

  /** Falha com 409 se o CRM já existe na clínica (usado antes de criar usuário e perfil juntos). */
  async assertCrmAvailable(clinicId: string, crm: string) {
    const crmHash = this.crmCrypto.hash(normalizeCrm(crm));
    if (await this.professionals.findByCrmHash(clinicId, crmHash)) {
      throw new ConflictException('Este CRM já está cadastrado nesta clínica!');
    }
  }

  /** Perfil de profissional de um usuário que acabou de entrar na clínica por convite. */
  registerForInvitedUser(
    clinicId: string,
    userId: string,
    input: { type?: ProfessionalType; crm: string; specialty: string },
  ) {
    return this.create(clinicId, userId, input);
  }

  /** ADMIN cadastra um usuário já vinculado à clínica ativa como profissional. */
  async register(clinicId: string, input: RegisterProfessionalDto) {
    const bound = await this.clinicUsers.getUserBindedClinic(
      clinicId,
      input.userId,
    );
    if (!bound) {
      throw new NotFoundException('Usuário não está vinculado a esta clínica!');
    }
    return this.create(clinicId, input.userId, input);
  }

  /** Onboarding: o próprio usuário, numa clínica em que já está vinculado e ativo. */
  async registerOnboarding(
    userId: string,
    input: RegisterProfessionalOnboardingDto,
  ) {
    const bound = await this.clinicUsers.getUserBindedClinic(
      input.clinicId,
      userId,
    );
    if (!bound || bound.status !== ClinicUserStatus.ATIVO) {
      throw new ForbiddenException('Usuário não autorizado para esta clínica!');
    }
    return this.create(input.clinicId, userId, input);
  }

  async findByClinic(clinicId: string, viewer?: ProfessionalViewer) {
    const list = await this.professionals.findByClinic(clinicId);
    return list.map((p) => this.toResponse(p, viewer));
  }

  async findById(clinicId: string, id: string, viewer?: ProfessionalViewer) {
    return this.toResponse(await this.getOrFail(clinicId, id), viewer);
  }

  /** ADMIN edita qualquer profissional; o próprio profissional edita tudo, menos `active`. */
  async update(
    clinicId: string,
    requester: { id: string; role: ClinicUserRole | undefined },
    id: string,
    input: UpdateProfessionalDto,
  ) {
    const professional = await this.getOrFail(clinicId, id);

    const isAdmin = requester.role === ClinicUserRole.ADMIN;
    const isSelf = professional.userId === requester.id;
    if (
      !isAdmin &&
      !(
        isSelf &&
        input.active === undefined &&
        input.payoutPercent === undefined
      )
    ) {
      throw new ForbiddenException(
        'Usuário não possui permissão para alterar este profissional.',
      );
    }

    const { crm, ...rest } = input;
    const data: Partial<Professional> = { ...rest };

    if (crm) {
      const normalized = normalizeCrm(crm);
      data.crmHash = this.crmCrypto.hash(normalized);
      if (await this.professionals.findByCrmHash(clinicId, data.crmHash, id)) {
        throw new ConflictException(
          'Este CRM já está cadastrado nesta clínica!',
        );
      }
      data.crm = this.crmCrypto.encrypt(normalized);
    }

    await this.professionals.update(id, data);
  }

  /** Mantém `professional.active` em sincronia com o status do vínculo. */
  @OnEvent(CLINIC_USER_STATUS_CHANGED)
  async onClinicUserStatusChanged(event: ClinicUserStatusChangedEvent) {
    if (event.role !== ClinicUserRole.PROFISSIONAL) return;

    await this.professionals.setActiveByUser(
      event.clinicId,
      event.userId,
      event.status === ClinicUserStatus.ATIVO,
    );
  }

  private async create(
    clinicId: string,
    userId: string,
    input: {
      type?: RegisterProfessionalDto['type'];
      crm?: string;
      specialty?: string;
      active?: boolean;
    },
  ) {
    if (await this.professionals.findByUser(clinicId, userId)) {
      throw new ConflictException('Profissional já vinculado nesta clínica!');
    }

    let crm: string | null = null;
    let crmHash: string | null = null;
    if (input.crm) {
      const normalized = normalizeCrm(input.crm);
      crmHash = this.crmCrypto.hash(normalized);
      if (await this.professionals.findByCrmHash(clinicId, crmHash)) {
        throw new ConflictException(
          'Este CRM já está cadastrado nesta clínica!',
        );
      }
      crm = this.crmCrypto.encrypt(normalized);
    }

    const created = await this.professionals.create({
      userId,
      clinicId,
      type: input.type ?? ProfessionalType.MEDICO,
      specialty: input.specialty,
      active: input.active,
      crm,
      crmHash,
    });

    return this.findById(clinicId, created.id);
  }

  private async getOrFail(clinicId: string, id: string) {
    const professional = await this.professionals.findById(clinicId, id);
    if (!professional)
      throw new NotFoundException('Profissional não encontrado!');
    return professional;
  }

  private toResponse(p: Professional, viewer?: ProfessionalViewer) {
    const canSeePayout =
      viewer?.role === ClinicUserRole.ADMIN || viewer?.id === p.userId;
    return {
      clinicId: p.clinicId,
      userId: p.userId,
      professional: {
        professionalId: p.id,
        name: p.user.name,
        specialty: p.specialty,
        type: p.type,
        crm: p.crm ? this.crmCrypto.decrypt(p.crm) : null,
        active: p.active,
        ...(canSeePayout && { payoutPercent: p.payoutPercent }),
      },
    };
  }
}
