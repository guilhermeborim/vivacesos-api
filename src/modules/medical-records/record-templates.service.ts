import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CryptoService } from '../../security/crypto.service.js';
import { ProfessionalsRepository } from '../professionals/professionals.repository.js';
import type { RecordTemplate } from './entities/record-template.entity.js';
import { RecordTemplatesRepository } from './record-templates.repository.js';
import type {
  CreateTemplateDto,
  UpdateTemplateDto,
} from './schemas/record-template.schema.js';

@Injectable()
export class RecordTemplatesService {
  private readonly contentCrypto;

  constructor(
    private readonly templates: RecordTemplatesRepository,
    private readonly professionals: ProfessionalsRepository,
    crypto: CryptoService,
  ) {
    this.contentCrypto = crypto.forField('record-template:content');
  }

  async findAll(clinicId: string, userId: string) {
    const professional = await this.getProfessionalOrFail(clinicId, userId);
    const list = await this.templates.findByProfessional(
      clinicId,
      professional.id,
    );
    return list.map((t) => this.toResponse(t));
  }

  async create(clinicId: string, userId: string, input: CreateTemplateDto) {
    const professional = await this.getProfessionalOrFail(clinicId, userId);
    await this.assertNameFree(clinicId, professional.id, input.name);

    const template = await this.templates.create({
      clinicId,
      professionalId: professional.id,
      name: input.name,
      content: this.contentCrypto.encrypt(input.content),
    });
    return this.toResponse(template);
  }

  async update(
    clinicId: string,
    userId: string,
    id: string,
    input: UpdateTemplateDto,
  ) {
    const professional = await this.getProfessionalOrFail(clinicId, userId);
    await this.getOrFail(clinicId, professional.id, id);

    const data: Partial<RecordTemplate> = {};
    if (input.name !== undefined) {
      await this.assertNameFree(clinicId, professional.id, input.name, id);
      data.name = input.name;
    }
    if (input.content !== undefined) {
      data.content = this.contentCrypto.encrypt(input.content);
    }
    await this.templates.update(id, data);
  }

  /** Apagar é seguro: a ficha criada guarda uma cópia do texto. */
  async remove(clinicId: string, userId: string, id: string) {
    const professional = await this.getProfessionalOrFail(clinicId, userId);
    await this.getOrFail(clinicId, professional.id, id);
    await this.templates.delete(id);
  }

  private async assertNameFree(
    clinicId: string,
    professionalId: string,
    name: string,
    exceptId?: string,
  ) {
    if (
      await this.templates.findByName(clinicId, professionalId, name, exceptId)
    ) {
      throw new ConflictException('Já existe um modelo com este nome!');
    }
  }

  private async getOrFail(
    clinicId: string,
    professionalId: string,
    id: string,
  ) {
    const template = await this.templates.findById(
      clinicId,
      professionalId,
      id,
    );
    if (!template) throw new NotFoundException('Modelo não encontrado!');
    return template;
  }

  private async getProfessionalOrFail(clinicId: string, userId: string) {
    const professional = await this.professionals.findByUser(clinicId, userId);
    if (!professional?.active) {
      throw new ForbiddenException(
        'Somente profissionais ativos da clínica acessam modelos de ficha.',
      );
    }
    return professional;
  }

  private toResponse(t: RecordTemplate) {
    return {
      templateId: t.id,
      name: t.name,
      content: this.contentCrypto.decrypt(t.content),
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    };
  }
}
