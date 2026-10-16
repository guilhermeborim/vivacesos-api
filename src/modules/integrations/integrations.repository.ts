import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ClinicIntegration,
  type IntegrationProvider,
} from './entities/clinic-integration.entity.js';

@Injectable()
export class IntegrationsRepository {
  constructor(
    @InjectRepository(ClinicIntegration)
    private readonly repository: Repository<ClinicIntegration>,
  ) {}

  findByClinic(clinicId: string) {
    return this.repository.find({ where: { clinicId } });
  }

  find(clinicId: string, provider: IntegrationProvider) {
    return this.repository.findOne({ where: { clinicId, provider } });
  }

  /** Cria ou substitui a linha da integração (estado + credenciais cifradas). */
  async save(
    clinicId: string,
    provider: IntegrationProvider,
    data: {
      status: 'DISCONNECTED' | 'PENDING' | 'CONNECTED';
      credentials: string | null;
      connectedAt: Date | null;
    },
  ) {
    await this.repository.upsert(
      { clinicId, provider, ...data, config: null },
      ['clinicId', 'provider'],
    );
  }
}
