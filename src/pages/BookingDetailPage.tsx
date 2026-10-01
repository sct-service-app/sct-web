/**
 * Детальная карточка записи на сервис.
 *
 * Маршрут: `/bookings/:id`. Сюда переходим из сервисной книжки.
 *
 * Бэк отдаёт богатую структуру через GET /service-book/bookings/{id}/:
 *   - статус и статус-label
 *   - 3 даты (preferred, scheduled, final)
 *   - snapshot полей (название пакета, авто, госномер)
 *   - объект car, service_package_data, service_station_data (опц.)
 *   - permissions: can_edit, can_cancel
 *
 * Действия:
 *   - «Изменить» → EditBookingModal (PATCH /bookings/{id}/) — РАБОТАЕТ
 *   - «Отменить» → CancelBookingModal (POST /bookings/{id}/cancel/) — РАБОТАЕТ
 */
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useBookingQuery, useCancelBookingMutation } from '@/features/bookings/queries'
import { EditBookingModal } from '@/features/bookings/EditBookingModal'
import { Modal } from '@/shared/ui/Modal'
import { Textarea } from '@/shared/ui/Textarea'
import { Spinner } from '@/shared/ui/Spinner'
import { Card } from '@/shared/ui/Card'
import { Button } from '@/shared/ui/Button'
import { toast } from '@/shared/ui/Toast'
import { parseApiError } from '@/features/auth/errors'
import { formatDateTime, formatDateTimeRange, formatDuration, formatMileage } from '@/shared/lib/format'
import { cn } from '@/shared/lib/cn'
import type { BookingStatus } from '@/features/bookings/types'
import { isBookingCancelled, visitTimeRange } from '@/features/bookings/lib'

