/**
 * Плашка активного авто на странице «Авто» (сервисная книжка).
 *
 * Переделана по правке заказчика (видео от 01.09): раньше это была высокая
 * карточка с большим квадратным фото, крупным заголовком и карандашиком
 * редактирования в углу. Просьба дословно — «верхний блок должен быть точно
 * такой же, как в услугах: тоненький, маленький, аккуратненький, фотография
 * машины, активное авто, госномер». Поэтому повторяем геометрию
 * features/packages/ActiveCarStrip.
 *
 * Справа — госномер в чёрной рамке, под ним год выпуска в такой же рамке
 * (тоже правка: год, который человек вводит в редактировании авто, должен
 * выводиться рядом с госномером).
 *
 * Вся карточка кликается и ведёт в редактирование — заказчик просил
 * «редактирование по клику на авто, а не на карандашик». Карандаш убран.
 */
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { ServiceBookCar } from './types'
import { Card } from '@/shared/ui/Card'
import { SafeImage } from '@/shared/ui/SafeImage'
import { useCarYear } from '@/features/garage/carYear'
import { pickCarTitle } from '@/features/garage/lib'

interface CarHeroCompactProps {
  car: ServiceBookCar
}

export function CarHeroCompact({ car }: CarHeroCompactProps) {
  // Год — через общий хук: page-data отдаёт production_year пустым, поэтому
  // введённое человеком значение берётся из гаража (см. useCarYear).
  const year = useCarYear(car.id)
  // Полное название модификации — как в плашке на «Услугах», которую заказчик
  // и просил повторить («BMW X7 I (G07) Рестайлинг Внедорожник…»). Год в
  // заголовок не дублируем: он рядом, в отдельной рамке.
  const title = pickCarTitle(car)

  return (
    <Link to={`/garage/edit/${car.id}`} className="block">
      <Card className="flex items-center gap-4 p-4 transition-all hover:border-brandBlue/50 hover:shadow-soft-card md:gap-5 md:p-5">
        <div className="h-14 w-20 shrink-0 overflow-hidden rounded-sct border border-borderLight bg-surfaceLight">
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
          <p className="text-[10px] font-900 uppercase tracking-widest text-brandBlue">
            ● Активное авто
          </p>
          <h2 className="mt-1 line-clamp-2 text-base font-900 uppercase leading-tight tracking-tight text-textPrimary md:text-lg">
            {title}
          </h2>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1">
          {car.license_plate && <PlateBadge>{car.license_plate}</PlateBadge>}
          {year && <PlateBadge>{String(year)}</PlateBadge>}
        </div>
      </Card>
    </Link>
  )
}

/** Чёрная рамка под госномер и год — одна на оба, чтобы совпадали пиксель в пиксель. */
export function PlateBadge({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-md bg-textPrimary px-3 py-1 font-mono text-[12px] font-900 uppercase tracking-widest text-white">
      {children}
    </span>
  )
}
