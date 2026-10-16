import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { Patient } from './entities/patient.entity.js';

export type NewPatient = Pick<
  Patient,
  | 'clinicId'
  | 'name'
  | 'email'
  | 'cpf'
  | 'cpfHash'
  | 'phone'
  | 'phoneHash'
  | 'birthDate'
> & { active?: boolean };

/** Todas as consultas são escopadas por clínica (multi-tenant). */
@Injectable()
export class PatientsRepository {
  constructor(
    @InjectRepository(Patient) private readonly repository: Repository<Patient>,
  ) {}

  create(patient: NewPatient) {
    return this.repository.save(patient);
  }

  findByClinic(clinicId: string) {
    return this.repository.find({ where: { clinicId } });
  }

  findById(clinicId: string, id: string) {
    return this.repository.findOne({ where: { clinicId, id } });
  }

  findByCpfHash(clinicId: string, cpfHash: string, exceptId?: string) {
    return this.repository.findOne({
      where: { clinicId, cpfHash, ...(exceptId && { id: Not(exceptId) }) },
    });
  }

  findByPhoneHash(clinicId: string, phoneHash: string, exceptId?: string) {
    return this.repository.findOne({
      where: { clinicId, phoneHash, ...(exceptId && { id: Not(exceptId) }) },
    });
  }

  findByEmail(clinicId: string, email: string, exceptId?: string) {
    return this.repository.findOne({
      where: { clinicId, email, ...(exceptId && { id: Not(exceptId) }) },
    });
  }

  async update(id: string, data: Partial<Patient>) {
    await this.repository.update(id, data);
  }
}
