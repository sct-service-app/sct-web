/**
 * Утилиты wizard'а записи на сервис.
 *
 * Два источника времени, переключаются флагом `useSlotsApiEnabled`:
 *  - НОВЫЙ (бэк PR #11): GET available-slots отдаёт только реально свободные
 *    старты с учётом длительности услуги и занятости боксов — `slotsFromApi`;
 *  - СТАРЫЙ: бэк отдаёт лишь часы работы (opens_at/closes_at) на день, и мы
 *    режем их по 30 минут сами — `buildTimeSlots`. Про занятость не знает.
 *    TODO: удалить вместе с флагом, когда PR #11 задеплоен на прод.
 */
import type { StationScheduleDay } from '@/features/service-stations/types'
import { hasApiErrorCode, type ParsedApiError } from '@/features/auth/errors'
import type { AvailableSlotsData } from './api'

export interface TimeSlot {
  /**
   * Что уходит в выбор и потом в `preferred_datetime`:
   *  - новый флоу — строка бэка как есть, со смещением (`2026-10-15T09:00:00+05:00`);
   *  - старый — локальное `YYYY-MM-DDTHH:mm`, в UTC его переводит `localIsoToUtcIso`.
   */
  value: string
  /** Лейбл для UI — `09:30` */
  label: string
  /** Час начала слота (для сегментации «утро/день/вечер») */
  hour: number
  /** Если слот в прошлом — блокируем (только старый флоу, для is_today) */
  inPast?: boolean
}

const SLOT_STEP_MIN = 30

/**
 * Слоты из ответа available-slots. Ничего не достраиваем и не фильтруем:
 * прошедшее время и занятые боксы бэк уже отсёк.
 *
 * Часы берём прямо из строки бэка (`…T09:30:00+05:00` → `09:30`), а не через
 * `new Date()`: это время филиала, и оно не должно уехать, если у телефона
 * или ноутбука другой часовой пояс.
 */
export function slotsFromApi(data: AvailableSlotsData): TimeSlot[] {
  const slots: TimeSlot[] = []
  for (const { datetime } of data.slots) {
    const m = /T(\d{2}):(\d{2})/.exec(datetime)
    if (!m) continue
    slots.push({ value: datetime, label: `${m[1]}:${m[2]}`, hour: Number(m[1]) })
  }
  return slots
}

/**
 * Строим временные слоты из расписания дня (старый флоу).
 * Возвращает пустой массив для is_closed дней.
 *
 * @param day        — день из schedule филиала
 * @param firstAllowed — самое раннее допустимое время (для is_today: now+30min)
 */
export function buildTimeSlots(day: StationScheduleDay, firstAllowed?: Date): TimeSlot[] {
  if (day.is_closed || !day.available) return []
  const [openH, openM] = day.opens_at.split(':').map((s) => Number(s))
  const [closeH, closeM] = day.closes_at.split(':').map((s) => Number(s))
  const [year, month, dayNum] = day.date.split('-').map((s) => Number(s))

  const slots: TimeSlot[] = []
  let h = openH
  let m = openM
  while (h < closeH || (h === closeH && m <= closeM - SLOT_STEP_MIN)) {
    const slotDate = new Date(year, month - 1, dayNum, h, m)
    const value =
      `${year}-${pad(month)}-${pad(dayNum)}T${pad(h)}:${pad(m)}`
    const inPast = firstAllowed ? slotDate.getTime() < firstAllowed.getTime() : false
    slots.push({
      value,
      label: `${pad(h)}:${pad(m)}`,
      hour: h,
      inPast,
    })
    m += SLOT_STEP_MIN
    if (m >= 60) {
      m -= 60
      h += 1
    }
  }
  return slots
}

/** Разделяем слоты на «Утро / День / Вечер» как в дизайне booking_workflow. */
export function groupSlotsByPeriod(slots: TimeSlot[]) {
  const morning = slots.filter((s) => s.hour < 12)
  const day = slots.filter((s) => s.hour >= 12 && s.hour < 18)
  const evening = slots.filter((s) => s.hour >= 18)
  return { morning, day, evening }
}

/**
 * Конвертирует «YYYY-MM-DDTHH:mm» в локальной таймзоне в ISO 8601 UTC,
 * который ждёт бэк. JS new Date() с такой строкой понимает её как local.
 * Строку со смещением (новый флоу) тоже переводит корректно.
 */
export function localIsoToUtcIso(localIso: string): string {
  return new Date(localIso).toISOString()
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/**
 * Значение слота → ISO для бэка. Слот бэка уже со смещением — отдаём как
 * есть; локальный `YYYY-MM-DDTHH:mm` (старый флоу или откат при сбое
 * available-slots) переводим в UTC.
 */
export function slotToIso(value: string): string {
  return /(Z|[+-]\d{2}:?\d{2})$/.test(value) ? value : localIsoToUtcIso(value)
}

/** Лейбл дня для карусели: «Пт / 24 апр». Используется в калькуляторе. */
export function dayShortLabel(day: StationScheduleDay): { weekday: string; date: string } {
  const [y, m, d] = day.date.split('-').map((s) => Number(s))
  const dt = new Date(y, m - 1, d)
  const weekday = dt.toLocaleDateString('ru-RU', { weekday: 'short' }).toUpperCase()
  const date = dt.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
  return { weekday, date }
}

/**
 * Отказ create_booking из-за занятости (бэк PR #11). Бэк повторно проверяет
 * время при POST: пока человек выбирал, слот мог занять другой клиент.
 *  - `slot_taken`  — времени больше нет: сбросить выбор и перезапросить слоты;
 *  - `day_closed`  — филиал в этот день не работает: выбрать другую дату;
 *  - `unavailable` — у филиала не настроены боксы/длительности.
 */
export type BookingConflict = 'slot_taken' | 'day_closed' | 'unavailable'

export function bookingConflict(parsed: ParsedApiError): { kind: BookingConflict; message: string } | null {
  if (hasApiErrorCode(parsed, 'BOOKING_SLOT_UNAVAILABLE')) {
    return {
      kind: 'slot_taken',
      message: 'Это время только что заняли. Выберите другое свободное время.',
    }
  }
  if (hasApiErrorCode(parsed, 'BOOKING_STATION_CLOSED')) {
    return {
      kind: 'day_closed',
      message: 'В этот день филиал не принимает записи. Выберите другую дату.',
    }
  }
  if (hasApiErrorCode(parsed, 'BOOKING_CONFIGURATION_ERROR')) {
    return {
      kind: 'unavailable',
      message: 'Онлайн-запись в этот филиал временно недоступна. Выберите другой филиал или позвоните нам.',
    }
  }
  return null
}
