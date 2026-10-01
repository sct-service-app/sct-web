/**
 * Модалка редактирования существующей записи.
 *
 * Что можно менять (бэк подтвердил PATCH-ом):
 *   - service_station_id  — филиал
 *   - preferred_datetime  — желаемые дата/время
 *   - comment             — комментарий клиента
 *
 * Что НЕ меняется через эту форму:
 *   - service_package_id  — для смены пакета нужно отменить + создать новую
 *   - client_car_id       — машину привязки тоже не трогаем
 *   - status              — выставляется бэком автоматически после
 *                           подтверждения мастером
 *
 * Пере-использует те же компоненты wizard'а: BranchStep + DateTimeStep.
 * Это даёт идентичный UX с созданием записи.
 *
 * С бэк PR #11 (флаг `useSlotsApiEnabled`) перенос времени и смену филиала
 * отключаем: клиентский PATCH пока не перераспределяет бокс, и запись можно
 * перенести на время, где все боксы заняты. Остаётся только комментарий.
 * Вернуть вкладки, когда бэк научит PATCH проверять занятость.
 */
import { useEffect, useState } from 'react'
import { Modal } from '@/shared/ui/Modal'
import { Button } from '@/shared/ui/Button'
import { Textarea } from '@/shared/ui/Textarea'
import { BranchStep } from '@/features/booking-wizard/BranchStep'
import { DateTimeStep } from '@/features/booking-wizard/DateTimeStep'
import { localIsoToUtcIso } from '@/features/booking-wizard/lib'
import { useSlotsApiEnabled } from '@/features/booking-wizard/queries'
import { useUpdateBookingMutation } from './queries'
import { parseApiError } from '@/features/auth/errors'
import { toast } from '@/shared/ui/Toast'
import { cn } from '@/shared/lib/cn'
import type { Booking } from './types'
import type { ServiceStation } from '@/features/service-stations/types'

type EditTab = 'branch' | 'datetime' | 'comment'

interface EditBookingModalProps {
  open: boolean
  onClose: () => void
  booking: Booking
}

