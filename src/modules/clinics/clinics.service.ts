import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ClinicUsersRepository } from '../clinic-users/clinic-users.repository.js';
import { ClinicUserRole } from '../../common/enums/clinic-user-role.enum.js';
import { ClinicUserStatus } from '../../common/enums/clinic-user-status.enum.js';
import { onlyDigits } from '../../common/utils/digits.js';
import { CryptoService } from '../../security/crypto.service.js';
import { ClinicsRepository } from './clinics.repository.js';
import type { Clinic } from './entities/clinic.entity.js';
import type { RegisterClinicDto } from './schemas/register-clinic.schema.js';
import type { UpdateClinicDto } from './schemas/update-clinic.schema.js';

@Injectable()
export class ClinicsService {
  private readonly cnpjCrypto;

  constructor(
    private readonly clinics: ClinicsRepository,
    private readonly clinicUsers: ClinicUsersRepository,
    crypto: CryptoService,
  ) {
    this.cnpjCrypto = crypto.forField('clinic:cnpj');
  }

  /** Cria a clínica e vincula o usuário como ADMIN. `isFirstClinic` indica se ela deve virar a ativa. */
  async register(userId: string, input: RegisterClinicDto) {
    const cnpj = onlyDigits(input.cnpj);
    const phone = onlyDigits(input.phone);
    const cnpjHash = this.cnpjCrypto.hash(cnpj);

    if (await this.clinics.findByCnpjHash(cnpjHash)) {
      throw new ConflictException('CNPJ já está cadastrado!');
    }
    if (await this.clinics.findByPhone(phone)) {
      throw new ConflictException('Telefone já está cadastrado!');
    }

    const isFirstClinic =
      (await this.clinicUsers.getClinicsByUser(userId)).length === 0;

    const clinic = await this.clinics.create({
      ...input,
      cnpj: this.cnpjCrypto.encrypt(cnpj),
      cnpjHash,
      phone,
    });

    await this.clinicUsers.bind({
      userId,
      clinicId: clinic.id,
      role: ClinicUserRole.ADMIN,
      status: ClinicUserStatus.ATIVO,
    });

    return { clinic: this.toResponse(clinic), isFirstClinic };
  }

  /** Só membros da clínica (multi-tenant) podem consultá-la. */
  async findById(userId: string, clinicId: string) {
    if (!(await this.clinicUsers.getUserBindedClinic(clinicId, userId))) {
      throw new ForbiddenException('Usuário não vinculado à clínica!');
    }

    const clinic = await this.clinics.findById(clinicId);
    if (!clinic) throw new NotFoundException('Clínica não encontrada!');

    return this.toResponse(clinic);
  }

  async update(clinicId: string, input: UpdateClinicDto) {
    if (!(await this.clinics.findById(clinicId))) {
      throw new NotFoundException('Clínica não encontrada!');
    }

    const { cnpj, phone, ...rest } = input;
    const data: Partial<Clinic> = { ...rest };

    if (cnpj) {
      const digits = onlyDigits(cnpj);
      data.cnpjHash = this.cnpjCrypto.hash(digits);
      if (await this.clinics.findByCnpjHash(data.cnpjHash, clinicId)) {
        throw new ConflictException('CNPJ já está cadastrado!');
      }
      data.cnpj = this.cnpjCrypto.encrypt(digits);
    }

    if (phone) {
      data.phone = onlyDigits(phone);
      if (await this.clinics.findByPhone(data.phone, clinicId)) {
        throw new ConflictException('Telefone já está cadastrado!');
      }
    }

    await this.clinics.update(clinicId, data);
  }

  async findByUser(userId: string) {
    const clinicUsers = await this.clinicUsers.getClinicsByUser(userId);

    return clinicUsers.map((cu) => ({
      clinicUserId: cu.id,
      role: cu.role,
      status: cu.status,
      clinic: {
        clinicId: cu.clinicId,
        name: cu.clinic.name,
        city: cu.clinic.city,
        cnpj: this.cnpjCrypto.decrypt(cu.clinic.cnpj),
      },
    }));
  }

  private toResponse(clinic: Clinic) {
    return {
      clinic: {
        clinicId: clinic.id,
        name: clinic.name,
        cnpj: this.cnpjCrypto.decrypt(clinic.cnpj),
        phone: clinic.phone,
        cep: clinic.cep,
        road: clinic.road,
        number: clinic.number,
        complement: clinic.complement,
        neighborhood: clinic.neighborhood,
        city: clinic.city,
      },
    };
  }
}
