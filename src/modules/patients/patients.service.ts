import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { onlyDigits } from '../../common/utils/digits.js';
import { maskCpf } from '../../common/utils/mask-cpf.js';
import { CryptoService } from '../../security/crypto.service.js';
import {
  PATIENT_CREATED,
  PatientCreatedEvent,
} from './events/patient-created.event.js';
import type { Patient } from './entities/patient.entity.js';
import { PatientsRepository } from './patients.repository.js';
import type {
  RegisterPatientDto,
  UpdatePatientDto,
} from './schemas/patient.schema.js';

@Injectable()
export class PatientsService {
  private readonly cpfCrypto;
  private readonly phoneCrypto;

  constructor(
    private readonly patients: PatientsRepository,
    crypto: CryptoService,
    private readonly events: EventEmitter2,
  ) {
    this.cpfCrypto = crypto.forField('patient:cpf');
    this.phoneCrypto = crypto.forField('patient:phone');
  }

  async register(clinicId: string, input: RegisterPatientDto) {
    const cpf = onlyDigits(input.cpf);
    const phone = onlyDigits(input.phone);
    const cpfHash = this.cpfCrypto.hash(cpf);
    const phoneHash = this.phoneCrypto.hash(phone);

    if (await this.patients.findByCpfHash(clinicId, cpfHash)) {
      throw new ConflictException('Este CPF já está cadastrado!');
    }
    if (await this.patients.findByEmail(clinicId, input.email)) {
      throw new ConflictException('Este E-mail já está cadastrado!');
    }
    if (await this.patients.findByPhoneHash(clinicId, phoneHash)) {
      throw new ConflictException('Este Telefone já está cadastrado!');
    }

    const patient = await this.patients.create({
      clinicId,
      name: input.name,
      email: input.email,
      birthDate: input.birthDate,
      active: input.active,
      cpf: this.cpfCrypto.encrypt(cpf),
      cpfHash,
      phone: this.phoneCrypto.encrypt(phone),
      phoneHash,
    });

    await this.events.emitAsync(
      PATIENT_CREATED,
      new PatientCreatedEvent(clinicId, patient.id),
    );

    return this.toResponse(patient);
  }

  async findByClinic(clinicId: string) {
    const list = await this.patients.findByClinic(clinicId);
    return list.map((p) => this.toResponse(p));
  }

  async findById(clinicId: string, id: string) {
    return this.toResponse(await this.getOrFail(clinicId, id));
  }

  async update(clinicId: string, id: string, input: UpdatePatientDto) {
    await this.getOrFail(clinicId, id);

    const { cpf, phone, email, ...rest } = input;
    const data: Partial<Patient> = { ...rest };

    if (email) {
      if (await this.patients.findByEmail(clinicId, email, id)) {
        throw new ConflictException('Este E-mail já está cadastrado!');
      }
      data.email = email;
    }

    if (cpf) {
      const digits = onlyDigits(cpf);
      data.cpfHash = this.cpfCrypto.hash(digits);
      if (await this.patients.findByCpfHash(clinicId, data.cpfHash, id)) {
        throw new ConflictException(
          'Este CPF já está cadastrado nesta clínica!',
        );
      }
      data.cpf = this.cpfCrypto.encrypt(digits);
    }

    if (phone) {
      const digits = onlyDigits(phone);
      data.phoneHash = this.phoneCrypto.hash(digits);
      if (await this.patients.findByPhoneHash(clinicId, data.phoneHash, id)) {
        throw new ConflictException(
          'Este TELEFONE já está cadastrado nesta clínica!',
        );
      }
      data.phone = this.phoneCrypto.encrypt(digits);
    }

    await this.patients.update(id, data);
  }

  private async getOrFail(clinicId: string, id: string) {
    const patient = await this.patients.findById(clinicId, id);
    if (!patient) throw new NotFoundException('Paciente não encontrado!');
    return patient;
  }

  private toResponse(patient: Patient) {
    return {
      clinicId: patient.clinicId,
      patients: {
        patientId: patient.id,
        name: patient.name,
        email: patient.email,
        cpf: maskCpf(this.cpfCrypto.decrypt(patient.cpf)),
        phone: this.phoneCrypto.decrypt(patient.phone),
        birthDate: patient.birthDate,
        active: patient.active,
      },
    };
  }
}
