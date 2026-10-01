/**
 * Блок «МОЙ ГАРАЖ» — неактивные авто + кнопка «Добавить автомобиль».
 * Используется на главной и на странице «Авто». Сворачивается (chevron).
 *
 * Переделан по правкам заказчика (видео от 01.09):
 *   — вместо логотипов марок показываем ФОТО машин. Раньше снимок брали через
 *     getCarPhoto из /garage/cars/, а там его нет вовсе, и функция падала на
 *     фолбэк mark.logo_url — отсюда и кружки BMW с VW. Настоящие фото лежат в
 *     service-book/page-data → cars[].image_url, оттуда и берём. Запрос уже в
 *     кэше обоих экранов, где живёт этот блок, лишней сети нет;
 *   — госномер в чёрной рамке, как в верхней плашке, и год выпуска рядом;
 *   — по клику на карточку открывается редактирование авто;
 *   — «Добавить автомобиль» — такая же кнопка, как «Сделать активным»
 *     (синий фон, белый текст, тонкая), только с плюсиком вместо галочки:
 *     «абсолютно одинаковая кнопка, только у одной галочка, у другой плюсик».
 */
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useSetDefaultCarMutation } from '@/features/garage/queries'
import { useServiceBookQuery } from '@/features/service-book/queries'
import { PlateBadge } from '@/features/service-book/CarHeroCompact'
import { useCarYear } from '@/features/garage/carYear'
import { Card } from '@/shared/ui/Card'
import { SafeImage } from '@/shared/ui/SafeImage'
import { Skeleton } from '@/shared/ui/Skeleton'
import { cn } from '@/shared/lib/cn'
import type { ServiceBookCar } from '@/features/service-book/types'
import { pickCarTitle } from '@/features/garage/lib'

export function MyGarageColumn() {
  const { data, isLoading } = useServiceBookQuery({})
  const setDefault = useSetDefaultCarMutation()
  const [open, setOpen] = useState(true)

  // В блоке — только неактивные авто (активное показано выше отдельным блоком).
  const others = (data?.cars ?? []).filter((c) => !c.is_default)

  return (
    <Card className="p-5 md:p-6">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between"
        aria-expanded={open}
      >
        <h3 className="text-[12px] font-900 uppercase tracking-widest text-textSecondary">
          Мой гараж
        </h3>
        <svg
          className={cn(
            'h-4 w-4 text-textSecondary transition-transform',
            open ? '' : '-rotate-180',
          )}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
        </svg>
      </button>

      {open && (
        <div className="mt-5 space-y-3">
          {isLoading ? (
            <>
              <Skeleton.Row />
              <Skeleton.Row />
            </>
          ) : (
            <>
              {others.map((car) => (
                <CarRow
                  key={car.id}
                  car={car}
                  onSetDefault={() => setDefault.mutate(car.id)}
                  isPending={setDefault.isPending && setDefault.variables === car.id}
                />
              ))}

              <Link to="/garage/add" className={garageButtonClass}>
                <IconPlus />
                Добавить автомобиль
              </Link>
            </>
          )}
        </div>
      )}
    </Card>
  )
}

function CarRow({
  car,
  onSetDefault,
  isPending,
}: {
  car: ServiceBookCar
  onSetDefault: () => void
  isPending: boolean
}) {
  const navigate = useNavigate()
  const year = useCarYear(car.id)
  const title = pickCarTitle(car)

  return (
    <div className="rounded-sct border border-borderLight bg-white p-3">
      {/* Клик по карточке — редактирование авто (правка заказчика: «не на
          карандашик, а по клику на авто»). */}
      <button
        type="button"
        onClick={() => navigate(`/garage/edit/${car.id}`)}
        className="flex w-full items-center gap-3 text-left"
      >
        <div className="h-12 w-16 shrink-0 overflow-hidden rounded-lg border border-borderLight bg-surfaceLight">
          <SafeImage
            src={car.image_url ?? undefined}
            alt={title}
            className="h-full w-full object-cover"
            fallback={
              <div className="flex h-full w-full items-center justify-center text-[10px] font-900 uppercase text-borderLight">
                авто
              </div>
            }
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-900 uppercase tracking-tight text-textPrimary">
            {title}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {car.license_plate && <PlateBadge>{car.license_plate}</PlateBadge>}
            {year && <PlateBadge>{String(year)}</PlateBadge>}
          </div>
        </div>
      </button>

      <button
        type="button"
        onClick={onSetDefault}
        disabled={isPending}
        className={cn('mt-3', garageButtonClass, isPending && 'opacity-60')}
      >
        <IconCheck />
        {isPending ? 'Сохраняем…' : 'Сделать активным'}
      </button>
    </div>
  )
}

/**
 * Единый вид кнопок блока «Мой гараж»: синий фон, белая надпись, иконка слева.
 * «Сделать активным» и «Добавить автомобиль» отличаются только иконкой и
 * подписью — заказчик просил, чтобы они были «абсолютно одинаковые». Класс, а
 * не компонент: одна кнопка — <button>, вторая — <Link>, а вложить кнопку в
 * ссылку нельзя.
 */
const garageButtonClass =
  'flex w-full items-center justify-center gap-1.5 rounded-sct bg-brandBlue px-3 py-2 text-[10px] font-900 uppercase tracking-widest text-white transition-colors hover:bg-brandBlueDark'

function IconCheck() {
  return (
    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
    </svg>
  )
}

function IconPlus() {
  return (
    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 5v14m7-7H5" />
    </svg>
  )
}
