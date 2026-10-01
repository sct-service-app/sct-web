/**
 * Запись на сервис (по дизайну new_screens): 3 шага.
 *
 * Сверху — тёмная сводка-бар (пакет + авто + «к оплате»), под ней
 * 3-сегментный прогресс. Шаги: филиал → время → детали. Авто не выбираем
 * отдельно — берём активное (или ?car_id=). После подтверждения — экран
 * «Визит подтверждён».
 *
 * Submit: POST /service-book/create_booking/ { client_car_id,
 * service_package_id, preferred_datetime, service_station_id, comment }.
 *
 * Пробег в дизайне не запрашивается — не отправляем current_mileage_km.
 *
 * Время: с бэк PR #11 (флаг `useSlotsApiEnabled`) — только свободные старты
 * из available-slots, `preferred_datetime` уходит строкой бэка как есть.
 * Бокс бэк выбирает сам. Если слот заняли, пока человек подтверждал, бэк
 * отвечает BOOKING_SLOT_UNAVAILABLE — возвращаем на шаг времени со свежим
 * списком. Без флага — старая нарезка часов работы.
 */
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { usePackageQuery, useDefaultServiceQuery } from '@/features/packages/queries'
import { useCarsQuery } from '@/features/garage/queries'
import { useCreateBookingMutation } from '@/features/bookings/queries'
import { Spinner } from '@/shared/ui/Spinner'
import { Card } from '@/shared/ui/Card'
import { Button } from '@/shared/ui/Button'
import { SafeImage } from '@/shared/ui/SafeImage'
import { parseApiError } from '@/features/auth/errors'
import { formatMoney, formatDateTimeRange, formatDuration } from '@/shared/lib/format'
import { getPackageShortTitle } from '@/features/packages/lib'
import { BranchStep } from '@/features/booking-wizard/BranchStep'
import { DateTimeStep } from '@/features/booking-wizard/DateTimeStep'
import { bookingConflict, slotToIso } from '@/features/booking-wizard/lib'
import { useAvailableSlotsQuery, useSlotsApiEnabled } from '@/features/booking-wizard/queries'
import type { SlotsService } from '@/features/booking-wizard/api'
import { cn } from '@/shared/lib/cn'
import type { ServiceStation } from '@/features/service-stations/types'
import type { ClientPackageItem } from '@/shared/api/types'

type Step = 'branch' | 'datetime' | 'confirm'
const STEP_ORDER: Step[] = ['branch', 'datetime', 'confirm']