export function EditBookingModal({ open, onClose, booking }: EditBookingModalProps) {
  const canReschedule = useSlotsApiEnabled() === false
  const [tab, setTab] = useState<EditTab>(canReschedule ? 'datetime' : 'comment')
  const [branch, setBranch] = useState<ServiceStation | null>(null)
  const [date, setDate] = useState<string | null>(null)
  const [slot, setSlot] = useState<string | null>(null) // localIso
  const [comment, setComment] = useState(booking.comment || '')
  const [serverError, setServerError] = useState<string | null>(null)

  const update = useUpdateBookingMutation(booking.id)

  // Сбрасываем форму при каждом открытии — чтобы поля показывали свежие
  // данные booking'а, а не последний черновик из предыдущего открытия.
  useEffect(() => {
    if (!open) return
    setTab(canReschedule ? 'datetime' : 'comment')
    setBranch(null)
    setDate(null)
    setSlot(null)
    setComment(booking.comment || '')
    setServerError(null)
  }, [open, booking.id, booking.comment, canReschedule])

  const hasChanges = Boolean(branch) || Boolean(slot) || comment !== (booking.comment || '')

  const onSubmit = async () => {
    setServerError(null)
    const payload: Parameters<typeof update.mutateAsync>[0] = {}
    if (branch) payload.service_station_id = branch.id
    if (slot) payload.preferred_datetime = localIsoToUtcIso(slot)
    if (comment !== (booking.comment || '')) payload.comment = comment.trim()

    if (Object.keys(payload).length === 0) {
      setServerError('Нет изменений для сохранения.')
      return
    }

    try {
      await update.mutateAsync(payload)
      toast.success('Изменения сохранены')
      onClose()
    } catch (err) {
      const parsed = parseApiError(err, 'Не удалось сохранить изменения.')
      setServerError(parsed.general)
    }
  }

  const currentDateLabel = (() => {
    const dt =
      booking.final_datetime ?? booking.scheduled_datetime ?? booking.preferred_datetime
    if (!dt) return '—'
    return new Date(dt).toLocaleString('ru-RU', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  })()

  const currentStation = booking.service_station_data?.name || '—'

  return (
    <Modal open={open} onClose={onClose} title="Изменить запись" size="lg">
      <p className="-mt-2 mb-5 text-sm text-textSecondary">
        {canReschedule
          ? 'Можете изменить филиал, дату/время или добавить комментарий. Поля, которые не трогаете, останутся как есть.'
          : 'Можно изменить комментарий к визиту. Чтобы перенести время или сменить филиал, отмените запись и создайте новую — так мы подберём свободный бокс.'}
      </p>

      {/* Текущая запись (read-only summary) */}
      <div className="mb-5 grid grid-cols-1 gap-2 rounded-sct border border-borderLight bg-surfaceLight/50 p-4 md:grid-cols-3">
        <SummaryField label="Текущая дата" value={currentDateLabel} />
        <SummaryField label="Текущий филиал" value={currentStation} />
        <SummaryField
          label="Услуга"
          value={
            booking.service_data?.title ||
            booking.service_package_data?.title ||
            booking.default_service_page_data?.title ||
            '—'
          }
          compact
        />
      </div>

      {/* Вкладки редактирования. На мобиле — горизонтальный скролл с
          небольшими паддингами, чтобы 3 длинных лейбла не пере-обернулись. */}
      <div className="mb-5 flex gap-3 overflow-x-auto border-b border-borderLight pb-3 md:gap-5">
        {canReschedule && (
          <>
            <TabButton current={tab} value="datetime" onClick={setTab}>
              Дата и время
            </TabButton>
            <TabButton current={tab} value="branch" onClick={setTab}>
              Филиал
            </TabButton>
          </>
        )}
        <TabButton current={tab} value="comment" onClick={setTab}>
          Комментарий
        </TabButton>
      </div>

      {/* Содержимое вкладки */}
      <div className="min-h-[300px]">
        {tab === 'branch' && (
          <BranchStep
            selectedId={branch?.id ?? null}
            onSelect={(s) => {
              setBranch(s)
              // При смене филиала сбрасываем выбранный слот — расписание другое.
              setDate(null)
              setSlot(null)
            }}
          />
        )}
        {tab === 'datetime' &&
          (branch ? (
            <DateTimeStep
              branchId={branch.id}
              selectedDate={date}
              selectedSlot={slot}
              onChange={(d, s) => {
                setDate(d)
                setSlot(s)
              }}
            />
          ) : (
            <NoBranchPicked onSwitchToBranch={() => setTab('branch')} />
          ))}
        {tab === 'comment' && (
          <Textarea
            label="Комментарий к визиту"
            rows={6}
            placeholder="Например: проверить шум подвески, подготовить расходники заранее."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        )}
      </div>

      {/* Сводка изменений */}
      {hasChanges && (
        <div className="mt-5 rounded-sct border border-blue-100 bg-blue-50/40 p-4 text-[12px] font-medium text-brandBlueDark">
          <p className="font-900 uppercase tracking-widest text-brandBlue text-[10px]">
            Будет изменено
          </p>
          <ul className="mt-2 list-disc space-y-0.5 pl-5">
            {branch && <li>Филиал → {branch.name}</li>}
            {slot && (
              <li>
                Дата → {new Date(slot).toLocaleString('ru-RU', {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </li>
            )}
            {comment !== (booking.comment || '') && <li>Комментарий обновлён</li>}
          </ul>
        </div>
      )}

      {serverError && (
        <div className="mt-4 rounded-sct border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
          {serverError}
        </div>
      )}

      <div className="mt-6 flex flex-col-reverse gap-3 md:flex-row md:justify-end">
        <Button variant="ghost" onClick={onClose} disabled={update.isPending}>
          Отмена
        </Button>
        <Button
          onClick={onSubmit}
          loading={update.isPending}
          disabled={!hasChanges}
        >
          Сохранить изменения
        </Button>
      </div>
    </Modal>
  )
}

function TabButton({
  current,
  value,
  onClick,
  children,
}: {
  current: EditTab
  value: EditTab
  onClick: (v: EditTab) => void
  children: React.ReactNode
}) {
  const isActive = current === value
  return (
    <button
      type="button"
      onClick={() => onClick(value)}
      className={cn(
        'relative shrink-0 whitespace-nowrap pb-2 text-[12px] font-900 uppercase tracking-widest transition-colors',
        isActive
          ? 'text-brandBlue after:absolute after:-bottom-3 after:left-0 after:h-[3px] after:w-full after:rounded-full after:bg-brandBlue'
          : 'text-textSecondary hover:text-brandBlue',
      )}
    >
      {children}
    </button>
  )
}

function SummaryField({
  label,
  value,
  compact,
}: {
  label: string
  value: string
  compact?: boolean
}) {
  return (
    <div className={compact ? 'truncate' : ''}>
      <p className="text-[9px] font-900 uppercase tracking-widest text-textSecondary">
        {label}
      </p>
      <p className="mt-0.5 truncate text-sm font-bold text-textPrimary">{value}</p>
    </div>
  )
}

function NoBranchPicked({ onSwitchToBranch }: { onSwitchToBranch: () => void }) {
  return (
    <div className="rounded-sct border border-dashed border-borderLight bg-surfaceLight/40 p-8 text-center">
      <p className="text-sm font-bold text-textSecondary">
        Сначала выберите филиал во вкладке «Филиал»
      </p>
      <p className="mt-2 text-xs text-textSecondary/70">
        После этого станут доступны даты и слоты — каждое расписание зависит
        от часов работы конкретного филиала.
      </p>
      <Button variant="secondary" size="sm" className="mt-4" onClick={onSwitchToBranch}>
        К выбору филиала
      </Button>
    </div>
  )
}
