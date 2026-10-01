/**
 * Карточка одного визита (записи на сервис) — для блока «Запланированные»
 * и «История». Активный визит выделяется тёмным фоном и пульсирующей точкой,
 * остальные — белой карточкой.
 */
import { Link } from 'react-router-dom'
import type { Appointment } from './types'
import { cn } from '@/shared/lib/cn'
import { formatDateTimeRange } from '@/shared/lib/format'
import { visitTimeRange } from '@/features/bookings/lib'

interface AppointmentCardProps {
  appointment: Appointment
  highlighted?: boolean
}

export function AppointmentCard({ appointment, highlighted }: AppointmentCardProps) {
  const { start, end } = visitTimeRange(appointment)

  const isActive = appointment.is_active
  const isCancelled = appointment.is_cancelled

  const tone: 'dark' | 'light' | 'muted' =
    highlighted || isActive ? 'dark' : isCancelled ? 'muted' : 'light'

  return (
    <Link
      to={`/bookings/${appointment.id}`}
      className={cn(
        'relative block overflow-hidden rounded-sct-lg border p-5 no-underline transition-all md:p-6',
        tone === 'dark' && 'border-textPrimary bg-textPrimary text-white shadow-2xl hover:bg-textPrimary/90',
        tone === 'light' && 'border-borderLight bg-white shadow-sct-soft hover:-translate-y-0.5 hover:border-brandBlue/40 hover:shadow-soft-card',
        tone === 'muted' && 'border-borderLight bg-surfaceLight/40 text-textSecondary hover:border-brandBlue/30',
      )}
    >
      {tone === 'dark' && (
        <div className="pointer-events-none absolute -right-16 -top-16 h-32 w-32 rounded-full bg-brandBlue/20 blur-3xl" />
      )}

      <header className="relative z-10 mb-3 flex items-start justify-between gap-3">
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[10px] font-900 uppercase tracking-widest',
            tone === 'dark' && 'bg-brandBlue text-white',
            tone === 'light' && 'bg-surfaceLight text-textSecondary',
            tone === 'muted' && 'bg-surfaceMuted text-textSecondary/70',
          )}
        >
          {tone === 'dark' && (
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brandYellow" />
          )}
          {appointment.status_label}
        </span>
      </header>

      <div className="relative z-10">
        <p
          className={cn(
            'text-2xl font-900 leading-none tracking-tighter',
            tone === 'dark' ? 'text-white' : 'text-textPrimary',
          )}
        >
          {formatDateTimeRange(start, end)}
        </p>
        <p
          className={cn(
            'mt-2 text-sm font-bold uppercase tracking-tight',
            tone === 'dark' ? 'text-white' : 'text-textSecondary',
          )}
        >
          {appointment.service?.title || appointment.service_package?.title || 'Услуга'}
        </p>
        <div
          className={cn(
            'mt-3 flex flex-wrap items-center gap-3 text-[10px] font-bold uppercase tracking-widest',
            tone === 'dark' ? 'text-white/60' : 'text-textSecondary/60',
          )}
        >
          {appointment.car.title && <span>{appointment.car.title}</span>}
          {appointment.car.license_plate && (
            <>
              <span className="h-1 w-1 rounded-full bg-current opacity-50" />
              <span className="font-mono">{appointment.car.license_plate}</span>
            </>
          )}
          {(appointment.service?.display_price || appointment.service_package?.display_price) && (
            <>
              <span className="h-1 w-1 rounded-full bg-current opacity-50" />
              <span>
                {appointment.service?.display_price || appointment.service_package?.display_price}
              </span>
            </>
          )}
        </div>
      </div>
    </Link>
  )
}
