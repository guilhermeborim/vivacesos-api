import { Injectable } from '@nestjs/common';
import { ClinicUserRole } from '../../common/enums/clinic-user-role.enum.js';
import {
  PERMISSIONS,
  ROLE_PERMISSIONS,
} from '../../common/permissions/role-permissions.js';
import { ProfessionalsRepository } from '../professionals/professionals.repository.js';
import {
  DashboardRepository,
  type Period,
  type Scope,
  type StatusCount,
} from './dashboard.repository.js';
import type { DashboardQueryDto } from './schemas/dashboard.schema.js';

export interface DashboardActor {
  userId: string;
  role: ClinicUserRole;
}

/** UUID nulo: usado para o profissional sem cadastro, que não enxerga consulta nenhuma. */
const NO_PROFESSIONAL = '00000000-0000-0000-0000-000000000000';
const CHART_MONTHS = 6;

const round = (value: number) => Math.round(value * 100) / 100;

/** Variação percentual; `null` quando não há base de comparação. */
const growth = (current: number, previous: number) =>
  previous > 0 ? round(((current - previous) / previous) * 100) : null;

function buildPeriod({ month, tz }: DashboardQueryDto): Period {
  const [year, m] = month.split('-').map(Number);
  const shift = (offset: number) => {
    const index = year * 12 + (m - 1) + offset;
    return { year: Math.floor(index / 12), month: (index % 12) + 1 };
  };
  const next = shift(1);
  const prev = shift(-1);
  return {
    tz,
    year,
    month: m,
    nextYear: next.year,
    nextMonth: next.month,
    prevYear: prev.year,
    prevMonth: prev.month,
  };
}

const monthKey = (year: number, month: number) =>
  `${year}-${String(month).padStart(2, '0')}`;

function countByStatus(rows: StatusCount[]) {
  const byStatus: Record<string, number> = {};
  for (const row of rows) byStatus[row.status] = row.count;
  const total = rows.reduce((sum, r) => sum + r.count, 0);
  return { total, byStatus };
}

@Injectable()
export class DashboardService {
  constructor(
    private readonly dashboard: DashboardRepository,
    private readonly professionals: ProfessionalsRepository,
  ) {}

  /** Números do mês. O PROFISSIONAL enxerga só os próprios; o financeiro segue `FINANCE_VIEW`. */
  async overview(
    clinicId: string,
    actor: DashboardActor,
    query: DashboardQueryDto,
  ) {
    const period = buildPeriod(query);
    const own = await this.professionals.findByUser(clinicId, actor.userId);
    const isProfessionalRole = actor.role === ClinicUserRole.PROFISSIONAL;
    const scope: Scope = {
      clinicId,
      professionalId: isProfessionalRole ? (own?.id ?? NO_PROFESSIONAL) : null,
    };
    const canViewFinance = ROLE_PERMISSIONS[actor.role].includes(
      PERMISSIONS.FINANCE_VIEW,
    );

    // Repasse só para o papel PROFISSIONAL (o ADMIN vê a clínica toda).
    const ownProfessionalId = isProfessionalRole && own ? own.id : null;

    const [
      today,
      month,
      unpaid,
      revenue,
      patients,
      expenses,
      pendingRecords,
      payoutSummary,
      payoutBacklog,
    ] = await Promise.all([
      this.dashboard.appointmentsByStatusToday(period, scope),
      this.dashboard.appointmentsByStatusInMonth(period, scope),
      this.dashboard.unpaid(period, scope),
      this.dashboard.revenue(period, scope),
      this.dashboard.patients(period, scope),
      canViewFinance
        ? this.dashboard.expenses(period, scope)
        : Promise.resolve(null),
      own?.active
        ? this.dashboard.pendingRecordsToday(period, clinicId, own.id)
        : Promise.resolve([]),
      ownProfessionalId
        ? this.dashboard.payoutSummary(period, clinicId, ownProfessionalId)
        : Promise.resolve(null),
      ownProfessionalId
        ? this.dashboard.payoutBacklog(period, clinicId, ownProfessionalId)
        : Promise.resolve(null),
    ]);

    const monthCounts = countByStatus(month);
    const done =
      (monthCounts.byStatus.CONCLUIDA ?? 0) +
      (monthCounts.byStatus.FALTOU ?? 0);

    return {
      month: query.month,
      appointments: {
        today: countByStatus(today),
        month: {
          ...monthCounts,
          // Faltas sobre as consultas que já deveriam ter acontecido (concluídas + faltas).
          absenceRate:
            done > 0
              ? round(((monthCounts.byStatus.FALTOU ?? 0) / done) * 100)
              : null,
        },
      },
      unpaid,
      patients: { total: patients.endOfMonth, newInMonth: patients.newInMonth },
      revenue,
      ...(expenses && {
        expenses,
        balance: round(revenue.received - expenses.paid),
      }),
      pendingRecords,
      ...(payoutSummary &&
        payoutBacklog && {
          payout: {
            // Percentual cadastrado pelo ADMIN; vazio = repasse ainda não configurado.
            percent: own?.payoutPercent ?? null,
            toLaunch: {
              count: payoutBacklog.count,
              grossAmount: payoutBacklog.grossCents / 100,
              amount:
                own?.payoutPercent == null
                  ? null
                  : Math.round(
                      (payoutBacklog.grossCents * own.payoutPercent) / 100,
                    ) / 100,
            },
            launchedPending: payoutSummary.pending,
            receivedInMonth: payoutSummary.received,
          },
        }),
    };
  }

