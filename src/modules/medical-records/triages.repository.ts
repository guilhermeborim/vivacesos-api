import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppointmentTriage } from './entities/appointment-triage.entity.js';

@Injectable()
export class TriagesRepository {
  constructor(
    @InjectRepository(AppointmentTriage)
    private readonly repository: Repository<AppointmentTriage>,
  ) {}

  find(clinicId: string, appointmentId: string) {
    return this.repository.findOne({ where: { clinicId, appointmentId } });
  }

  /** Cria ou substitui a triagem da consulta. */
  async upsert(
    clinicId: string,
    appointmentId: string,
    patientId: string,
    data: string,
    updatedBy: string,
  ) {
    await this.repository.query(
      `INSERT INTO appointment_triages ("clinicId", "appointmentId", "patientId", data, "updatedBy")
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT ("appointmentId")
       DO UPDATE SET data = EXCLUDED.data, "updatedBy" = EXCLUDED."updatedBy", "updatedAt" = now()`,
      [clinicId, appointmentId, patientId, data, updatedBy],
    );
  }
}
