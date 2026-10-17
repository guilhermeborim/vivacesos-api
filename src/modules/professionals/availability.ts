import {
  CLINIC_TZ,
  localParts,
  zonedToUtc,
} from '../../common/utils/clinic-time.js';

/** Faixa de atendimento num dia da semana, em minutos desde 00:00 (sempre horas cheias). */
export interface AvailabilityRange {
  weekday: number;
  startMinute: number;
  endMinute: number;
}

export interface AvailabilityDay {
  weekday: number;
  hours: number[];
}

/** Marca de horas (8, 9, 10) → faixas contíguas mescladas ([8h–11h]). */
export function hoursToRanges(days: AvailabilityDay[]): AvailabilityRange[] {
  const ranges: AvailabilityRange[] = [];
  for (const day of days) {
    const hours = [...new Set(day.hours)].sort((a, b) => a - b);
    let start: number | null = null;
    let previous: number | null = null;
    for (const hour of hours) {
      if (start === null) {
        start = hour;
      } else if (hour !== previous! + 1) {
        ranges.push({
          weekday: day.weekday,
          startMinute: start * 60,
          endMinute: (previous! + 1) * 60,
        });
        start = hour;
      }
      previous = hour;
    }
    if (start !== null) {
      ranges.push({
        weekday: day.weekday,
        startMinute: start * 60,
        endMinute: (previous! + 1) * 60,
      });
    }
  }
  return ranges;
}

/** Faixas → horas marcadas por dia da semana (para a grade da tela). */
export function rangesToDays(ranges: AvailabilityRange[]): AvailabilityDay[] {
  const byDay = new Map<number, number[]>();
  for (const r of ranges) {
    const hours = byDay.get(r.weekday) ?? [];
    for (let m = r.startMinute; m < r.endMinute; m += 60) hours.push(m / 60);
    byDay.set(r.weekday, hours);
  }
  return [...byDay.entries()]
    .sort(([a], [b]) => a - b)
    .map(([weekday, hours]) => ({
      weekday,
      hours: hours.sort((a, b) => a - b),
    }));
}

/**
 * O intervalo inteiro [start, end) precisa caber numa faixa do dia da semana (fuso da clínica).
 * Consulta que vira o dia só é aceita se terminar exatamente à meia-noite.
 */
export function isWithinAvailability(
  ranges: AvailabilityRange[],
  start: Date,
  end: Date,
  tz = CLINIC_TZ,
) {
  const s = localParts(start, tz);
  const e = localParts(end, tz);
  let endMinute = e.minutes;
  if (e.date !== s.date) {
    if (e.minutes !== 0) return false;
    endMinute = 1440;
  }
  return ranges.some(
    (r) =>
      r.weekday === s.weekday &&
      s.minutes >= r.startMinute &&
      endMinute <= r.endMinute,
  );
}

export interface Slot {
  startsAt: Date;
  endsAt: Date;
}

/** Expediente padrão de quem atende em qualquer horário (só para desenhar a grade). */
export const DEFAULT_DAY_RANGE = { startMinute: 7 * 60, endMinute: 19 * 60 };

/** Grade do dia: um horário por consulta, no passo da duração, dentro de cada faixa do dia da semana. */
export function daySlots(
  date: string,
  ranges: AvailabilityRange[],
  durationMinutes = 60,
  tz = CLINIC_TZ,
): Slot[] {
  const weekday = localParts(zonedToUtc(date, 12 * 60, tz), tz).weekday;
  const slots: Slot[] = [];
  for (const r of ranges.filter((range) => range.weekday === weekday)) {
    for (
      let m = r.startMinute;
      m + durationMinutes <= r.endMinute;
      m += durationMinutes
    ) {
      slots.push({
        startsAt: zonedToUtc(date, m, tz),
        endsAt: zonedToUtc(date, m + durationMinutes, tz),
      });
    }
  }
  return slots.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}

/** Horários livres numa data, no passo da duração: dentro da faixa do dia, sem consulta em aberto e no futuro. */
export function freeSlots(
  date: string,
  ranges: AvailabilityRange[],
  busy: { startsAt: Date; endsAt: Date }[],
  durationMinutes = 60,
  now = new Date(),
  tz = CLINIC_TZ,
): Slot[] {
  return daySlots(date, ranges, durationMinutes, tz).filter(
    ({ startsAt, endsAt }) =>
      startsAt > now &&
      !busy.some((b) => b.startsAt < endsAt && b.endsAt > startsAt),
  );
}