export default function BookingDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params.id ? Number(params.id) : undefined
  const navigate = useNavigate()
  const { data, isLoading, isError, refetch } = useBookingQuery(id)
  const [editOpen, setEditOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const cancelMutation = useCancelBookingMutation(id ?? 0)

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <section className="container-sct py-12">
        <Card className="p-6 text-center">
          <p className="font-bold text-red-700">Запись не найдена или недоступна.</p>
          <div className="mt-4 flex justify-center gap-3">
            <Button variant="secondary" size="sm" onClick={() => refetch()}>
              Повторить
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate('/service-book')}>
              К сервисной книжке
            </Button>
          </div>
        </Card>
      </section>
    )
  }

  const { start, end } = visitTimeRange(data)
  const duration = formatDuration(data.duration_minutes)

  // Дискриминатор услуги: пакет ИЛИ дефолтная.
  const isDefault = data.service_source_type === 'default_service_page'
  const svc = data.service_data
  const pkg = data.service_package_data
  const def = data.default_service_page_data
  const title = svc?.title || pkg?.title || def?.title || 'Услуга'
  const typeLabel = isDefault ? 'Дефолтная услуга' : 'Точный пакет'
  const priceDisplay = isDefault
    ? def?.price_note || svc?.price?.display || 'Цена рассчитывается индивидуально'
    : pkg?.price?.display || data.price?.display || svc?.price?.display || '—'
  const descShort = isDefault ? def?.short_description : pkg?.short_description
  const descFull = isDefault ? def?.description : pkg?.description
  const detailId = svc?.id ?? (isDefault ? def?.id : pkg?.id)
  const detailHref = detailId
    ? isDefault
      ? `/services/default/${detailId}`
      : `/services/${detailId}`
    : null

  return (
    <section className="container-sct max-w-[920px] space-y-6 py-8 md:py-12">
      <Link
        to="/service-book"
        className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-textSecondary hover:text-brandBlue"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
        </svg>
        К сервисной книжке
      </Link>

      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={data.status} label={data.status_label} />
            <span className="rounded-full bg-surfaceMuted px-2.5 py-1 text-[10px] font-900 uppercase tracking-widest text-textSecondary">
              {typeLabel}
            </span>
            <span className="font-mono text-xs text-textSecondary">Запись #{data.id}</span>
          </div>
          <h1 className="mt-3 text-3xl font-900 uppercase leading-tight tracking-tight text-textPrimary md:text-4xl">
            {title}
          </h1>
        </div>
      </header>

      {/* Главные данные визита */}
      <Card className="p-6 md:p-8">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
          <Field
            label={duration ? `Дата и время · ${duration}` : 'Дата и время'}
            value={formatDateTimeRange(start, end)}
            accent="primary"
          />
          <Field
            label="Стоимость"
            value={priceDisplay || '—'}
            accent="primary"
          />
          {data.current_mileage_km != null && data.current_mileage_km > 0 && (
            <Field
              label="Пробег на момент записи"
              value={formatMileage(data.current_mileage_km)}
            />
          )}
        </div>
      </Card>

      {/* Авто */}
      <Card className="bg-surfaceLight/40 p-6">
        <p className="text-[10px] font-900 uppercase tracking-widest text-brandBlue">
          Автомобиль
        </p>
        <h3 className="mt-2 text-xl font-900 uppercase tracking-tighter text-textPrimary md:text-2xl">
          {data.car.nickname || data.car.title}
        </h3>
        <p className="mt-1 text-sm font-bold uppercase tracking-tight text-textSecondary">
          {data.car.full_title}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {data.car.license_plate && (
            <span className="rounded-lg bg-textPrimary px-3 py-1 font-mono text-[12px] font-900 uppercase tracking-widest text-white">
              {data.car.license_plate}
            </span>
          )}
          {data.car.vin_code && (
            <span className="font-mono text-[10px] uppercase tracking-widest text-textSecondary">
              VIN: {data.car.vin_code}
            </span>
          )}
        </div>
      </Card>

      {/* Описание услуги */}
      {(descShort || descFull || detailHref) && (
        <Card className="p-6">
          <p className="text-[10px] font-900 uppercase tracking-widest text-textSecondary">
            {isDefault ? 'Об услуге' : 'О пакете'}
          </p>
          {descShort && (
            <p className="mt-2 text-sm font-medium leading-relaxed text-textSecondary">{descShort}</p>
          )}
          {descFull && (
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-textPrimary">
              {descFull}
            </p>
          )}
          {detailHref && (
            <Link
              to={detailHref}
              className="mt-4 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-brandBlue hover:underline"
            >
              {isDefault ? 'Подробнее об услуге →' : 'Подробнее о пакете →'}
            </Link>
          )}
        </Card>
      )}

      {/* Комментарии */}
      {(data.comment || data.staff_comment) && (
        <Card className="space-y-4 p-6">
          {data.comment && (
            <div>
              <p className="text-[10px] font-900 uppercase tracking-widest text-textSecondary">
                Ваш комментарий
              </p>
              <p className="mt-2 whitespace-pre-line rounded-sct border border-borderLight bg-surfaceLight p-4 text-sm text-textPrimary">
                {data.comment}
              </p>
            </div>
          )}
          {data.staff_comment && (
            <div>
              <p className="text-[10px] font-900 uppercase tracking-widest text-textSecondary">
                Комментарий мастера
              </p>
              <p className="mt-2 whitespace-pre-line rounded-sct border border-blue-100 bg-blue-50/40 p-4 text-sm text-textPrimary">
                {data.staff_comment}
              </p>
            </div>
          )}
        </Card>
      )}

      {/* Действия */}
      <Card className="p-6">
        <p className="text-[10px] font-900 uppercase tracking-widest text-textSecondary">
          Действия
        </p>
        <div className="mt-4 flex flex-col gap-3 md:flex-row md:flex-wrap">
          <Button
            variant="secondary"
            disabled={!data.permissions.can_edit || isBookingCancelled(data.status)}
            title={
              data.permissions.can_edit
                ? 'Изменить филиал, дату или комментарий'
                : 'Изменение недоступно'
            }
            onClick={() => setEditOpen(true)}
          >
            Изменить
          </Button>
          <Button
            variant="danger"
            disabled={!data.permissions.can_cancel || isBookingCancelled(data.status)}
            title={
              data.permissions.can_cancel
                ? 'Отменить визит'
                : 'Отмена недоступна для текущего статуса'
            }
            onClick={() => {
              setCancelReason('')
              setCancelOpen(true)
            }}
          >
            Отменить
          </Button>
        </div>
      </Card>

      <Modal open={cancelOpen} onClose={() => setCancelOpen(false)} size="sm">
        <h2 className="mb-3 text-center text-2xl font-900 uppercase tracking-tight text-textPrimary">
          Отменить запись?
        </h2>
        <p className="mb-5 text-center text-sm text-textSecondary">
          Действие нельзя отменить. Можно оставить комментарий — мастер увидит причину.
        </p>
        <Textarea
          label="Причина отмены (необязательно)"
          rows={3}
          placeholder="Например: изменились планы, перенесу позже…"
          value={cancelReason}
          onChange={(e) => setCancelReason(e.target.value)}
        />
        <div className="mt-5 flex gap-3">
          <Button
            variant="ghost"
            fullWidth
            onClick={() => setCancelOpen(false)}
            disabled={cancelMutation.isPending}
          >
            Закрыть
          </Button>
          <Button
            variant="danger"
            fullWidth
            loading={cancelMutation.isPending}
            onClick={() => {
              cancelMutation.mutate(cancelReason.trim() || undefined, {
                onSuccess: () => {
                  toast.success('Запись отменена')
                  setCancelOpen(false)
                },
                onError: (err) => {
                  toast.error(parseApiError(err, 'Не удалось отменить запись.').general)
                },
              })
            }}
          >
            Отменить запись
          </Button>
        </div>
      </Modal>

      <EditBookingModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        booking={data}
      />

      {/* Служебные */}
      <Card className="bg-surfaceLight p-5 text-[11px] font-bold text-textSecondary">
        <ServiceRow label="Создано" value={formatDateTime(data.created_at)} />
        <ServiceRow label="Обновлено" value={formatDateTime(data.updated_at)} />
        {data.scheduled_datetime && data.scheduled_datetime !== data.preferred_datetime && (
          <ServiceRow
            label="Подтверждено на"
            value={formatDateTime(data.scheduled_datetime)}
          />
        )}
        {data.cancel_reason && (
          <ServiceRow label="Причина отмены" value={data.cancel_reason} />
        )}
      </Card>
    </section>
  )
}

