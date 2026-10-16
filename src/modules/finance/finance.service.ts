import { ForbiddenException, Injectable } from '@nestjs/common';
import { ClinicUserRole } from '../../common/enums/clinic-user-role.enum.js';
import type { Appointment } from '../appointments/entities/appointment.entity.js';
import { ProfessionalsRepository } from '../professionals/professionals.repository.js';
import { ExpensesRepository } from './expenses.repository.js';
import { FinanceRepository } from './finance.repository.js';
import type {
  RevenuesQueryDto,
  SummaryQueryDto,
} from './schemas/finance.schema.js';

export interface FinanceActor {
  userId: string;
  role?: ClinicUserRole;
}

@Injectable()
export class FinanceService {
  constructor(
    private readonly finance: FinanceRepository,
    private readonly expenses: ExpensesRepository,
    private readonly professionals: ProfessionalsRepository,
  ) {}

  async revenues(
    clinicId: string,
    actor: FinanceActor,
    query: RevenuesQueryDto,
  ) {
    const filters = {
      ...query,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
      professionalId: await this.scopeProfessional(
        clinicId,
        actor,
        query.professionalId,
      ),
    };
    const [list, totals] = await Promise.all([
      this.finance.findRevenues(clinicId, filters),
      this.finance.totals(clinicId, filters),
    ]);
    return { totals, revenues: list.map((a) => this.toRevenue(a)) };
  }

  async summary(clinicId: string, actor: FinanceActor, query: SummaryQueryDto) {
    const professionalId = await this.scopeProfessional(
      clinicId,
      actor,
      query.professionalId,
    );
    const revenues = await this.finance.totals(clinicId, {
      dateField: query.dateField,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
      professionalId,
    });

    // Profissional só enxerga as próprias receitas.
    if (actor.role === ClinicUserRole.PROFISSIONAL) return { revenues };

    const expenses = await this.expenses.totals(clinicId, {
      dateField: query.dateField,
      from: query.from?.slice(0, 10),
      to: query.to?.slice(0, 10),
    });
    return { revenues, expenses, balance: revenues.received - expenses.paid };
  }

  /** Profissional fica preso ao próprio cadastro; os demais usam o filtro. */
  private async scopeProfessional(
    clinicId: string,
    actor: FinanceActor,
    requested?: string,
  ) {
    if (actor.role !== ClinicUserRole.PROFISSIONAL) return requested;
    const own = await this.professionals.findByUser(clinicId, actor.userId);
    if (!own) throw new ForbiddenException('Profissional não encontrado!');
    return own.id;
  }

  private toRevenue(a: Appointment) {
    return {
      appointmentId: a.id,
      startsAt: a.startsAt,
      endsAt: a.endsAt,
      status: a.status,
      price: a.price,
      paid: a.paid,
      paidAt: a.paidAt,
      paymentMethod: a.paymentMethod,
      payoutId: a.payoutId,
      patient: { patientId: a.patientId, name: a.patient.name },
      professional: {
        professionalId: a.professionalId,
        name: a.professional.user?.name ?? null,
      },
    };
  }
}
