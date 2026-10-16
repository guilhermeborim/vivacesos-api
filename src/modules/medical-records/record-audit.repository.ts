import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  type FindOptionsWhere,
  LessThanOrEqual,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';
import { RecordAuditLog } from './entities/record-audit-log.entity.js';
import type { RecordAuditAction } from './enums/record-audit-action.enum.js';

export interface NewAuditLog {
  clinicId: string;
  userId: string;
  role: string;
  patientId?: string;
  entryId?: string;
  action: RecordAuditAction;
}

export interface AuditFilters {
  from?: Date;
  to?: Date;
  userId?: string;
  patientId?: string;
  action?: RecordAuditAction;
  limit: number;
  offset: number;
}

/** Somente inserção e consulta, escopadas por clínica. */
@Injectable()
export class RecordAuditRepository {
  constructor(
    @InjectRepository(RecordAuditLog)
    private readonly repository: Repository<RecordAuditLog>,
  ) {}

  async log(entry: NewAuditLog) {
    await this.repository.insert(entry);
  }

  findByClinic(clinicId: string, filters: AuditFilters) {
    const { from, to, userId, patientId, action, limit, offset } = filters;
    const where: FindOptionsWhere<RecordAuditLog> = {
      clinicId,
      ...(userId && { userId }),
      ...(patientId && { patientId }),
      ...(action && { action }),
      ...(from && { createdAt: MoreThanOrEqual(from) }),
      ...(to && { createdAt: LessThanOrEqual(to) }),
    };
    return this.repository.findAndCount({
      where,
      relations: { user: true, patient: true },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
  }
}