export default function BookServicePage() {
  const params = useParams<{ id: string }>()
  const packageId = params.id ? Number(params.id) : undefined
  const [searchParams] = useSearchParams()

  const isDefault = searchParams.get('type') === 'default'
  const packageQuery = usePackageQuery(isDefault ? undefined : packageId)
  const defaultQuery = useDefaultServiceQuery(isDefault ? packageId : undefined)
  const sourceQuery = isDefault ? defaultQuery : packageQuery
  const carsQuery = useCarsQuery()
  const createMut = useCreateBookingMutation()

  const [step, setStep] = useState<Step>('branch')
  const [selectedBranch, setSelectedBranch] = useState<ServiceStation | null>(null)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [comment, setComment] = useState('')
  const [serverError, setServerError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  // П.2 ТЗ: «понимаю, что возможна живая очередь». Только блокирует кнопку,
  // на бэк не уходит (так договорились с бэком).
  const [queueAck, setQueueAck] = useState(false)

  const slotsApi = useSlotsApiEnabled()
  const slotsService: SlotsService | null =
    slotsApi && packageId
      ? isDefault
        ? { default_service_page_id: packageId }
        : { service_package_id: packageId }
      : null
  // Тот же запрос, что внутри DateTimeStep (общий кэш, второго похода нет):
  // нужен для длительности на подтверждении и перезапроса после отказа.
  const slotsQuery = useAvailableSlotsQuery(
    slotsService && selectedBranch && selectedDate
      ? { ...slotsService, service_station_id: selectedBranch.id, date: selectedDate }
      : null,
  )
  const durationMin = slotsService ? slotsQuery.data?.duration_minutes ?? null : null

  // Авто: из ?car_id=, иначе активное, иначе первое.
  const [selectedCarId, setSelectedCarId] = useState<number | null>(null)
  const urlCarId = useMemo(() => {
    const v = Number(searchParams.get('car_id'))
    return Number.isFinite(v) && v > 0 ? v : undefined
  }, [searchParams])

  useEffect(() => {
    if (!carsQuery.data || selectedCarId !== null) return
    const cars = carsQuery.data
    const byUrl = urlCarId && cars.find((c) => c.id === urlCarId)
    const active = cars.find((c) => c.is_default)
    const target = byUrl || active || cars[0]
    if (target) setSelectedCarId(target.id)
  }, [carsQuery.data, urlCarId, selectedCarId])

  if (sourceQuery.isLoading || carsQuery.isLoading || slotsApi === null) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner />
      </div>
    )
  }
  if (sourceQuery.isError || !sourceQuery.data) {
    return (
      <section className="container-sct py-12">
        <Card className="p-6 text-center">
          <p className="font-bold text-red-700">Услуга не найдена.</p>
          <Link to="/services" className="mt-4 inline-block">
            <Button variant="ghost" size="sm">К услугам</Button>
          </Link>
        </Card>
      </section>
    )
  }
  if (!carsQuery.data || carsQuery.data.length === 0) {
    return (
      <section className="container-sct py-12">
        <Card className="border-2 border-dashed border-borderLight p-10 text-center md:p-16">
          <h2 className="text-2xl font-900 uppercase tracking-tight text-textPrimary md:text-3xl">
            Сначала добавьте авто
          </h2>
          <p className="mx-auto mt-3 max-w-sm text-sm font-medium text-textSecondary">
            Чтобы записаться на сервис, в гараже должна быть хотя бы одна машина.
          </p>
          <Link to="/garage/add" className="mt-8 inline-block">
            <Button variant="dark" size="lg">Добавить авто</Button>
          </Link>
        </Card>
      </section>
    )
  }

  const cars = carsQuery.data
  const selectedCar = cars.find((c) => c.id === selectedCarId) ?? null

  // Унифицированная вьюмодель: точный пакет ИЛИ дефолтная услуга.
  const pkgData = packageQuery.data
  const dsData = defaultQuery.data
  const shortTitle = isDefault ? dsData?.title ?? 'Услуга' : getPackageShortTitle(pkgData!)
  const price = isDefault
    ? dsData?.price_note || 'Цена рассчитывается индивидуально'
    : formatMoney(pkgData!.final_price, pkgData!.currency)
  // У дефолтной услуги картинки нет — пустая строка (PR #11), отсюда `||`.
  const imageUrl = isDefault ? dsData?.image_url || undefined : pkgData!.image_url
  const items = isDefault ? [] : pkgData!.package_items
  const carFallback = isDefault ? '' : pkgData!.car_title
  const carLine = selectedCar
    ? `${selectedCar.display_name}${selectedCar.license_plate ? ` (${selectedCar.license_plate})` : ''}`
    : carFallback

  const stepIdx = STEP_ORDER.indexOf(step)

  const onSubmit = async () => {
    if (!packageId || !selectedCar || !selectedBranch || !selectedSlot) return
    setServerError(null)
    // Слот мог «протухнуть» между выбором и отправкой (cutoff в пикере
    // фиксируется при монтировании) — не отправляем прошедшее время, иначе
    // бэк вернёт «Дата и время записи не могут быть в прошлом.» (400).
    if (new Date(selectedSlot).getTime() <= Date.now()) {
      setServerError('Выбранное время уже прошло. Пожалуйста, выберите слот заново.')
      setSelectedSlot(null)
      setStep('datetime')
      return
    }
    try {
      await createMut.mutateAsync({
        client_car_id: selectedCar.id,
        ...(isDefault
          ? { default_service_page_id: packageId }
          : { service_package_id: packageId }),
        preferred_datetime: slotToIso(selectedSlot),
        service_station_id: selectedBranch.id,
        client_comment: comment.trim() || undefined,
      })
      setDone(true)
    } catch (err) {
      const parsed = parseApiError(err, 'Не удалось создать запись.')
      const conflict = bookingConflict(parsed)
      if (conflict) {
        setServerError(conflict.message)
        if (conflict.kind !== 'unavailable') {
          setSelectedSlot(null)
          if (conflict.kind === 'day_closed') setSelectedDate(null)
          setStep('datetime')
          if (conflict.kind === 'slot_taken') void slotsQuery.refetch()
        }
        return
      }
      // Ошибка могла прийти только по полю (а `general` тогда — общее
      // «Ошибка валидации.»), поэтому сначала смотрим поле времени.
      setServerError(parsed.fields.preferred_datetime ?? parsed.general)
    }
  }

  // === Экран успеха ===
  if (done) {
    return (
      <section className="container-sct max-w-[720px] py-6 md:py-10">
        <ProgressBar current={STEP_ORDER.length} />
        <div className="py-10 text-center md:py-16">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-blue-50 text-brandBlue">
            <svg className="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="mt-6 text-3xl font-900 uppercase tracking-tight text-textPrimary md:text-4xl">
            Визит подтверждён!
          </h1>
          <p className="mx-auto mt-3 max-w-sm text-sm font-medium text-textSecondary">
            Мы ждём вас и ваш{' '}
            <span className="font-bold text-brandBlue">{selectedCar?.display_name ?? carFallback}</span> на
            выбранном филиале.
          </p>
          <div className="mx-auto mt-8 flex max-w-sm flex-col gap-3">
            <button
              type="button"
              onClick={() =>
                downloadIcs({
                  title: `SCT Service · ${shortTitle}`,
                  startIso: selectedSlot!,
                  durationMin: durationMin ?? 60,
                  location: selectedBranch ? `${selectedBranch.name}, ${selectedBranch.address}` : '',
                })
              }
              className="rounded-sct bg-brandBlue py-4 text-[12px] font-900 uppercase tracking-widest text-white shadow-soft-blue transition-all hover:bg-brandBlueDark"
            >
              Добавить в календарь
            </button>
            <Link
              to="/service-book"
              className="rounded-sct border border-borderLight bg-white py-4 text-center text-[12px] font-900 uppercase tracking-widest text-textPrimary transition-all hover:border-brandBlue hover:text-brandBlue"
            >
              На главную
            </Link>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="container-sct max-w-[720px] py-6 md:py-8">
      {/* Сводка-бар */}
      <div className="overflow-hidden rounded-sct-lg bg-navy p-4 text-white md:p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-white/10">
              <SafeImage
                src={imageUrl || undefined}
                alt={shortTitle}
                className="h-full w-full object-cover"
                fallback={<div className="flex h-full w-full items-center justify-center text-white/40">🛠️</div>}
              />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-900">{shortTitle}</p>
              <p className="truncate text-[10px] font-bold uppercase tracking-widest text-white/50">
                {carLine}
              </p>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[9px] font-900 uppercase tracking-widest text-white/50">К оплате</p>
            <p className="text-lg font-900 tracking-tighter text-brandYellow">{price}</p>
          </div>
        </div>
      </div>

      <ProgressBar current={stepIdx} onJump={(i) => i < stepIdx && setStep(STEP_ORDER[i])} />

      <div className="mt-6">
        {step === 'branch' && (
          <BranchStep
            selectedId={selectedBranch?.id ?? null}
            onSelect={(s) => {
              setSelectedBranch(s)
              setStep('datetime')
            }}
          />
        )}
        {step === 'datetime' && selectedBranch && (
          <DateTimeStep
            branchId={selectedBranch.id}
            selectedDate={selectedDate}
            selectedSlot={selectedSlot}
            service={slotsService}
            onChange={(d, slot) => {
              setSelectedDate(d)
              setSelectedSlot(slot)
              if (slot) setServerError(null)
            }}
          />
        )}
        {step === 'confirm' && selectedBranch && selectedSlot && (
          <ConfirmStep
            items={items}
            branch={selectedBranch}
            slotIso={selectedSlot}
            durationMin={durationMin}
            comment={comment}
            onCommentChange={setComment}
            note={isDefault ? price : undefined}
            queueAck={queueAck}
            onQueueAckChange={setQueueAck}
          />
        )}
      </div>

      {serverError && (
        <div className="mt-4 rounded-sct border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
          {serverError}
        </div>
      )}

      {/* Основное действие шага */}
      <div className="mt-6">
        {step === 'datetime' && (
          <button
            type="button"
            disabled={!selectedDate || !selectedSlot}
            onClick={() => setStep('confirm')}
            className="w-full rounded-sct bg-brandBlue py-4 text-[12px] font-900 uppercase tracking-widest text-white shadow-soft-blue transition-all hover:bg-brandBlueDark disabled:cursor-not-allowed disabled:opacity-50"
          >
            Далее
          </button>
        )}
        {step === 'confirm' && (
          <button
            type="button"
            onClick={onSubmit}
            disabled={createMut.isPending || !queueAck}
            className="w-full rounded-sct bg-brandBlue py-4 text-[12px] font-900 uppercase tracking-widest text-white shadow-soft-blue transition-all hover:bg-brandBlueDark disabled:opacity-60"
          >
            {createMut.isPending ? 'Создаём запись…' : 'Подтвердить запись'}
          </button>
        )}
      </div>
    </section>
  )
}

