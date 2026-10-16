import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, type SelectQueryBuilder } from 'typeorm';
import { Appointment } from '../appointments/entities/appointment.entity.js';
import {
  type AppointmentStatus,
  BILLABLE_APPOINTMENT_STATUSES,
} from '../appointments/enums/appointment-status.enum.js';

export interface RevenueFilters {
  from?: Date;
  to?: Date;
  dateField: 'startsAt' | 'paidAt';
  professionalId?: string;
  paid?: boolean;
  status?: AppointmentStatus;
}

/** Leitura financeira das consultas, sempre escopada por clínica. */
@Injectable()
export class FinanceRepository {
  constructor(
    @InjectRepository(Appointment)
    private readonly repository: Repository<Appointment>,
  ) {}

  findRevenues(clinicId: string, filters: RevenueFilters) {
    return this.filtered(clinicId, filters)
      .innerJoinAndSelect('a.patient', 'patient')
      .innerJoinAndSelect('a.professional', 'professional')
      .leftJoinAndSelect('professional.user', 'user')
      .orderBy(`a.${filters.dateField}`, 'ASC')
      .getMany();
  }

  /**
   * `total` e `receivable` só contam consultas faturáveis (não canceladas
   * nem faltas); `received` conta tudo o que foi pago.
   */
  async totals(clinicId: string, filters: RevenueFilters) {
    const billable = BILLABLE_APPOINTMENT_STATUSES;
    const row = await this.filtered(clinicId, filters)
      .select(
        'COALESCE(SUM(a.price) FILTER (WHERE a.status IN (:...billable)), 0)',
        'total',
      )
      .addSelect('COALESCE(SUM(a.price) FILTER (WHERE a.paid), 0)', 'received')
      .addSelect(
        'COALESCE(SUM(a.price) FILTER (WHERE NOT a.paid AND a.status IN (:...billable)), 0)',
        'receivable',
      )
      .setParameter('billable', billable)
      .getRawOne<{ total: string; received: string; receivable: string }>();
    return {
      total: Number(row?.total ?? 0),
      received: Number(row?.received ?? 0),
      receivable: Number(row?.receivable ?? 0),
    };
  }

  private filtered(
    clinicId: string,
    { from, to, dateField, professionalId, paid, status }: RevenueFilters,
  ): SelectQueryBuilder<Appointment> {
    const column = `a.${dateField}`;
    const qb = this.repository
      .createQueryBuilder('a')
      .where('a.clinicId = :clinicId', { clinicId });
    if (from) qb.andWhere(`${column} >= :from`, { from });
    if (to) qb.andWhere(`${column} <= :to`, { to });
    if (professionalId) {
      qb.andWhere('a.professionalId = :professionalId', { professionalId });
    }
    if (paid !== undefined) qb.andWhere('a.paid = :paid', { paid });
    if (status) qb.andWhere('a.status = :status', { status });
    return qb;
  }
}