  /** Análises da clínica toda (somente ADMIN). */
  async analytics(clinicId: string, query: DashboardQueryDto) {
    const period = buildPeriod(query);
    const scope: Scope = { clinicId, professionalId: null };

    const first = (() => {
      const index = period.year * 12 + (period.month - 1) - (CHART_MONTHS - 1);
      return { year: Math.floor(index / 12), month: (index % 12) + 1 };
    })();
    const months = Array.from({ length: CHART_MONTHS }, (_, i) => {
      const index = first.year * 12 + (first.month - 1) + i;
      return monthKey(Math.floor(index / 12), (index % 12) + 1);
    });

    const [
      revenue,
      expenses,
      patients,
      windows,
      revenueByMonth,
      expensesByMonth,
      byDay,
      byProfessional,
      byPaymentMethod,
      payoutsToLaunch,
    ] = await Promise.all([
      this.dashboard.revenue(period, scope),
      this.dashboard.expenses(period, scope),
      this.dashboard.patients(period, scope),
      this.dashboard.growthWindows(period, scope),
      this.dashboard.revenueByMonth(period, scope, first),
      this.dashboard.expensesByMonth(period, scope, first),
      this.dashboard.revenueByDay(period, scope),
      this.dashboard.revenueByProfessional(period, scope),
      this.dashboard.revenueByPaymentMethod(period, scope),
      this.dashboard.payoutsNotYetLaunched(period, scope),
    ]);

    // Estimativa: se tudo o que está previsto for pago, quanto sobra no mês, já descontando
    // os repasses a profissionais que ainda não viraram despesa.
    const profitEstimate = round(
      revenue.received +
        revenue.receivable -
        (expenses.paid + expenses.pending) -
        payoutsToLaunch,
    );

    const daysInMonth = new Date(period.year, period.month, 0).getDate();
    // No mês em andamento, os dias futuros ficam `null` (a linha para em "hoje").
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: period.tz,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    }).formatToParts(new Date());
    const part = (type: string) =>
      Number(parts.find((p) => p.type === type)?.value);
    const lastDay =
      part('year') === period.year && part('month') === period.month
        ? part('day')
        : daysInMonth;
    const cumulative = (which: 'current' | 'previous', limit: number) => {
      const perDay = new Map(
        byDay.filter((d) => d.which === which).map((d) => [d.day, d.total]),
      );
      let sum = 0;
      return Array.from({ length: daysInMonth }, (_, i) => {
        sum += perDay.get(i + 1) ?? 0;
        return { day: i + 1, total: i + 1 <= limit ? round(sum) : null };
      });
    };

    return {
      month: query.month,
      profitEstimate,
      payoutsToLaunch: round(payoutsToLaunch),
      growth: {
        revenue: growth(windows.revenueCurrent, windows.revenuePrevious),
        appointments: growth(
          windows.appointmentsCurrent,
          windows.appointmentsPrevious,
        ),
        patients: growth(patients.endOfMonth, patients.startOfMonth),
      },
      monthlySeries: months.map((key) => ({
        month: key,
        revenue: round(revenueByMonth.get(key) ?? 0),
        expenses: round(expensesByMonth.get(key) ?? 0),
      })),
      cumulativeRevenue: {
        current: cumulative('current', lastDay),
        previous: cumulative('previous', daysInMonth),
      },
      byProfessional: byProfessional.map((p) => ({
        professionalId: p.professionalId,
        name: p.name,
        received: p.received,
        count: p.count,
      })),
      byPaymentMethod: byPaymentMethod.map((p) => ({
        method: p.method,
        total: p.total,
        count: p.count,
      })),
    };
  }
}
