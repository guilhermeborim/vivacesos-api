/** Fuso padrão da clínica (mesmo usado nos jobs). Um fuso por clínica fica como evolução. */
export const CLINIC_TZ = 'America/Sao_Paulo';

interface LocalParts {
  /** Data local AAAA-MM-DD. */
  date: string;
  /** 0 = domingo … 6 = sábado. */
  weekday: number;
  /** Minutos desde 00:00 local. */
  minutes: number;
}

const WEEKDAYS: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

const formatter = (tz: string) =>
  new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hourCycle: 'h23',
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

/** Data, dia da semana e minutos de um instante no fuso informado. */
export function localParts(instant: Date, tz = CLINIC_TZ): LocalParts {
  const parts = formatter(tz).formatToParts(instant);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    weekday: WEEKDAYS[get('weekday')],
    minutes: Number(get('hour')) * 60 + Number(get('minute')),
  };
}

/** Diferença (local − UTC) em ms de um instante no fuso. */
function offsetMs(instant: Date, tz: string) {
  const { date, minutes } = localParts(instant, tz);
  const [y, m, d] = date.split('-').map(Number);
  const asUtc = Date.UTC(y, m - 1, d, 0, minutes);
  return asUtc - Math.floor(instant.getTime() / 60_000) * 60_000;
}

/** Instante UTC de uma data/hora local ("2026-10-16", 14*60) no fuso informado. */
export function zonedToUtc(date: string, minutes: number, tz = CLINIC_TZ) {
  const [y, m, d] = date.split('-').map(Number);
  const wall = Date.UTC(y, m - 1, d, 0, minutes);
  let utc = wall - offsetMs(new Date(wall), tz);
  const second = offsetMs(new Date(utc), tz);
  utc = wall - second;
  return new Date(utc);
}