function Field({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent?: 'primary'
}) {
  return (
    <div>
      <p className="text-[10px] font-900 uppercase tracking-widest text-textSecondary">
        {label}
      </p>
      <p
        className={cn(
          'mt-2 text-xl font-900 leading-none tracking-tighter md:text-2xl',
          accent === 'primary' ? 'text-brandBlue' : 'text-textPrimary',
        )}
      >
        {value}
      </p>
    </div>
  )
}

function ServiceRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="uppercase tracking-tighter text-textSecondary/70">{label}</span>
      <span className="text-textPrimary">{value || '—'}</span>
    </div>
  )
}

function StatusBadge({ status, label }: { status: BookingStatus; label: string }) {
  const cls =
    status === 'CREATED'
      ? 'bg-blue-50 text-brandBlue border-blue-100'
      : status === 'CONFIRMED'
      ? 'bg-green-50 text-green-700 border-green-100'
      : status === 'IN_PROGRESS'
      ? 'bg-amber-50 text-amber-700 border-amber-100'
      : status === 'COMPLETED'
      ? 'bg-surfaceMuted text-textSecondary border-borderLight'
      : isBookingCancelled(status)
      ? 'bg-red-50 text-red-700 border-red-100'
      : 'bg-surfaceLight text-textSecondary border-borderLight'
  return (
    <span
      className={cn(
        'inline-block rounded-full border px-3 py-1 text-[10px] font-900 uppercase tracking-widest',
        cls,
      )}
    >
      {label}
    </span>
  )
}