function ProgressBar({ current, onJump }: { current: number; onJump?: (i: number) => void }) {
  return (
    <div className="mt-5 flex gap-2">
      {STEP_ORDER.map((_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onJump?.(i)}
          className={cn(
            'h-1.5 flex-1 rounded-full transition-colors',
            i <= current ? 'bg-brandBlue' : 'bg-surfaceMuted',
            onJump && i < current ? 'cursor-pointer' : 'cursor-default',
          )}
          aria-hidden
        />
      ))}
    </div>
  )
}

function ConfirmStep({
  items,
  branch,
  slotIso,
  durationMin,
  comment,
  onCommentChange,
  note,
  queueAck,
  onQueueAckChange,
}: {
  items: ClientPackageItem[]
  branch: ServiceStation
  slotIso: string
  durationMin: number | null
  comment: string
  onCommentChange: (v: string) => void
  note?: string
  queueAck: boolean
  onQueueAckChange: (v: boolean) => void
}) {
  const endIso = durationMin
    ? new Date(new Date(slotIso).getTime() + durationMin * 60_000).toISOString()
    : null
  return (
    <div>
      <h2 className="mb-5 text-xl font-900 uppercase tracking-tight text-textPrimary md:text-2xl">
        Проверьте детали записи
      </h2>

      {note && (
        <div className="mb-4 rounded-sct border border-brandYellow/40 bg-brandYellow/10 p-4 text-sm font-medium text-textPrimary">
          {note}. Точную стоимость менеджер рассчитает после уточнения автомобиля.
        </div>
      )}

      {items && items.length > 0 && (
        <Card className="overflow-hidden">
          <header className="border-b border-borderLight bg-surfaceLight px-5 py-3">
            <p className="text-[11px] font-900 uppercase tracking-widest text-textSecondary">
              Состав пакета услуг
            </p>
          </header>
          <ul className="divide-y divide-borderLight">
            {items.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-textPrimary">{item.item_name}</p>
                  <p className="mt-0.5 text-[10px] font-900 uppercase tracking-widest text-brandBlue">
                    {item.item_type === 'SERVICE' ? 'Работа' : 'Товар'}
                  </p>
                </div>
                <span className="whitespace-nowrap text-sm font-900 text-textPrimary">
                  {formatQty(item.quantity, item.item_type)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="mt-4 divide-y divide-borderLight p-0">
        <div className="flex items-center justify-between gap-3 px-5 py-4">
          <span className="text-[10px] font-900 uppercase tracking-widest text-textSecondary">
            Филиал
          </span>
          <span className="text-right text-sm font-bold text-textPrimary">
            {branch.name}, {branch.address}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3 px-5 py-4">
          <span className="text-[10px] font-900 uppercase tracking-widest text-textSecondary">
            Выбранное время
          </span>
          <span className="text-right text-sm font-900 text-brandBlue">
            {formatDateTimeRange(slotIso, endIso)}
          </span>
        </div>
        {durationMin ? (
          <div className="flex items-center justify-between gap-3 px-5 py-4">
            <span className="text-[10px] font-900 uppercase tracking-widest text-textSecondary">
              Длительность
            </span>
            <span className="text-right text-sm font-bold text-textPrimary">
              {formatDuration(durationMin)}
            </span>
          </div>
        ) : null}
      </Card>

      <textarea
        rows={3}
        value={comment}
        onChange={(e) => onCommentChange(e.target.value)}
        placeholder="Комментарий к вашему визиту (необязательно)…"
        className="mt-4 w-full rounded-sct border border-borderLight bg-surfaceLight px-4 py-3 text-sm font-medium text-textPrimary outline-none transition-all placeholder:text-textSecondary/60 focus:border-brandBlue focus:bg-white focus:ring-2 focus:ring-brandBlue/15"
      />

      <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-sct border border-borderLight bg-white p-4">
        <input
          type="checkbox"
          checked={queueAck}
          onChange={(e) => onQueueAckChange(e.target.checked)}
          className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-brandBlue"
        />
        <span className="text-sm font-medium text-textPrimary">
          Понимаю, что на сервисе возможна живая очередь и время начала может немного сдвинуться.
        </span>
      </label>
    </div>
  )
}

function formatQty(quantity: string | number | null | undefined, itemType: string): string {
  if (quantity === null || quantity === undefined) return ''
  const num = typeof quantity === 'string' ? Number(quantity) : quantity
  if (!Number.isFinite(num)) return String(quantity)
  const unit = itemType === 'SERVICE' ? 'усл.' : 'шт.'
  const formatted = num % 1 === 0 ? String(num) : String(num).replace(/0+$/, '').replace(/\.$/, '')
  return `${formatted} ${unit}`
}

function downloadIcs({
  title,
  startIso,
  durationMin,
  location,
}: {
  title: string
  startIso: string
  durationMin: number
  location: string
}) {
  const start = new Date(startIso)
  const end = new Date(start.getTime() + durationMin * 60_000)
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SCT Service//RU',
    'BEGIN:VEVENT',
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${title}`,
    `LOCATION:${location}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'sct-visit.ics'
  a.click()
  URL.revokeObjectURL(url)
}
