import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import type { ProfessionalType } from './enums/professional-type.enum.js';
import { Professional } from './entities/professional.entity.js';

export interface NewProfessional {
  userId: string;
  clinicId: string;
  type?: ProfessionalType;
  crm: string | null;
  crmHash: string | null;
  specialty?: string;
  active?: boolean;
}

@Injectable()
export class ProfessionalsRepository {
  constructor(
    @InjectRepository(Professional)
    private readonly repository: Repository<Professional>,
  ) {}

  create(professional: NewProfessional) {
    return this.repository.save(professional);
  }

  findByClinic(clinicId: string) {
    return this.repository.find({
      where: { clinicId },
      relations: { user: true },
    });
  }

  /** Sempre escopado pela clínica (multi-tenant). */
  findById(clinicId: string, id: string) {
    return this.repository.findOne({
      where: { id, clinicId },
      relations: { user: true },
    });
  }

  findByUser(clinicId: string, userId: string) {
    return this.repository.findOne({ where: { clinicId, userId } });
  }

  findByCrmHash(clinicId: string, crmHash: string, exceptId?: string) {
    return this.repository.findOne({
      where: { clinicId, crmHash, ...(exceptId && { id: Not(exceptId) }) },
    });
  }

  async update(id: string, data: Partial<Professional>) {
    await this.repository.update(id, data);
  }

  async setActiveByUser(clinicId: string, userId: string, active: boolean) {
    await this.repository.update({ clinicId, userId }, { active });
  }
}
