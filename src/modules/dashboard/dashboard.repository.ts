import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

/** Mês consultado e vizinhos (mês/ano numéricos) no fuso informado. */
export interface Period {
  tz: string;
  year: number;
  month: number;
  nextYear: number;
  nextMonth: number;
  prevYear: number;
  prevMonth: number;
}

export interface Scope {
  clinicId: string;
  /** Restringe às consultas de um profissional; `null` = clínica toda. */
  professionalId: string | null;
}

export interface StatusCount {
  status: string;
  count: number;
}

// Parâmetros fixos de toda consulta: $1 clínica, $2 fuso, $3/$4 mês, $5/$6 mês seguinte,
// $7/$8 mês anterior, $9 profissional (ou null).
const START = 'make_timestamptz($3::int, $4::int, 1, 0, 0, 0, $2)';
const END = 'make_timestamptz($5::int, $6::int, 1, 0, 0, 0, $2)';
const PREV = 'make_timestamptz($7::int, $8::int, 1, 0, 0, 0, $2)';
const TODAY_START =
  "(date_trunc('day', now() AT TIME ZONE $2) AT TIME ZONE $2)";
const TODAY_END =
  "((date_trunc('day', now() AT TIME ZONE $2) + interval '1 day') AT TIME ZONE $2)";
const PROFESSIONAL = 'AND ($9::uuid IS NULL OR a."professionalId" = $9::uuid)';
const BILLABLE = "a.status IN ('AGENDADA', 'CONFIRMADA', 'CONCLUIDA')";

const toNumber = (value: unknown) => Number(value ?? 0);

