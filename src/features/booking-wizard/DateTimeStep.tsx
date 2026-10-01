/**
 * Шаг «Дата и время».
 *
 * Сверху — горизонтальная лента дней из расписания выбранного филиала
 * (на 14 дней вперёд). Выходные/закрытые — disabled. Активный день
 * подсвечен синим.
 *
 * Под ней — слоты с разделением «Утро / День / Вечер» (как в HTML-мокапе
 * booking_workflow_v1).
 *
 * Откуда время:
 *  - передан `service` (бэк с PR #11) — GET available-slots на выбранную
 *    дату, показываем только то, что вернул бэк: занятое и прошедшее он уже
 *    отсёк, длительность услуги учёл;
 *  - нет `service` — старая нарезка часов работы по 30 минут, для сегодня
 *    прошедшие слоты заблокированы. Уберём после деплоя PR #11.
 */
import { useEffect, useMemo } from 'react'
import { useServiceStationQuery } from '@/features/service-stations/queries'
import { Spinner } from '@/shared/ui/Spinner'
import { Card } from '@/shared/ui/Card'
import { cn } from '@/shared/lib/cn'
import { formatDuration } from '@/shared/lib/format'
import {
  buildTimeSlots,
  dayShortLabel,
  groupSlotsByPeriod,
  slotsFromApi,
  type TimeSlot,
} from './lib'
import { useAvailableSlotsQuery } from './queries'
import type { AvailableSlotsParams, SlotsService } from './api'
import type { StationScheduleDay } from '@/features/service-stations/types'

interface DateTimeStepProps {
  branchId: number
  selectedDate: string | null
  selectedSlot: string | null
  onChange: (date: string | null, slot: string | null) => void
  /** Услуга для available-slots. Не передана — старая нарезка часов работы. */
  service?: SlotsService | null
}

export function DateTimeStep({
  branchId,
  selectedDate,
  selectedSlot,
  onChange,
  service,
}: DateTimeStepProps) {
  const { data, isLoading, isError } = useServiceStationQuery(branchId, 14)

  // Минимальное допустимое время для is_today — сейчас + 30 минут.
  const firstAllowed = useMemo(() => new Date(Date.now() + 30 * 60_000), [])

  const slotsParams: AvailableSlotsParams | null =
    service && selectedDate ? { ...service, service_station_id: branchId, date: selectedDate } : null
  const slotsQuery = useAvailableSlotsQuery(slotsParams)
  const apiData = slotsQuery.data

  // Выбранное время пропало из свежего ответа (его заняли, пока человек
  // думал, или после отказа create_booking) — снимаем выбор, чтобы «Далее»
  // не пропустил дальше с несуществующим слотом.
  useEffect(() => {
    if (!service || !selectedSlot || !apiData) return
    if (!apiData.slots.some((s) => s.datetime === selectedSlot)) onChange(selectedDate, null)
  }, [service, selectedSlot, selectedDate, apiData, onChange])

  if (isLoading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <Spinner />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <p className="rounded-sct border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
        Не удалось загрузить расписание филиала.
      </p>
    )
  }

  const selectedDay = data.schedule.find((d) => d.date === selectedDate) ?? null
  // Страховка на первый деплой PR #11: ручка слотов упала или ответила не той
  // формой — не блокируем запись, а режем часы работы, как раньше. Время всё
  // равно перепроверит create_booking (и ответит BOOKING_SLOT_UNAVAILABLE).
  const slotsFallback = Boolean(service) && !apiData && slotsQuery.isError
  const slots: TimeSlot[] = !selectedDay
    ? []
    : service && !slotsFallback
    ? apiData
      ? slotsFromApi(apiData)
      : []
    : buildTimeSlots(selectedDay, selectedDay.is_today ? firstAllowed : undefined)
  const { morning, day, evening } = groupSlotsByPeriod(slots)
  const duration = formatDuration(apiData?.duration_minutes)

  return (
    <div className="space-y-7">
      <div>
        <h2 className="text-xl font-900 uppercase tracking-tight text-textPrimary md:text-2xl">
          Выберите дату и время
        </h2>
        <p className="mt-1 text-sm font-medium text-textSecondary">
          В <span className="font-bold text-textPrimary">{data.name}</span>.
          {service && !slotsFallback
            ? <> Показываем только свободное время{duration && <> · услуга занимает {duration}</>}.</>
            : ' Слоты по 30 минут.'}
        </p>
      </div>

      {/* Дни */}
      <div>
        <h3 className="mb-3 text-[11px] font-900 uppercase tracking-widest text-textSecondary">
          Дата визита
        </h3>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {data.schedule.map((d) => (
            <DayChip
              key={d.date}
              day={d}
              isSelected={d.date === selectedDate}
              onSelect={() => onChange(d.date, null)}
            />
          ))}
        </div>
      </div>

      {/* Слоты */}
      {selectedDay ? (
        <div className="space-y-5">
          {/* isPending, а не isLoading: запрос в паузе (нет сети, вкладка не в
              фокусе ждёт повтора) — это «ещё не знаем», а не «времени нет». */}
          {service && !slotsFallback && slotsQuery.isPending ? (
            <div className="flex min-h-[120px] items-center justify-center">
              <Spinner />
            </div>
          ) : slots.length === 0 ? (
            <Card className="p-4 text-center">
              <p className="text-sm font-bold text-textSecondary">
                {selectedDay.is_closed
                  ? 'В этот день филиал закрыт.'
                  : service
                  ? 'На выбранную дату свободного времени нет. Попробуйте другую дату.'
                  : 'На этот день нет доступных слотов.'}
              </p>
            </Card>
          ) : (
            <>
              {slotsFallback && (
                <p className="text-xs font-medium text-textSecondary">
                  Не удалось проверить занятость — показываем часы работы филиала.
                  Свободно ли время, проверим при подтверждении.
                </p>
              )}
              <SlotGroup
                title="Утро"
                hint="до 12:00"
                slots={morning}
                selected={selectedSlot}
                onSelect={(slot) => onChange(selectedDate, slot)}
              />
              <SlotGroup
                title="День"
                hint="12:00 – 18:00"
                slots={day}
                selected={selectedSlot}
                onSelect={(slot) => onChange(selectedDate, slot)}
              />
              <SlotGroup
                title="Вечер"
                hint="после 18:00"
                slots={evening}
                selected={selectedSlot}
                onSelect={(slot) => onChange(selectedDate, slot)}
              />
            </>
          )}
        </div>
      ) : (
        <p className="text-sm font-medium text-textSecondary">
          Выберите день — мы покажем доступные слоты.
        </p>
      )}
    </div>
  )
}

