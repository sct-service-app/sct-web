/**
 * Узкая плашка активного авто над списком услуг.
 *
 * Слева — маленькое фото авто (или заглушка), посередине — текст
 * «УСЛУГИ ДЛЯ ...», справа — госномер.
 *
 * Фото: в `/packages/page/` его нет — ClientActiveCar отдаёт только id,
 * display_name, license_plate, car_title. Поэтому берём картинку из
 * `service-book/page-data/` (selected_car.image_url) и показываем её только
 * если это тот же автомобиль (сверяем id). Запрос уже в кэше — им же живёт
 * блок «Активное авто» на главной.
 */
import { useServiceBookQuery } from '@/features/service-book/queries'
import { Card } from '@/shared/ui/Card'
import { SafeImage } from '@/shared/ui/SafeImage'
import { useCarYear } from '@/features/garage/carYear'
import { PlateBadge } from '@/features/service-book/CarHeroCompact'
import type { ClientActiveCar } from '@/shared/api/types'
import { pickCarTitle } from '@/features/garage/lib'

interface ActiveCarStripProps {
  activeCar: ClientActiveCar
}

export function ActiveCarStrip({ activeCar }: ActiveCarStripProps) {
  const { data: book } = useServiceBookQuery({})
  const selected = book?.selected_car
  const photo = selected && selected.id === activeCar.id ? selected.image_url : null
  const year = useCarYear(activeCar.id)

  return (
    <Card className="flex flex-col items-start gap-4 p-4 md:flex-row md:items-center md:gap-5 md:p-5">
      <div className="h-14 w-20 shrink-0 overflow-hidden rounded-sct border border-borderLight bg-surfaceLight">
        <SafeImage
          src={photo ?? undefined}
          alt={activeCar.display_name}
          className="h-full w-full object-cover"
          fallback={
            <div className="flex h-full w-full items-center justify-center text-[10px] font-900 uppercase text-borderLight">
              авто
            </div>
          }
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-900 uppercase tracking-widest text-brandBlue">
          ● Активное авто
        </p>
        <h2 className="mt-1 text-base font-900 uppercase leading-tight tracking-tight text-textPrimary md:text-lg">
          Услуги для <span className="text-brandBlue">{pickCarTitle(activeCar)}</span>
        </h2>
      </div>
      {/* Госномер и год — те же рамки, что на «Авто» и в гараже. */}
      <div className="flex shrink-0 flex-col items-end gap-1">
        {activeCar.license_plate && <PlateBadge>{activeCar.license_plate}</PlateBadge>}
        {year && <PlateBadge>{String(year)}</PlateBadge>}
      </div>
    </Card>
  )
}