/** Agregações do dashboard. Todas escopadas por clínica (multi-tenant). */
@Injectable()
export class DashboardRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /**
   * O Postgres recusa parâmetros que a consulta não referencia ("could not determine data
   * type"). O CTE abaixo referencia e tipa todos, para as consultas usarem só o que precisam.
   */
  private query<T>(
    sql: string,
    period: Period,
    scope: Scope,
    extra: unknown[] = [],
  ) {
    const extraCasts = extra.map((_, i) => `, $${10 + i}::int`).join('');
    const typed = `WITH _params AS (SELECT $1::uuid, $2::text, $3::int, $4::int, $5::int, $6::int, $7::int, $8::int, $9::uuid${extraCasts}) `;
    return this.dataSource.query<T[]>(typed + sql, [
      scope.clinicId,
      period.tz,
      period.year,
      period.month,
      period.nextYear,
      period.nextMonth,
      period.prevYear,
      period.prevMonth,
      scope.professionalId,
      ...extra,
    ]);
  }

  appointmentsByStatusInMonth(period: Period, scope: Scope) {
    return this.query<StatusCount>(
      `SELECT a.status::varchar AS status, count(*)::int AS count
       FROM appointments a
       WHERE a."clinicId" = $1 ${PROFESSIONAL}
         AND a."startsAt" >= ${START} AND a."startsAt" < ${END}
       GROUP BY a.status`,
      period,
      scope,
    );
  }

  appointmentsByStatusToday(period: Period, scope: Scope) {
    return this.query<StatusCount>(
      `SELECT a.status::varchar AS status, count(*)::int AS count
       FROM appointments a
       WHERE a."clinicId" = $1 ${PROFESSIONAL}
         AND a."startsAt" >= ${TODAY_START} AND a."startsAt" < ${TODAY_END}
       GROUP BY a.status`,
      period,
      scope,
    );
  }

  /** Consultas concluídas e ainda não pagas no mês. */
  async unpaid(period: Period, scope: Scope) {
    const [row] = await this.query<{ count: number; amount: string }>(
      `SELECT count(*)::int AS count, COALESCE(sum(a.price), 0) AS amount
       FROM appointments a
       WHERE a."clinicId" = $1 ${PROFESSIONAL}
         AND a.status = 'CONCLUIDA' AND a.paid = false
         AND a."startsAt" >= ${START} AND a."startsAt" < ${END}`,
      period,
      scope,
    );
    return { count: row.count, amount: toNumber(row.amount) };
  }

  /** Recebido (pagos com data de pagamento no mês) e a receber (faturáveis do mês não pagos). */
  async revenue(period: Period, scope: Scope) {
    const [row] = await this.query<{ received: string; receivable: string }>(
      `SELECT
         COALESCE(sum(a.price) FILTER (
           WHERE a.paid AND a."paidAt" >= ${START} AND a."paidAt" < ${END}), 0) AS received,
         COALESCE(sum(a.price) FILTER (
           WHERE NOT a.paid AND ${BILLABLE}
             AND a."startsAt" >= ${START} AND a."startsAt" < ${END}), 0) AS receivable
       FROM appointments a
       WHERE a."clinicId" = $1 ${PROFESSIONAL}`,
      period,
      scope,
    );
    return {
      received: toNumber(row.received),
      receivable: toNumber(row.receivable),
    };
  }

  /** Despesas pagas no mês (por data de pagamento) e pendentes (por vencimento no mês). */
  async expenses(period: Period, scope: Scope) {
    const [row] = await this.query<{ paid: string; pending: string }>(
      `SELECT
         COALESCE(sum(e.amount) FILTER (
           WHERE e.paid AND e."paidAt" >= ${START} AND e."paidAt" < ${END}), 0) AS paid,
         COALESCE(sum(e.amount) FILTER (
           WHERE NOT e.paid
             AND e."dueDate" >= make_date($3::int, $4::int, 1)
             AND e."dueDate" < make_date($5::int, $6::int, 1)), 0) AS pending
       FROM expenses e
       WHERE e."clinicId" = $1`,
      period,
      scope,
    );
    return { paid: toNumber(row.paid), pending: toNumber(row.pending) };
  }

  async patients(period: Period, scope: Scope) {
    const [row] = await this.query<{
      endOfMonth: number;
      startOfMonth: number;
      newInMonth: number;
    }>(
      `SELECT
         count(*) FILTER (WHERE p."createdAt" < ${END})::int AS "endOfMonth",
         count(*) FILTER (WHERE p."createdAt" < ${START})::int AS "startOfMonth",
         count(*) FILTER (
           WHERE p."createdAt" >= ${START} AND p."createdAt" < ${END})::int AS "newInMonth"
       FROM patients p
       WHERE p."clinicId" = $1`,
      period,
      scope,
    );
    return row;
  }

  /** Repasses do profissional: lançados e não pagos, e pagos dentro do mês. */
  async payoutSummary(
    period: Period,
    clinicId: string,
    professionalId: string,
  ) {
    const [row] = await this.query<{ pending: string; received: string }>(
      `SELECT
         COALESCE(sum(p.amount) FILTER (WHERE NOT e.paid), 0) AS pending,
         COALESCE(sum(p.amount) FILTER (
           WHERE e.paid AND e."paidAt" >= ${START} AND e."paidAt" < ${END}), 0) AS received
       FROM payouts p
       INNER JOIN expenses e ON e.id = p."expenseId"
       WHERE p."clinicId" = $1 AND p."professionalId" = $9::uuid`,
      period,
      { clinicId, professionalId },
    );
    return { pending: toNumber(row.pending), received: toNumber(row.received) };
  }

  /** Consultas pagas (qualquer período) ainda sem repasse: o que seria repassado agora. */
  async payoutBacklog(
    period: Period,
    clinicId: string,
    professionalId: string,
  ) {
    const [row] = await this.query<{ count: number; cents: string | null }>(
      `SELECT count(*)::int AS count, sum(round(a.price * 100))::bigint AS cents
       FROM appointments a
       WHERE a."clinicId" = $1 AND a."professionalId" = $9::uuid
         AND a.paid = true AND a."payoutId" IS NULL AND a."paidAt" <= now()`,
      period,
      { clinicId, professionalId },
    );
    return { count: row.count, grossCents: Number(row.cents ?? 0) };
  }

  /**
   * Repasses ainda não lançados sobre a receita do mês: o que já foi pago e não repassado
   * mais o que ainda será pago, cada um com o percentual do seu profissional.
   */
  async payoutsNotYetLaunched(period: Period, scope: Scope) {
    const [row] = await this.query<{ amount: string }>(
      `SELECT COALESCE(sum(a.price * pr."payoutPercent" / 100) FILTER (
                WHERE a.paid AND a."payoutId" IS NULL
                  AND a."paidAt" >= ${START} AND a."paidAt" < ${END}), 0)
            + COALESCE(sum(a.price * pr."payoutPercent" / 100) FILTER (
                WHERE NOT a.paid AND ${BILLABLE}
                  AND a."startsAt" >= ${START} AND a."startsAt" < ${END}), 0) AS amount
       FROM appointments a
       INNER JOIN professionals pr ON pr.id = a."professionalId"
       WHERE a."clinicId" = $1 AND pr."payoutPercent" IS NOT NULL`,
      period,
      scope,
    );
    return toNumber(row.amount);
  }

  /** Consultas confirmadas hoje do profissional que ainda não têm ficha ativa. */
  pendingRecordsToday(
    period: Period,
    clinicId: string,
    professionalId: string,
  ) {
    return this.query<{
      appointmentId: string;
      startsAt: Date;
      patientId: string;
      patientName: string;
    }>(
      `SELECT a.id AS "appointmentId", a."startsAt", p.id AS "patientId", p.name AS "patientName"
       FROM appointments a
       INNER JOIN patients p ON p.id = a."patientId"
       WHERE a."clinicId" = $1 AND a."professionalId" = $9::uuid
         AND a.status = 'CONFIRMADA'
         AND a."startsAt" >= ${TODAY_START} AND a."startsAt" < ${TODAY_END}
         AND NOT EXISTS (
           SELECT 1 FROM medical_record_entries e
           WHERE e."appointmentId" = a.id AND e."parentEntryId" IS NULL AND e.status = 'ATIVA')
       ORDER BY a."startsAt"`,
      period,
      { clinicId, professionalId },
    );
  }

  /**
   * Receita recebida e consultas (não canceladas) no mês e no mês anterior, até o mesmo
   * ponto do mês (se o mês está em andamento, compara só os dias já decorridos).
   */
  async growthWindows(period: Period, scope: Scope) {
    const cut = `GREATEST(${START}, LEAST(${END}, now()))`;
    const prevCut = `(${PREV} + (${cut} - ${START}))`;
    const [row] = await this.query<{
      revenueCurrent: string;
      revenuePrevious: string;
      appointmentsCurrent: number;
      appointmentsPrevious: number;
    }>(
      `SELECT
         COALESCE(sum(a.price) FILTER (
           WHERE a.paid AND a."paidAt" >= ${START} AND a."paidAt" < ${cut}), 0) AS "revenueCurrent",
         COALESCE(sum(a.price) FILTER (
           WHERE a.paid AND a."paidAt" >= ${PREV} AND a."paidAt" < ${prevCut}), 0) AS "revenuePrevious",
         count(*) FILTER (
           WHERE a.status <> 'CANCELADA'
             AND a."startsAt" >= ${START} AND a."startsAt" < ${cut})::int AS "appointmentsCurrent",
         count(*) FILTER (
           WHERE a.status <> 'CANCELADA'
             AND a."startsAt" >= ${PREV} AND a."startsAt" < ${prevCut})::int AS "appointmentsPrevious"
       FROM appointments a
       WHERE a."clinicId" = $1 ${PROFESSIONAL}`,
      period,
      scope,
    );
    return {
      revenueCurrent: toNumber(row.revenueCurrent),
      revenuePrevious: toNumber(row.revenuePrevious),
      appointmentsCurrent: row.appointmentsCurrent,
      appointmentsPrevious: row.appointmentsPrevious,
    };
  }

  /** Receita recebida por mês (AAAA-MM) desde `fromYear/fromMonth` até o fim do mês consultado. */
  async revenueByMonth(
    period: Period,
    scope: Scope,
    from: { year: number; month: number },
  ) {
    const rows = await this.query<{ month: string; total: string }>(
      `SELECT to_char(date_trunc('month', a."paidAt" AT TIME ZONE $2), 'YYYY-MM') AS month,
              sum(a.price) AS total
       FROM appointments a
       WHERE a."clinicId" = $1 ${PROFESSIONAL}
         AND a.paid AND a."paidAt" >= make_timestamptz($10::int, $11::int, 1, 0, 0, 0, $2)
         AND a."paidAt" < ${END}
       GROUP BY 1`,
      period,
      scope,
      [from.year, from.month],
    );
    return new Map(rows.map((r) => [r.month, toNumber(r.total)]));
  }

  async expensesByMonth(
    period: Period,
    scope: Scope,
    from: { year: number; month: number },
  ) {
    const rows = await this.query<{ month: string; total: string }>(
      `SELECT to_char(date_trunc('month', e."paidAt" AT TIME ZONE $2), 'YYYY-MM') AS month,
              sum(e.amount) AS total
       FROM expenses e
       WHERE e."clinicId" = $1
         AND e.paid AND e."paidAt" >= make_timestamptz($10::int, $11::int, 1, 0, 0, 0, $2)
         AND e."paidAt" < ${END}
       GROUP BY 1`,
      period,
      scope,
      [from.year, from.month],
    );
    return new Map(rows.map((r) => [r.month, toNumber(r.total)]));
  }

  /** Receita recebida por dia do mês (mês consultado e mês anterior). */
  async revenueByDay(period: Period, scope: Scope) {
    const rows = await this.query<{
      which: 'current' | 'previous';
      day: number;
      total: string;
    }>(
      `SELECT CASE WHEN a."paidAt" >= ${START} THEN 'current' ELSE 'previous' END AS which,
              EXTRACT(day FROM a."paidAt" AT TIME ZONE $2)::int AS day,
              sum(a.price) AS total
       FROM appointments a
       WHERE a."clinicId" = $1 ${PROFESSIONAL}
         AND a.paid AND a."paidAt" >= ${PREV} AND a."paidAt" < ${END}
       GROUP BY 1, 2`,
      period,
      scope,
    );
    return rows.map((r) => ({
      which: r.which,
      day: r.day,
      total: toNumber(r.total),
    }));
  }

  async revenueByProfessional(period: Period, scope: Scope) {
    const rows = await this.query<{
      professionalId: string;
      name: string | null;
      received: string;
      count: number;
    }>(
      `SELECT pr.id AS "professionalId", u.name, sum(a.price) AS received, count(*)::int AS count
       FROM appointments a
       INNER JOIN professionals pr ON pr.id = a."professionalId"
       LEFT JOIN users u ON u.id = pr."userId"
       WHERE a."clinicId" = $1 ${PROFESSIONAL}
         AND a.paid AND a."paidAt" >= ${START} AND a."paidAt" < ${END}
       GROUP BY pr.id, u.name
       ORDER BY received DESC`,
      period,
      scope,
    );
    return rows.map((r) => ({ ...r, received: toNumber(r.received) }));
  }

  async revenueByPaymentMethod(period: Period, scope: Scope) {
    const rows = await this.query<{
      method: string | null;
      total: string;
      count: number;
    }>(
      `SELECT a."paymentMethod"::varchar AS method, sum(a.price) AS total, count(*)::int AS count
       FROM appointments a
       WHERE a."clinicId" = $1 ${PROFESSIONAL}
         AND a.paid AND a."paidAt" >= ${START} AND a."paidAt" < ${END}
       GROUP BY a."paymentMethod"
       ORDER BY total DESC`,
      period,
      scope,
    );
    return rows.map((r) => ({ ...r, total: toNumber(r.total) }));
  }
}
