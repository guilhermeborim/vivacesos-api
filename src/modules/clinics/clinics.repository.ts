import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { Clinic } from './entities/clinic.entity.js';

export type NewClinic = Pick<
  Clinic,
  | 'name'
  | 'cnpj'
  | 'cnpjHash'
  | 'phone'
  | 'cep'
  | 'number'
  | 'road'
  | 'neighborhood'
  | 'city'
> & { complement?: string };

@Injectable()
export class ClinicsRepository {
  constructor(
    @InjectRepository(Clinic) private readonly repository: Repository<Clinic>,
  ) {}

  create(clinic: NewClinic) {
    return this.repository.save(clinic);
  }

  findById(id: string) {
    return this.repository.findOne({ where: { id } });
  }

  /** `exceptId`: ignora a própria clínica ao validar duplicidade na edição. */
  findByCnpjHash(cnpjHash: string, exceptId?: string) {
    return this.repository.findOne({
      where: { cnpjHash, ...(exceptId && { id: Not(exceptId) }) },
    });
  }

  findByPhone(phone: string, exceptId?: string) {
    return this.repository.findOne({
      where: { phone, ...(exceptId && { id: Not(exceptId) }) },
    });
  }

  async update(id: string, data: Partial<Clinic>) {
    await this.repository.update(id, data);
  }
}