function DayChip({
  day,
  isSelected,
  onSelect,
}: {
  day: StationScheduleDay
  isSelected: boolean
  onSelect: () => void
}) {
  const { weekday, date } = dayShortLabel(day)
  const disabled = day.is_closed || !day.available
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className={cn(
        'flex min-w-[88px] shrink-0 flex-col items-center rounded-sct border px-3 py-3 text-center transition-all',
        disabled
          ? 'cursor-not-allowed border-borderLight bg-surfaceLight/40 opacity-40'
          : isSelected
          ? 'border-brandBlue bg-brandBlue text-white shadow-soft-blue'
          : 'border-borderLight bg-white hover:border-brandBlue/40',
      )}
    >
      <span
        className={cn(
          'text-[10px] font-900 uppercase tracking-widest',
          isSelected ? 'text-white/80' : 'text-textSecondary',
        )}
      >
        {weekday}
      </span>
      <span
        className={cn(
          'mt-1 text-lg font-900 leading-none tracking-tighter',
          isSelected ? 'text-white' : 'text-textPrimary',
        )}
      >
        {date}
      </span>
      {disabled && (
        <span className="mt-1 text-[9px] font-bold uppercase tracking-widest text-textSecondary">
          Выходной
        </span>
      )}
    </button>
  )
}

function SlotGroup({
  title,
  hint,
  slots,
  selected,
  onSelect,
}: {
  title: string
  hint: string
  slots: TimeSlot[]
  selected: string | null
  onSelect: (slot: string) => void
}) {
  if (slots.length === 0) return null
  return (
    <div>
      <p className="mb-2 text-[10px] font-900 uppercase tracking-widest text-textSecondary">
        {title} <span className="text-textSecondary/50">· {hint}</span>
      </p>
      <div className="grid grid-cols-3 gap-2 md:grid-cols-4 md:gap-3 lg:grid-cols-6">
        {slots.map((slot) => {
          const isSelected = selected === slot.value
          return (
            <button
              key={slot.value}
              type="button"
              disabled={slot.inPast}
              onClick={() => onSelect(slot.value)}
              className={cn(
                'rounded-sct border px-3 py-3 text-sm font-900 tracking-tighter transition-all',
                slot.inPast
                  ? 'cursor-not-allowed border-borderLight bg-surfaceLight/40 text-textSecondary/30 line-through'
                  : isSelected
                  ? 'border-brandBlue bg-brandBlue text-white shadow-soft-blue'
                  : 'border-borderLight bg-white text-textPrimary hover:border-brandBlue/40',
              )}
            >
              {slot.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
