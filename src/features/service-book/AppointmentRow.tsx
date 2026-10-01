/**
 * Карточка одного визита (по дизайну new_screens).
 *
 * highlighted (ближайший визит): тёмная navy-карточка — бейдж «Ближайший
 *   визит», жёлтая точка в углу, крупное время + жёлтая дата, услуга, филиал,
 *   кнопка «Изменить».
 * обычный (запланированный): светлая карточка — статус-бейдж, время + синяя
 *   дата, услуга, филиал, кнопка «Детали».
 *
 * Кнопка отмены (×) в дизайне есть, но cancel-эндпоинт отсутствует
 * (BACKEND_NOTES §4.2) — поэтому не выводим, пока бэк не подключит.
 */
import { Link } from 'react-router-dom'
import type { Booking } from '@/features/bookings/types'
import { isBookingCancelled, visitTimeRange } from '@/features/bookings/lib'
import { cn } from '@/shared/lib/cn'

interface AppointmentRowProps {
  appointment: Booking
  highlighted?: boolean
}

function splitDateTime(iso: string | null, endIso: string | null) {
  if (!iso) return { time: '—', date: '—' }
  const d = new Date(iso)
  const hhmm = (x: Date) => x.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  // Конец визита есть только у записей после бэк PR #11: «16:00–18:00».
  const end = endIso ? new Date(endIso) : null
  const time = end && end.getTime() > d.getTime() ? `${hhmm(d)}–${hhmm(end)}` : hhmm(d)
  const day = d.toLocaleDateString('ru-RU', { day: 'numeric' })
  const month = d.toLocaleDateString('ru-RU', { month: 'long' })
  const weekday = d.toLocaleDateString('ru-RU', { weekday: 'short' })
  return { time, date: `${day} ${month}, ${weekday}`.toUpperCase() }
}

export function AppointmentRow({ appointment, highlighted }: AppointmentRowProps) {
  const { start, end } = visitTimeRange(appointment)
  const { time, date } = splitDateTime(start, end)
  const svc = appointment.service_data
  const isDefault = appointment.service_source_type === 'default_service_page'
  const title =
    svc?.title ||
    appointment.service_package_data?.title ||
    appointment.default_service_page_data?.title ||
    'Услуга'
  const typeLabel = isDefault ? 'Дефолтная услуга' : 'Точный пакет'
  const priceLabel = appointment.service_package_data?.price?.display || svc?.price?.display || ''
  const station = appointment.service_station_data?.address?.trim()
  const isHighlighted = highlighted

  if (isHighlighted) {
    return (
      <article className="relative overflow-hidden rounded-sct-lg bg-navy p-5 text-white md:p-6">
        <span className="absolute right-5 top-5 h-2.5 w-2.5 rounded-full bg-brandYellow" />
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <span className="inline-block rounded-md bg-brandBlue px-2.5 py-1 text-[10px] font-900 uppercase tracking-widest text-white">
              Ближайший визит
            </span>
            <div className="mt-3 flex items-baseline gap-3">
              <span className="text-3xl font-900 leading-none tracking-tighter md:text-4xl">
                {time}
              </span>
              <span className="text-sm font-900 uppercase tracking-tight text-brandYellow">
                {date}
              </span>
            </div>
            <p className="mt-2 truncate text-base font-900 uppercase tracking-tight">{title}</p>
            <p className="mt-1 truncate text-[11px] font-bold uppercase tracking-widest text-brandYellow">
              {typeLabel}{priceLabel ? ` · ${priceLabel}` : ''}
            </p>
            {station && (
              <p className="mt-0.5 truncate text-[11px] font-bold uppercase tracking-widest text-white/50">
                {station}
              </p>
            )}
          </div>
          <Link
            to={`/bookings/${appointment.id}`}
            className="shrink-0 self-start rounded-sct bg-white px-5 py-2.5 text-[11px] font-900 uppercase tracking-widest text-textPrimary transition-all hover:bg-brandYellow md:self-auto"
          >
            Изменить
          </Link>
        </div>
      </article>
    )
  }

  const isCancelled = isBookingCancelled(appointment.status)

  return (
    <article
      className={cn(
        'rounded-sct border p-4 transition-all md:p-5',
        isCancelled
          ? 'border-borderLight bg-surfaceLight/40'
          : 'border-borderLight bg-white hover:border-brandBlue/40 hover:shadow-soft-card',
      )}
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <span
            className={cn(
              'inline-block rounded-md px-2.5 py-1 text-[10px] font-900 uppercase tracking-widest',
              isCancelled
                ? 'bg-red-50 text-red-500'
                : 'bg-surfaceMuted text-textSecondary',
            )}
          >
            {appointment.status_label || (isCancelled ? 'Отменено' : 'Запланировано')}
          </span>
          <div className="mt-2 flex items-baseline gap-3">
            <span
              className={cn(
                'text-2xl font-900 leading-none tracking-tighter md:text-3xl',
                isCancelled ? 'text-textSecondary' : 'text-textPrimary',
              )}
            >
              {time}
            </span>
            <span
              className={cn(
                'text-sm font-900 uppercase tracking-tight',
                isCancelled ? 'text-textSecondary/70' : 'text-brandBlue',
              )}
            >
              {date}
            </span>
          </div>
          <p
            className={cn(
              'mt-2 truncate text-sm font-900 uppercase tracking-tight md:text-base',
              isCancelled ? 'text-textSecondary' : 'text-textPrimary',
            )}
          >
            {title}
          </p>
          <p className="mt-1 truncate text-[11px] font-bold uppercase tracking-widest text-textSecondary">
            {typeLabel}{priceLabel ? ` · ${priceLabel}` : ''}
          </p>
          {station && (
            <p className="mt-0.5 truncate text-[11px] font-bold uppercase tracking-widest text-textSecondary">
              {station}
            </p>
          )}
        </div>
        <Link
          to={`/bookings/${appointment.id}`}
          className="shrink-0 self-start rounded-sct border border-borderLight bg-white px-4 py-2.5 text-[10px] font-900 uppercase tracking-widest text-textSecondary transition-all hover:border-brandBlue hover:text-brandBlue"
        >
          Детали
        </Link>
      </div>
    </article>
  )
}
