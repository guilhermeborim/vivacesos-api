import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import {
  type EntryItemKind,
  MedicalRecordEntryItem,
} from './entities/medical-record-entry-item.entity.js';
import { MedicalRecordEntry } from './entities/medical-record-entry.entity.js';
import { MedicalRecord } from './entities/medical-record.entity.js';
import { MedicalRecordEntryStatus } from './enums/medical-record-entry-status.enum.js';

export interface NewEntry {
  clinicId: string;
  recordId: string;
  appointmentId: string;
  professionalId: string;
  parentEntryId: string | null;
  content: string;
}

export interface NewEntryItem {
  kind: EntryItemKind;
  /** JSON já cifrado. */
  data: string;
}

const ENTRY_RELATIONS = {
  professional: { user: true },
  appointment: true,
  record: true,
  items: true,
} as const;

/** Todas as consultas são escopadas por clínica (multi-tenant). Sem update/delete de fichas, exceto cancelar. */
@Injectable()
export class MedicalRecordsRepository {
  constructor(
    @InjectRepository(MedicalRecord)
    private readonly records: Repository<MedicalRecord>,
    @InjectRepository(MedicalRecordEntry)
    private readonly entries: Repository<MedicalRecordEntry>,
  ) {}

  /** Abre o prontuário dos pacientes da clínica que ainda não têm um. */
  async ensureForClinic(clinicId: string) {
    await this.records.query(
      `INSERT INTO medical_records ("clinicId", "patientId")
       SELECT "clinicId", id FROM patients WHERE "clinicId" = $1
       ON CONFLICT ("clinicId", "patientId") DO NOTHING`,
      [clinicId],
    );
  }

  async ensureForPatient(clinicId: string, patientId: string) {
    await this.records.query(
      `INSERT INTO medical_records ("clinicId", "patientId")
       VALUES ($1, $2)
       ON CONFLICT ("clinicId", "patientId") DO NOTHING`,
      [clinicId, patientId],
    );
    return this.records.findOneOrFail({
      where: { clinicId, patientId },
      relations: { patient: true },
    });
  }

  findByClinic(clinicId: string) {
    return this.records.find({
      where: { clinicId },
      relations: { patient: true },
    });
  }

  findByPatientIds(clinicId: string, patientIds: string[]) {
    if (!patientIds.length) return Promise.resolve([]);
    return this.records
      .createQueryBuilder('r')
      .where('r.clinicId = :clinicId', { clinicId })
      .andWhere('r.patientId IN (:...patientIds)', { patientIds })
      .getMany();
  }

  async lastEntryDates(clinicId: string) {
    const rows = await this.entries
      .createQueryBuilder('e')
      .select('e.recordId', 'recordId')
      .addSelect('MAX(e.createdAt)', 'lastEntryAt')
      .where('e.clinicId = :clinicId', { clinicId })
      .groupBy('e.recordId')
      .getRawMany<{ recordId: string; lastEntryAt: Date }>();
    return new Map(rows.map((r) => [r.recordId, r.lastEntryAt]));
  }

  findEntries(clinicId: string, recordId: string) {
    return this.entries.find({
      where: { clinicId, recordId },
      relations: ENTRY_RELATIONS,
      order: { createdAt: 'DESC', items: { position: 'ASC' } },
    });
  }

  findEntryById(clinicId: string, id: string) {
    return this.entries.findOne({
      where: { clinicId, id },
      relations: ENTRY_RELATIONS,
    });
  }

  /** A consulta já teve uma ficha (raiz, não adendo legado) cancelada. */
  async hasCanceledEntryForAppointment(
    clinicId: string,
    appointmentId: string,
  ) {
    return this.entries.exists({
      where: {
        clinicId,
        appointmentId,
        parentEntryId: IsNull(),
        status: MedicalRecordEntryStatus.CANCELADA,
      },
    });
  }

  /** Ficha ativa (não adendo) da consulta. */
  async hasActiveEntryForAppointment(clinicId: string, appointmentId: string) {
    return this.entries.exists({
      where: {
        clinicId,
        appointmentId,
        parentEntryId: IsNull(),
        status: MedicalRecordEntryStatus.ATIVA,
      },
    });
  }

  /** Ficha e seus itens (prescrições/exames) saem juntos, numa transação. */
  async createEntry(entry: NewEntry, items: NewEntryItem[] = []) {
    const savedId = await this.entries.manager.transaction(async (manager) => {
      const saved = await manager.save(MedicalRecordEntry, entry);
      if (items.length) {
        await manager.insert(
          MedicalRecordEntryItem,
          items.map((item, position) => ({
            clinicId: entry.clinicId,
            entryId: saved.id,
            kind: item.kind,
            position,
            data: item.data,
          })),
        );
      }
      return saved.id;
    });
    return this.entries.findOneOrFail({
      where: { id: savedId },
      relations: ENTRY_RELATIONS,
      order: { items: { position: 'ASC' } },
    });
  }

  async cancelEntry(id: string, cancelReason: string) {
    await this.entries.update(id, {
      status: MedicalRecordEntryStatus.CANCELADA,
      cancelReason,
      canceledAt: new Date(),
    });
  }
}
