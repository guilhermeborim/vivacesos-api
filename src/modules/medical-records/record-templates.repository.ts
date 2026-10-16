import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { RecordTemplate } from './entities/record-template.entity.js';

export interface NewTemplate {
  clinicId: string;
  professionalId: string;
  name: string;
  content: string;
}

/** Sempre escopado por clínica e pelo profissional dono. */
@Injectable()
export class RecordTemplatesRepository {
  constructor(
    @InjectRepository(RecordTemplate)
    private readonly repository: Repository<RecordTemplate>,
  ) {}

  create(template: NewTemplate) {
    return this.repository.save(template);
  }

  findByProfessional(clinicId: string, professionalId: string) {
    return this.repository.find({
      where: { clinicId, professionalId },
      order: { name: 'ASC' },
    });
  }

  findById(clinicId: string, professionalId: string, id: string) {
    return this.repository.findOne({ where: { clinicId, professionalId, id } });
  }

  findByName(
    clinicId: string,
    professionalId: string,
    name: string,
    exceptId?: string,
  ) {
    return this.repository.findOne({
      where: {
        clinicId,
        professionalId,
        name,
        ...(exceptId && { id: Not(exceptId) }),
      },
    });
  }

  async update(id: string, data: Partial<RecordTemplate>) {
    await this.repository.update(id, data);
  }

  async delete(id: string) {
    await this.repository.delete(id);
  }
}
